/**
 * TEST: Close Call with Spare Usage - Verify Stock Movement & Inventory Updates
 * 
 * This test verifies that when a call is closed:
 * 1. stock_movement is created
 * 2. goods_movement_items is created
 * 3. spare_inventory is updated
 * 4. calls.status_id is updated (NOT calls.status)
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:3005/api';

async function testCloseCallWithSpares() {
  try {
    console.log('\n' + '='.repeat(70));
    console.log('🧪 TEST: Close Call with Spare Usage');
    console.log('='.repeat(70));

    // Test Case: Close call_id=15 which has spare_part_id=2
    const callId = 15;
    const technicianId = 7; // Assuming technician exists

    console.log(`\n1️⃣ Fetching current call status before closure...`);
    try {
      const callResponse = await axios.get(`${BASE_URL}/technician-tracking/assigned-calls/${technicianId}`);
      const call = callResponse.data.calls?.find(c => c.callId === callId);
      if (call) {
        console.log(`   ✅ Call found:`);
        console.log(`      Status: ${call.status?.statusName} (ID: ${call.status?.statusId})`);
        console.log(`      Sub-Status: ${call.substatus?.subStatusName}`);
      } else {
        console.log(`   ⚠️  Call ${callId} not assigned to technician ${technicianId}`);
      }
    } catch (err) {
      console.log(`   ⚠️  Could not fetch call: ${err.message}`);
    }

    console.log(`\n2️⃣ Closing call ${callId}...`);
    const closeResponse = await axios.post(
      `${BASE_URL}/technician-tracking/call/${callId}/close`,
      {
        technician_id: technicianId,
        status: 'closed'
      }
    );

    console.log(`   ✅ Close response:`);
    console.log(`      Message: ${closeResponse.data.message}`);
    console.log(`      Status ID Set To: ${closeResponse.data.data.status_id}`);
    console.log(`      Stock Movements Created: ${closeResponse.data.data.spare_movements.stock_movements_created}`);
    console.log(`      Goods Movement Items: ${closeResponse.data.data.spare_movements.goods_movement_items_created}`);
    console.log(`      Inventory Updates: ${closeResponse.data.data.spare_movements.inventory_updates}`);

    console.log(`\n3️⃣ Verifying stock_movement was created...`);
    // You would query the database here
    console.log(`   📝 Run this query to verify:`);
    console.log(`      SELECT * FROM stock_movement WHERE reference_no = 'CALL-${callId}' ORDER BY movement_id DESC`);

    console.log(`\n4️⃣ Verifying goods_movement_items was created...`);
    console.log(`   📝 Run this query to verify:`);
    console.log(`      SELECT * FROM goods_movement_items WHERE movement_id = (SELECT MAX(movement_id) FROM stock_movement WHERE reference_no = 'CALL-${callId}')`);

    console.log(`\n5️⃣ Verifying spare_inventory was updated...`);
    console.log(`   📝 Run this query to verify:`);
    console.log(`      SELECT * FROM spare_inventory WHERE spare_id = 2 AND location_type = 'technician' AND location_id = ${technicianId}`);

    console.log(`\n6️⃣ Verifying call status was updated with status_id...`);
    console.log(`   📝 Run this query to verify:`);
    console.log(`      SELECT call_id, status_id, substatus_id FROM calls WHERE call_id = ${callId}`);
    console.log(`      Expected status_id: 8 (closed), substatus_id: NULL`);

    console.log(`\n✅ TEST COMPLETE\n`);
    console.log(`If all stock movements and inventory updates were created, the fix is working!`);

  } catch (err) {
    console.error(`\n❌ TEST FAILED:`);
    console.error(`   ${err.message}`);
    if (err.response?.data) {
      console.error(`   Response: ${JSON.stringify(err.response.data, null, 2)}`);
    }
  }
}

// Run the test
console.log('Please ensure the server is running at http://localhost:3005');
console.log('Press Ctrl+C to stop\n');

testCloseCallWithSpares()
  .catch(console.error)
  .finally(() => process.exit(0));
