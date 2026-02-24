/**
 * Inventory Update Test
 * Tests that inventory is correctly updated when delivery is received
 */

import jwt from 'jsonwebtoken';

const JWT_SECRET = 'supersecret_jwt_key_change_me';
const BASE_URL = 'http://localhost:5000';

function generateToken() {
  const payload = {
    id: 1,
    username: 'test_user',
    role: 'service_center',
    centerId: 3,
    service_center_id: 3
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

async function fetchInventory(spareId, locationType, locationId) {
  try {
    // Query via SQL would be ideal, but let's use a simple approach
    const response = await fetch(`${BASE_URL}/api/test`);
    return await response.json();
  } catch (error) {
    console.log(`⚠️ Could not fetch inventory details`);
    return null;
  }
}

async function testInventoryUpdate() {
  console.log('\n🔧 === INVENTORY UPDATE TEST ===\n');

  // Test scenario
  const spare_id = 0; // PART-0 from earlier
  const plant_id = 4; // Source
  const asc_id = 3;   // Destination
  const qty_to_transfer = 1;

  console.log('📋 Test Scenario:');
  console.log(`  Spare ID: ${spare_id}`);
  console.log(`  Plant ID (source): ${plant_id}`);
  console.log(`  ASC ID (destination): ${asc_id}`);
  console.log(`  Quantity to transfer: ${qty_to_transfer}\n`);

  // Generate token
  const token = generateToken();

  // Request payload
  const payload = {
    requestId: 25,
    documentType: 'DN',
    documentNumber: 'DN-20260216-R8H2V',
    plants: plant_id,
    items: [
      {
        spare_id: spare_id,
        qty: qty_to_transfer,
        carton_number: 'CTN-TEST-' + Date.now(),
        condition: 'good'
      }
    ]
  };

  console.log('📝 Payload:');
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
      console.log('✅ Request successful\n');
      
      // Check the response for inventory changes
      if (data.data?.inventory) {
        console.log('📊 Inventory Updates Reported in Response:');
        console.log(JSON.stringify(data.data.inventory, null, 2));
        console.log('\n');

        const invData = data.data.inventory;
        if (invData.source && invData.source.length > 0) {
          console.log('✅ Source (Plant) inventory changes:');
          invData.source.forEach(change => {
            console.log(`   Spare ${change.spare_id}: ${change.oldQty} → ${change.newQty} (${change.change})`);
          });
        } else {
          console.log('⚠️ No source inventory changes reported');
        }

        if (invData.destination && invData.destination.length > 0) {
          console.log('\n✅ Destination (ASC) inventory changes:');
          invData.destination.forEach(change => {
            console.log(`   Spare ${change.spare_id}: ${change.oldQty} → ${change.newQty} (${change.change})`);
          });
        } else {
          console.log('\n⚠️ No destination inventory changes reported');
        }
      }

    } else {
      console.log('❌ Request failed\n');
      console.log('Response:');
      console.log(JSON.stringify(data, null, 2));
    }

  } catch (error) {
    console.log('❌ Connection failed\n');
    console.log(`Error: ${error.message}`);
    console.log('Make sure the server is running at http://localhost:5000');
  }

  console.log('\n⏳ Waiting 2 seconds before querying database...\n');
  await new Promise(resolve => setTimeout(resolve, 2000));

  console.log('📝 To manually verify inventory in database, run:');
  console.log(`
  -- Check plant inventory (should be decreased):
  SELECT * FROM spare_inventory 
  WHERE spare_id = ${spare_id} AND location_type = 'branch' AND location_id = ${plant_id};

  -- Check ASC inventory (should be increased):
  SELECT * FROM spare_inventory 
  WHERE spare_id = ${spare_id} AND location_type = 'service_center' AND location_id = ${asc_id};
  `);
}

testInventoryUpdate();
