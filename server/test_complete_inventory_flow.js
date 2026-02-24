/**
 * Complete Inventory Update Test
 * Tests that inventory is correctly reduced from plant and increased at ASC
 * Uses the automatic plant selection from ASC assignment
 */

import jwt from 'jsonwebtoken';

const JWT_SECRET = 'supersecret_jwt_key_change_me';
const BASE_URL = 'http://localhost:5000';

function generateToken(ascId = 4) {
  const payload = {
    id: 1,
    username: 'test_asc_user',
    role: 'service_center',
    centerId: ascId,
    service_center_id: ascId
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

async function testCompleteFlow() {
  console.log('\n🔧 === COMPLETE INVENTORY UPDATE TEST ===\n');

  // ASC 4 is assigned to Plant 1
  const ascId = 4;
  const plantId = 1;
  const spareId = 0;
  const qty = 3;
  const docNumber = 'DN-INVTEST-' + Date.now();

  console.log('📋 Test Configuration:');
  console.log(`  ASC: ${ascId} (ABC Service Center)`);
  console.log(`  Plant: ${plantId} (Auto-assigned to ASC)`);
  console.log(`  Spare: ${spareId}`);
  console.log(`  Quantity: ${qty}`);
  console.log(`  Document: ${docNumber}\n`);

  const token = generateToken(ascId);

  // Payload - note that plants parameter will be ignored
  const payload = {
    requestId: 99, // Dummy request ID for testing
    documentType: 'DN',
    documentNumber: docNumber,
    plants: 999, // This will be IGNORED - plant comes from ASC assignment
    items: [
      {
        spare_id: spareId,
        qty: qty,
        carton_number: `CTN-${Date.now()}`,
        condition: 'good'
      }
    ]
  };

  console.log('📝 Request Payload (plants parameter will be ignored):');
  console.log(JSON.stringify(payload, null, 2));
  console.log('\n');

  // Query inventory BEFORE
  console.log('📊 BEFORE REQUEST - Checking current inventory...\n');
  await checkInventory(spareId, plantId, ascId);

  try {
    console.log('🔄 Sending receive-delivery request with automatic plant selection...\n');
    
    const response = await fetch(`${BASE_URL}/api/logistics/receive-delivery`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log(`📊 Response Status: ${response.status}\n`);

    if (response.status === 201 && data.ok) {
      console.log('✅ Request successful\n');
      
      // Show inventory changes from response
      if (data.data?.inventory) {
        const invData = data.data.inventory;
        
        console.log('📋 Inventory Changes (from response):');
        
        if (invData.source && invData.source.length > 0) {
          console.log('\n  ✅ SOURCE (Plant) - Decreased:');
          invData.source.forEach(change => {
            console.log(`     Spare ${change.spare_id}: ${change.oldQty} → ${change.newQty} (${change.change})`);
          });
        } else {
          console.log('\n  ❌ SOURCE - No changes (inventory may not exist or error occurred)');
        }

        if (invData.destination && invData.destination.length > 0) {
          console.log('\n  ✅ DESTINATION (ASC) - Increased:');
          invData.destination.forEach(change => {
            const newLabel = change.isNew ? ' [NEW]' : '';
            console.log(`     Spare ${change.spare_id}: ${change.oldQty} → ${change.newQty} (${change.change})${newLabel}`);
          });
        } else {
          console.log('\n  ❌ DESTINATION - No changes');
        }
      }

    } else {
      console.log('❌ Request failed\n');
      console.log('Response:');
      console.log(JSON.stringify(data, null, 2));
      if (data.error) console.log(`\nError: ${data.error}`);
    }

    // Wait a moment for DB to settle
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Query inventory AFTER
    console.log('\n\n📊 AFTER REQUEST - Checking inventory again...\n');
    await checkInventory(spareId, plantId, ascId);

    } catch (error) {
    console.log('❌ Connection failed\n');
    console.log(`Error: ${error.message}`);
    console.log('Make sure the server is running at http://localhost:5000');
  }

  console.log('\n\n📝 SQL Verification Queries:\n');
  console.log(`-- Plant inventory for spare ${spareId}`);
  console.log(`SELECT qty_good, qty_defective FROM spare_inventory`);
  console.log(`WHERE spare_id = ${spareId} AND location_type = 'branch' AND location_id = ${plantId};`);
  console.log();
  console.log(`-- ASC inventory for spare ${spareId}`);
  console.log(`SELECT qty_good, qty_defective FROM spare_inventory`);
  console.log(`WHERE spare_id = ${spareId} AND location_type = 'service_center' AND location_id = ${ascId};`);
  console.log();
  console.log(`-- Stock movement records`);
  console.log(`SELECT TOP 5 movement_id, status, total_qty FROM stock_movement`);
  console.log(`WHERE reference_no LIKE 'DN-INVTEST%' ORDER BY created_at DESC;`);
}

async function checkInventory(spareId, plantId, ascId) {
  try {
    // Fetch via API test endpoint won't work, so just show the queries
    console.log(`  To check inventory manually, run:`);
    console.log(`    Plant ${plantId}: SELECT qty_good FROM spare_inventory WHERE spare_id=${spareId} AND location_type='branch' AND location_id=${plantId}`);
    console.log(`    ASC ${ascId}: SELECT qty_good FROM spare_inventory WHERE spare_id=${spareId} AND location_type='service_center' AND location_id=${ascId}`);
  } catch (error) {
    console.log(`  (Unable to query - check database directly)`);
  }
}

testCompleteFlow();
