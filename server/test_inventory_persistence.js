/**
 * Verification Test: Confirm inventory updates persist to database
 * This test will:
 * 1. Get initial inventory values
 * 2. Send receive-delivery request
 * 3. Immediately check database to verify persistence
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

  const plantResult = await pool.request().query(
    `SELECT qty_good FROM spare_inventory WHERE spare_id = ${spareId} AND location_type = 'branch' AND location_id = ${plantId}`
  );
  
  const ascResult = await pool.request().query(
    `SELECT qty_good FROM spare_inventory WHERE spare_id = ${spareId} AND location_type = 'service_center' AND location_id = ${ascId}`
  );

  await pool.close();

  return {
    plant: plantResult.recordset[0]?.qty_good || null,
    asc: ascResult.recordset[0]?.qty_good || null
  };
}

async function runVerificationTest() {
  console.log('\n🔬 === INVENTORY PERSISTENCE VERIFICATION TEST ===\n');

  const requestId = 25;  // Use request 25 which has logistics docs already created
  const ascId = 4;
  const plantId = 1;
  const spareId = 3;
  const transferQty = 1;

  console.log('📋 Test Configuration:');
  console.log(`  Request ID: ${requestId}`);
  console.log(`  ASC: ${ascId}, Plant: ${plantId}`);
  console.log(`  Spare: ${spareId}, Transfer Qty: ${transferQty}\n`);

  // Step 1: Get DN document for this request
  console.log('STEP 1️⃣ : Finding logistics document...');
  
  let dnNumber = null;
  try {
    const pool = new sql.ConnectionPool(dbConfig);
    await pool.connect();

    const docResult = await pool.request().query(
      `SELECT document_number FROM logistics_documents 
       WHERE document_type = 'DN' AND reference_id = ${requestId} AND reference_type = 'SPARE_REQUEST' 
       ORDER BY created_at DESC`
    );

    if (docResult.recordset.length === 0) {
      console.log('❌ No DN document found for this request');
      await pool.close();
      return;
    }

    dnNumber = docResult.recordset[0].document_number;
    console.log(`✅ Found DN: ${dnNumber}\n`);
    await pool.close();
  } catch (error) {
    console.log(`❌ Error finding DN: ${error.message}`);
    return;
  }

  // Step 2: Get INITIAL inventory
  console.log('STEP 2️⃣ : Getting INITIAL inventory from database...');
  const initialInv = await getInventoryFromDB(spareId, plantId, ascId);
  
  console.log(`  Plant ${plantId}, Spare ${spareId}: ${initialInv.plant} units`);
  console.log(`  ASC ${ascId}, Spare ${spareId}: ${initialInv.asc} units\n`);

  // Step 3: Send receive-delivery
  console.log('STEP 3️⃣ : Sending receive-delivery request...\n');
  
  const token = generateToken('service_center', ascId);
  const payload = {
    requestId: requestId,
    documentType: 'DN',
    documentNumber: dnNumber,
    items: [{
      spare_id: spareId,
      qty: transferQty,
      carton_number: `CTN-VERIFY-${Date.now()}`,
      condition: 'good'
    }]
  };

  let apiInventory = null;
  try {
    const response = await fetch(`${BASE_URL}/api/logistics/receive-delivery`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    
    if (response.status === 201 && data.ok) {
      console.log('✅ API returned 201 Created\n');
      
      // Capture what API says the inventory should be
      if (data.data?.inventory?.source) {
        const sourceChange = data.data.inventory.source[0];
        apiInventory = {
          plant: sourceChange.newQty,
          asc: data.data.inventory.destination[0]?.newQty
        };
        
        console.log('API Response - Inventory Changes:');
        console.log(`  Plant (expected): ${sourceChange.oldQty} → ${sourceChange.newQty}`);
        console.log(`  ASC (expected): ${data.data.inventory.destination[0]?.oldQty} → ${data.data.inventory.destination[0]?.newQty}\n`);
      }
    } else {
      console.log(`❌ API Error: ${response.status} - ${data.error}`);
      return;
    }
  } catch (error) {
    console.log(`❌ Connection error: ${error.message}`);
    return;
  }

  // Step 4: Wait for database to settle
  console.log('⏳ Waiting 2 seconds for database to settle...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Step 5: Get FINAL inventory
  console.log('\nSTEP 4️⃣ : Getting FINAL inventory from database...');
  const finalInv = await getInventoryFromDB(spareId, plantId, ascId);
  
  console.log(`  Plant ${plantId}, Spare ${spareId}: ${finalInv.plant} units`);
  console.log(`  ASC ${ascId}, Spare ${spareId}: ${finalInv.asc} units\n`);

  // Step 6: Verify changes
  console.log('STEP 5️⃣ : VERIFICATION RESULTS\n');
  
  const plantChanged = initialInv.plant !== finalInv.plant;
  const ascChanged = initialInv.asc !== finalInv.asc;
  
  console.log('📊 Comparison:');
  console.log(`\n  Plant Inventory:`);
  console.log(`    Initial: ${initialInv.plant}`);
  console.log(`    API showed: ${apiInventory?.plant || 'N/A'}`);
  console.log(`    Final DB: ${finalInv.plant}`);
  console.log(`    Changed: ${plantChanged ? '✅ YES' : '❌ NO'}`);
  
  console.log(`\n  ASC Inventory:`);
  console.log(`    Initial: ${initialInv.asc}`);
  console.log(`    API showed: ${apiInventory?.asc || 'N/A'}`);
  console.log(`    Final DB: ${finalInv.asc}`);
  console.log(`    Changed: ${ascChanged ? '✅ YES' : '❌ NO'}`);

  if (plantChanged && ascChanged) {
    console.log('\n\n✅ SUCCESS! Inventory updates are PERSISTENT and working correctly!');
    console.log(`\n   Plant decreased by ${initialInv.plant - finalInv.plant} (expected ${transferQty})`);
    console.log(`   ASC increased by ${finalInv.asc - initialInv.asc} (expected ${transferQty})`);
  } else {
    console.log('\n\n❌ FAILURE! Inventory updates are NOT persistent!');
    console.log('   Plant inventory changed: ', plantChanged);
    console.log('   ASC inventory changed: ', ascChanged);
  }
}

runVerificationTest();
