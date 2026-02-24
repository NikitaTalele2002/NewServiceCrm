/**
 * Comprehensive Test: Multiple items, different quantities
 * Tests that all items are processed correctly and inventory is updated
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

async function getInventoriesFromDB(spareIds, plantId, ascId) {
  const pool = new sql.ConnectionPool(dbConfig);
  await pool.connect();

  const result = {};
  
  for (const spareId of spareIds) {
    const plantRes = await pool.request().query(
      `SELECT qty_good FROM spare_inventory WHERE spare_id = ${spareId} AND location_type = 'branch' AND location_id = ${plantId}`
    );
    
    const ascRes = await pool.request().query(
      `SELECT qty_good FROM spare_inventory WHERE spare_id = ${spareId} AND location_type = 'service_center' AND location_id = ${ascId}`
    );

    result[spareId] = {
      plant: plantRes.recordset[0]?.qty_good || 0,
      asc: ascRes.recordset[0]?.qty_good || 0
    };
  }

  await pool.close();
  return result;
}

async function runComprehensiveTest() {
  console.log('\n📦 === COMPREHENSIVE INVENTORY TEST (MULTIPLE ITEMS) ===\n');

  const requestId = 24;  // Using request 24 (ASC 4, Plant 1)
  const ascId = 4;
  const plantId = 1;
  
  // Test with multiple spares - use different quantities
  const testItems = [
    { spare_id: 0, qty: 2 },  // Spare 0, qty 2
    { spare_id: 1, qty: 3 },  // Spare 1, qty 3
    { spare_id: 3, qty: 1 }   // Spare 3, qty 1
  ];
  
  const spareIds = testItems.map(i => i.spare_id);

  console.log('📋 Test Configuration:');
  console.log(`  Request ID: ${requestId}`);
  console.log(`  ASC: ${ascId}, Plant: ${plantId}`);
  console.log(`  Transferring ${testItems.length} different spares:\n`);
  testItems.forEach(item => {
    console.log(`    - Spare ${item.spare_id}: ${item.qty} units`);
  });
  console.log();

  // Find DN document
  console.log('Step 1: Finding logistics document...');
  let dnNumber = null;
  try {
    const pool = new sql.ConnectionPool(dbConfig);
    await pool.connect();

    const docResult = await pool.request().query(
      `SELECT document_number FROM logistics_documents 
       WHERE document_type = 'DN' AND reference_id = ${requestId} AND reference_type = 'SPARE_REQUEST'`
    );

    if (docResult.recordset.length === 0) {
      console.log('❌ No DN document found');
      await pool.close();
      return;
    }

    dnNumber = docResult.recordset[0].document_number;
    console.log(`✅ Found DN: ${dnNumber}\n`);
    await pool.close();
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
    return;
  }

  // Get BEFORE inventory
  console.log('Step 2: Getting BEFORE inventory...');
  const beforeInv = await getInventoriesFromDB(spareIds, plantId, ascId);
  
  testItems.forEach(item => {
    console.log(`  Spare ${item.spare_id}: Plant=${beforeInv[item.spare_id].plant}, ASC=${beforeInv[item.spare_id].asc}`);
  });
  console.log();

  // Send receive-delivery
  console.log('Step 3: Sending receive-delivery with all items...');
  const token = generateToken('service_center', ascId);
  
  let afterInvFromAPI = null;
  try {
    const response = await fetch(`${BASE_URL}/api/logistics/receive-delivery`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        requestId: requestId,
        documentType: 'DN',
        documentNumber: dnNumber,
        items: testItems.map(item => ({
          spare_id: item.spare_id,
          qty: item.qty,
          carton_number: `CTN-COMP-${item.spare_id}-${Date.now()}`,
          condition: 'good'
        }))
      })
    });

    const data = await response.json();
    
    if (response.status === 201 && data.ok) {
      console.log('✅ API returned 201 Created\n');
      
      if (data.data?.inventory) {
        console.log('API Response - Inventory Changes:\n');
        
        if (data.data.inventory.source && data.data.inventory.source.length > 0) {
          console.log('  Plant (Source) - Decreased:');
          data.data.inventory.source.forEach(change => {
            console.log(`    Spare ${change.spare_id}: ${change.oldQty} → ${change.newQty}`);
          });
        }
        
        if (data.data.inventory.destination && data.data.inventory.destination.length > 0) {
          console.log('\n  ASC (Destination) - Increased:');
          data.data.inventory.destination.forEach(change => {
            console.log(`    Spare ${change.spare_id}: ${change.oldQty} → ${change.newQty}`);
          });
        }
        console.log();
      }
    } else {
      console.log(`❌ API Error: ${response.status} - ${data.error}`);
      return;
    }
  } catch (error) {
    console.log(`❌ Connection error: ${error.message}`);
    return;
  }

  // Wait for DB
  console.log('⏳ Waiting for database...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Get AFTER inventory
  console.log('\nStep 4: Getting AFTER inventory from database...');
  const afterInv = await getInventoriesFromDB(spareIds, plantId, ascId);
  
  testItems.forEach(item => {
    console.log(`  Spare ${item.spare_id}: Plant=${afterInv[item.spare_id].plant}, ASC=${afterInv[item.spare_id].asc}`);
  });
  console.log();

  // Verify
  console.log('Step 5: VERIFICATION RESULTS\n');
  
  let allCorrect = true;
  
  testItems.forEach(item => {
    const spareId = item.spare_id;
    const expectedPlantQty = beforeInv[spareId].plant - item.qty;
    const expectedAscQty = beforeInv[spareId].asc + item.qty;
    
    const plantCorrect = afterInv[spareId].plant === expectedPlantQty;
    const ascCorrect = afterInv[spareId].asc === expectedAscQty;
    
    const status = plantCorrect && ascCorrect ? '✅' : '❌';
    allCorrect = allCorrect && plantCorrect && ascCorrect;
    
    console.log(`${status} Spare ${spareId}:`);
    console.log(`    Plant: Expected ${expectedPlantQty}, Got ${afterInv[spareId].plant} ${plantCorrect ? '✅' : '❌'}`);
    console.log(`    ASC: Expected ${expectedAscQty}, Got ${afterInv[spareId].asc} ${ascCorrect ? '✅' : '❌'}`);
  });

  if (allCorrect) {
    console.log('\n\n🎉 SUCCESS! All inventory updates are working correctly!\n');
  } else {
    console.log('\n\n❌ Some inventory updates failed!\n');
  }
}

runComprehensiveTest();
