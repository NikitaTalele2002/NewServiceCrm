/**
 * Inventory Update Test with Correct Data
 * Uses plant 1 and ASC 4 which have actual inventory
 */

import jwt from 'jsonwebtoken';

const JWT_SECRET = 'supersecret_jwt_key_change_me';
const BASE_URL = 'http://localhost:5000';

function generateToken() {
  const payload = {
    id: 1,
    username: 'test_user',
    role: 'service_center',
    centerId: 4, // ASC 4 (the only one)
    service_center_id: 4
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

async function testInventoryUpdate() {
  console.log('\n🔧 === INVENTORY UPDATE TEST (FIXED DATA) ===\n');

  // Use correct IDs from database
  const spare_id = 0; // PART-0 exists
  const plant_id = 1; // Plant 1 has inventory
  const asc_id = 4;   // Only ASC that exists in database
  const qty_to_transfer = 2;

  console.log('📋 Test Scenario (Using Correct Database IDs):');
  console.log(`  Spare ID: ${spare_id}`);
  console.log(`  Plant ID (source): ${plant_id} (branch-1)`);
  console.log(`  ASC ID (destination): ${asc_id} (service_center-4)`);
  console.log(`  Quantity to transfer: ${qty_to_transfer}\n`);

  // Generate token for ASC 4
  const token = generateToken();

  // Create a spare request for plant 1
  console.log('📝 Note: Using spare request ID that maps to plant 1\n');

  // Request payload with correct IDs
  const payload = {
    requestId: 26, // Use different request ID
    documentType: 'DN',
    documentNumber: 'DN-20260216-INVTEST-' + Date.now(),
    plants: plant_id, // Plant 1
    items: [
      {
        spare_id: spare_id,
        qty: qty_to_transfer,
        carton_number: 'CTN-INV-' + Date.now(),
        condition: 'good'
      }
    ]
  };

  console.log('📝 Payload:');
  console.log(JSON.stringify(payload, null, 2));
  console.log('\n');

  // Query BEFORE
  console.log('Before Request - Current Inventory:');
  try {
    const response = await fetch(`${BASE_URL}/api/test`);
    if (response.ok) {
      console.log('✅ Database connected\n');
    }
  } catch (e) {}

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
      console.log('✅ Request successful\n');
      
      // Check the response for inventory changes
      if (data.data?.inventory) {
        console.log('📊 Inventory Updates from Response:');
        const invData = data.data.inventory;
        
        if (invData.source && invData.source.length > 0) {
          console.log('\n✅ Source (Plant) Inventory Decreased:');
          invData.source.forEach(change => {
            console.log(`   Spare ${change.spare_id}: ${change.oldQty} → ${change.newQty} (change: ${change.change})`);
          });
        } else {
          console.log('\n❌ Source inventory: NO CHANGES (either not found or error)');
        }

        if (invData.destination && invData.destination.length > 0) {
          console.log('\n✅ Destination (ASC) Inventory Increased:');
          invData.destination.forEach(change => {
            console.log(`   Spare ${change.spare_id}: ${change.oldQty} → ${change.newQty} (change: ${change.change})`);
            if (change.isNew) console.log(`      (NEW RECORD CREATED)`);
          });
        } else {
          console.log('\n❌ Destination inventory: NO CHANGES (either not found or error)');
        }
      }

      // Movement details
      if (data.data?.movement?.movement?.movement_id) {
        console.log(`\n📦 Stock Movement Created:`);
        console.log(`   Movement ID: ${data.data.movement.movement_id}`);
        console.log(`   Status: ${data.data.movement.status}`);
      }

    } else {
      console.log('❌ Request failed\n');
      console.log('Response:');
      console.log(JSON.stringify(data, null, 2));
    }

  } catch (error) {
    console.log('❌ Connection failed\n');
    console.log(`Error: ${error.message}`);
  }

  console.log('\n📝 SQL Queries to Manually Verify:\n');
  console.log(`-- Check plant 1 inventory for spare 0 BEFORE and AFTER`);
  console.log(`SELECT qty_good, qty_defective FROM spare_inventory`);
  console.log(`WHERE spare_id = ${spare_id} AND location_type = 'branch' AND location_id = ${plant_id};\n`);

  console.log(`-- Check ASC 4 inventory for spare 0 BEFORE and AFTER`);
  console.log(`SELECT qty_good, qty_defective FROM spare_inventory`);
  console.log(`WHERE spare_id = ${spare_id} AND location_type = 'service_center' AND location_id = ${asc_id};\n`);

  console.log(`-- Check the stock movements created`);  
  console.log(`SELECT movement_id, status FROM stock_movement`);
  console.log(`WHERE reference_no LIKE 'DN-20260216-INVTEST%' ORDER BY created_at DESC;`);
}

testInventoryUpdate();
