/**
 * Final Verification Test
 * Uses the ACTUAL items from Request 24
 * Verifies that inventory updates work correctly and persist to database
 */

import jwt from 'jsonwebtoken';
import sql from 'mssql';

const JWT_SECRET = 'supersecret_jwt_key_change_me';
const BASE_URL = 'http://localhost:5000';

function generateToken(userRole = 'admin', ascId = 4) {
  const payload = {
    id: 1,
    username: userRole === 'service_center' ? 'test_asc_user' : 'test_admin',
    role: userRole,
    centerId: ascId,
    service_center_id: ascId
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

const dbConfig = {
  server: 'localhost',
  user: 'crm_user',
  password: 'StrongPassword123!',
  database: 'ServiceCrm',
  options: {
    instanceName: 'SQLEXPRESS',
    encrypt: false,
    trustServerCertificate: true,
    enableKeepAlive: true,
  }
};

async function getInventoryFromDB(spareId, plantId, ascId) {
  const pool = new sql.ConnectionPool(dbConfig);
  await pool.connect();

  const plantRes = await pool.request().query(
    `SELECT qty_good FROM spare_inventory WHERE spare_id = ${spareId} AND location_type = 'branch' AND location_id = ${plantId}`
  );
  
  const ascRes = await pool.request().query(
    `SELECT qty_good FROM spare_inventory WHERE spare_id = ${spareId} AND location_type = 'service_center' AND location_id = ${ascId}`
  );

  await pool.close();

  return {
    plant: plantRes.recordset[0]?.qty_good || 0,
    asc: ascRes.recordset[0]?.qty_good || 0
  };
}

async function runFinalTest() {
  console.log('\n✅ === FINAL INVENTORY UPDATE VERIFICATION ===\n');

  const requestId = 24;  // Request 24 has Spare 0
  const ascId = 4;
  const plantId = 1;
  const spareId = 0;    // Only spare in request 24
  const transferQty = 2; // Approved quantity

  console.log('📋 Test Configuration:');
  console.log(`  Request ID: ${requestId}`);
  console.log(`  ASC: ${ascId} → Plant: ${plantId}`);
  console.log(`  Transfer: Spare ${spareId}, Qty: ${transferQty}\n`);

  // Find DN document
  console.log('🔍 Step 1: Finding logistics document for Request ${requestId}...');
  let dnNumber = null;
  try {
    const pool = new sql.ConnectionPool(dbConfig);
    await pool.connect();

    const docResult = await pool.request().query(
      `SELECT document_number FROM logistics_documents 
       WHERE document_type = 'DN' AND reference_id = ${requestId} AND reference_type = 'SPARE_REQUEST'`
    );

    if (docResult.recordset.length === 0) {
      console.log('❌ No DN document found for this request\n');
      await pool.close();
      return;
    }

    dnNumber = docResult.recordset[0].document_number;
    console.log(`✅ Found DN: ${dnNumber}\n`);
    await pool.close();
  } catch (error) {
    console.log(`❌ Error: ${error.message}\n`);
    return;
  }

  // Get BEFORE inventory
  console.log('📊 Step 2: Getting BEFORE inventory from database...');
  const beforeInv = await getInventoryFromDB(spareId, plantId, ascId);
  
  console.log(`  Plant ${plantId} - Spare ${spareId}: ${beforeInv.plant} units`);
  console.log(`  ASC ${ascId} - Spare ${spareId}: ${beforeInv.asc} units\n`);

  // Send receive-delivery
  console.log('📤 Step 3: Sending receive-delivery request...');
  const token = generateToken('service_center', ascId);
  
  let apiResponse = null;
  try {
    const response = await fetch(`\${BASE_URL}/api/logistics/receive-delivery\`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Bearer \${token}\`
      },
      body: JSON.stringify({
        requestId: requestId,
        documentType: 'DN',
        documentNumber: dnNumber,
        items: [{
          spare_id: spareId,
          qty: transferQty,
          carton_number: \`CTN-FINAL-\${Date.now()}\`,
          condition: 'good'
        }]
      })
    });

    const data = await response.json();
    apiResponse = data;
    
    if (response.status === 201 && data.ok) {
      console.log('✅ API returned 201 Created\n');
      
      if (data.data?.inventory?.source?.[0]) {
        const source = data.data.inventory.source[0];
        const dest = data.data.inventory.destination[0];
        console.log('📦 API Response - Inventory Changes:');
        console.log(`  Plant: ${source.oldQty} → ${source.newQty} (change: ${source.change})`);
        console.log(\`  ASC: \${dest.oldQty} → \${dest.newQty} (change: \${dest.change})\n\`);
      }
    } else {
      console.log(\`❌ API Error: \${response.status} - \${data.error}\n\`);
      return;
    }
  } catch (error) {
    console.log(\`❌ Connection error: \${error.message}\n\`);
    return;
  }

  // Wait for database
  console.log('⏳ Step 4: Waiting 2 seconds for database to settle...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Get AFTER inventory
  console.log('\n📊 Step 5: Getting AFTER inventory from database...');
  const afterInv = await getInventoryFromDB(spareId, plantId, ascId);
  
  console.log(\`  Plant \${plantId} - Spare \${spareId}: \${afterInv.plant} units\`);
  console.log(\`  ASC \${ascId} - Spare \${spareId}: \${afterInv.asc} units\n\`);

  // Verify
  console.log('✔️ Step 6: FINAL VERIFICATION RESULTS\n');
  
  const expectedPlantQty = beforeInv.plant - transferQty;
  const expectedAscQty = beforeInv.asc + transferQty;
  
  const plantCorrect = afterInv.plant === expectedPlantQty;
  const ascCorrect = afterInv.asc === expectedAscQty;

  console.log('📋 Expected vs Actual:');
  console.log(\`  Plant: Expected \${expectedPlantQty}, Got \${afterInv.plant} \${plantCorrect ? '✅ CORRECT' : '❌ WRONG'}\`);
  console.log(\`  ASC: Expected \${expectedAscQty}, Got \${afterInv.asc} \${ascCorrect ? '✅ CORRECT' : '❌ WRONG'}\n\`);

  if (plantCorrect && ascCorrect) {
    console.log('🎉 ✅ SUCCESS! Inventory updates are WORKING and PERSISTENT!\n');
    console.log('Summary:');
    console.log(\`  ✅ Plant inventory decreased by \${beforeInv.plant - afterInv.plant} units\`);
    console.log(\`  ✅ ASC inventory increased by \${afterInv.asc - beforeInv.asc} units\`);
    console.log('  ✅ Changes persisted to database\n');
  } else {
    console.log('❌ FAILURE! Inventory updates not working correctly!\n');
  }
}

runFinalTest();
