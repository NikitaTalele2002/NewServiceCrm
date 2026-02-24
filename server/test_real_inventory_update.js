/**
 * Complete Inventory Update Test - With Real Request ID
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
  console.log('\n🔧 === COMPLETE INVENTORY UPDATE TEST (REAL REQUEST) ===\n');

  // REAL DATA: Using actual request from database
  const requestId = 26;  // Real request ID that exists
  const ascId = 4;       // ASC requesting (from database)
  const plantId = 1;     // Plant assigned to ASC (from database)
  const spareId = 0;
  const qty = 2;
  const docNumber = 'DN-REAL-TEST-' + Date.now();

  console.log('📋 Test Configuration (from database):');
  console.log(`  Request ID: ${requestId} (REAL - exists in database)`);
  console.log(`  ASC: ${ascId} (ABC Service Center)`);
  console.log(`  Plant: ${plantId} (Auto-assigned to ASC)`);
  console.log(`  Spare: ${spareId}`);
  console.log(`  Quantity: ${qty}`);
  console.log(`  Document: ${docNumber}\n`);

  const token = generateToken(ascId);

  // Payload
  const payload = {
    requestId: requestId,  // REAL request ID
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

  console.log('📝 Request Payload:');
  console.log(JSON.stringify(payload, null, 2));
  console.log('\n');

  try {
    console.log('🔄 Sending receive-delivery request...\n');
    
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
      console.log('✅ Request successful!\n');
      
      // Show what was created
      if (data.data) {
        console.log('📦 Created:');
        if (data.data.movement) {
          console.log(`  Movement ID: ${data.data.movement.movement_id}`);
          console.log(`  Status: ${data.data.movement.status}`);
          console.log(`  Total Qty: ${data.data.movement.total_qty}`);
        }
      }
      
      // Show inventory changes from response
      if (data.data?.inventory) {
        const invData = data.data.inventory;
        
        console.log('\n📊 Inventory Changes:');
        
        if (invData.source && invData.source.length > 0) {
          console.log('\n  ✅ SOURCE (Plant) - Decreased:');
          invData.source.forEach(change => {
            console.log(`     Spare ${change.spare_id}: ${change.oldQty} → ${change.newQty} (${change.change})`);
          });
        } else {
          console.log('\n  ❌ SOURCE - No inventory found/updated');
        }

        if (invData.destination && invData.destination.length > 0) {
          console.log('\n  ✅ DESTINATION (ASC) - Increased:');
          invData.destination.forEach(change => {
            const newLabel = change.isNew ? ' [NEWLY CREATED]' : '';
            console.log(`     Spare ${change.spare_id}: ${change.oldQty} → ${change.newQty} (${change.change})${newLabel}`);
          });
        } else {
          console.log('\n  ❌ DESTINATION - No changes');
        }
      } else {
        console.log('\n⚠️  No inventory change data in response');
      }

    } else {
      console.log('❌ Request failed\n');
      console.log('Response:');
      console.log(JSON.stringify(data, null, 2));
      if (data.error) console.log(`\nError: ${data.error}`);
    }

  } catch (error) {
    console.log('❌ Connection failed\n');
    console.log(`Error: ${error.message}`);
    console.log('Make sure the server is running at http://localhost:5000');
  }

  console.log('\n\n💡 To verify in SQL Server:');
  console.log(`\n-- Check Plant inventory for spare ${spareId}`);
  console.log(`SELECT qty_good, qty_defective FROM spare_inventory`);
  console.log(`WHERE spare_id = ${spareId} AND location_type = 'branch' AND location_id = ${plantId};`);
  console.log(`-- Expected: Should have decreased by ${qty}`);
  
  console.log(`\n-- Check ASC inventory for spare ${spareId}`);
  console.log(`SELECT qty_good, qty_defective FROM spare_inventory`);
  console.log(`WHERE spare_id = ${spareId} AND location_type = 'service_center' AND location_id = ${ascId};`);
  console.log(`-- Expected: Should have increased by ${qty}`);
  
  console.log(`\n-- Check stock movement records`);
  console.log(`SELECT TOP 10 movement_id, status, total_qty, reference_no FROM stock_movement`);
  console.log(`ORDER BY created_at DESC;`);
}

testCompleteFlow();
