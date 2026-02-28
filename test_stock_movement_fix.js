import axios from 'axios';

const BASE_URL = 'http://localhost:3000/api';

async function testStockMovementFix() {
  try {
    console.log('='.repeat(60));
    console.log('TESTING: Stock Movement Fix - Plant as Source Location');
    console.log('='.repeat(60));

    // 1. LOGIN as RSM to get authentication token
    console.log('\n[1] Login as RSM...');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'rsm@gmail.com',
      password: 'password'
    });
    const token = loginRes.data.token;
    console.log('✅ Logged in as RSM');
    const rsm_id = loginRes.data.user?.rsm_id || 3;

    // 2. Get a pending spare request
    console.log('\n[2] Fetching pending spare requests...');
    const requestsRes = await axios.get(`${BASE_URL}/rsm/spare-requests?status=pending`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const pendingRequest = requestsRes.data.find(r => r.status === 'pending');
    if (!pendingRequest) {
      console.log('❌ No pending requests found');
      return;
    }
    
    const requestId = pendingRequest.spare_request_id;
    console.log(`✅ Found pending request: SR-${requestId}`);
    console.log(`   Requested TO: Plant ID=${pendingRequest.requested_to_id}, Type=${pendingRequest.requested_to_type}`);
    console.log(`   Requested FROM: ${pendingRequest.requested_source_type} ID=${pendingRequest.requested_source_id}`);

    // 3. Approve the request
    console.log('\n[3] Approving spare request...');
    const approveRes = await axios.post(
      `${BASE_URL}/rsm/spare-requests/${requestId}/approve`,
      {},
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('✅ Request approved');

    // 4. Check the stock movement created
    console.log('\n[4] Verifying stock movement creation...');
    const stockMovementRes = await axios.get(
      `${BASE_URL}/stock-movements?reference_no=SR-${requestId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    if (stockMovementRes.data.length === 0) {
      console.log('❌ No stock movement found');
      return;
    }

    const movement = stockMovementRes.data[0];
    console.log('\n📋 Stock Movement Details:');
    console.log(`   Movement ID: ${movement.movement_id}`);
    console.log(`   Reference: ${movement.reference_no}`);
    console.log(`   Type: ${movement.stock_movement_type}`);
    console.log(`   Source Location Type: ${movement.source_location_type}`);
    console.log(`   Source Location ID: ${movement.source_location_id}`);
    console.log(`   Destination Location Type: ${movement.destination_location_type}`);
    console.log(`   Destination Location ID: ${movement.destination_location_id}`);
    console.log(`   Total Qty: ${movement.total_qty}`);
    console.log(`   Status: ${movement.status}`);

    // 5. VERIFY: Source should be 'plant', not 'warehouse'
    console.log('\n[5] Validation Results:');
    const sourceIsPlant = movement.source_location_type === 'plant';
    const sourceIdIsCorrect = movement.source_location_id === pendingRequest.requested_to_id;
    
    if (sourceIsPlant) {
      console.log('✅ Source location type is CORRECT: "plant"');
    } else {
      console.log(`❌ Source location type is WRONG: "${movement.source_location_type}" (should be "plant")`);
    }

    if (sourceIdIsCorrect) {
      console.log(`✅ Source location ID is CORRECT: ${movement.source_location_id}`);
    } else {
      console.log(`❌ Source location ID is WRONG: ${movement.source_location_id} (should be ${pendingRequest.requested_to_id})`);
    }

    const destTypeCorrect = movement.destination_location_type === pendingRequest.requested_source_type;
    const destIdCorrect = movement.destination_location_id === pendingRequest.requested_source_id;
    
    if (destTypeCorrect && destIdCorrect) {
      console.log(`✅ Destination is CORRECT: ${movement.destination_location_type} ${movement.destination_location_id}`);
    } else {
      console.log(`❌ Destination is WRONG`);
    }

    // Final result
    console.log('\n' + '='.repeat(60));
    if (sourceIsPlant && sourceIdIsCorrect && destTypeCorrect && destIdCorrect) {
      console.log('✅✅✅ STOCK MOVEMENT FIX SUCCESSFUL ✅✅✅');
      console.log('Stock is now correctly moving FROM plant TO service_center');
    } else {
      console.log('❌ STOCK MOVEMENT FIX INCOMPLETE');
    }
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Test Error:', error.response?.data || error.message);
  }
}

testStockMovementFix();
