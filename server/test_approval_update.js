import { sequelize } from './db.js';

async function testCancellationApproval() {
  try {
    console.log('\n=== Testing Cancellation Approval Update ===\n');

    // Check call 3 using raw SQL
    console.log('1. Checking call_id 3 status...');
    const callResult = await sequelize.query(
      `SELECT call_id, status_id, cancel_reason, cancel_remarks, cancelled_by_userId, cancelled_at 
       FROM calls WHERE call_id = 3`,
      { type: sequelize.QueryTypes.SELECT }
    );
    
    if (callResult && callResult[0]) {
      const call = callResult[0];
      console.log('   Current call data:');
      console.log('   - call_id:', call.call_id);
      console.log('   - status_id:', call.status_id);
      console.log('   - cancel_reason:', call.cancel_reason);
      console.log('   - cancel_remarks:', call.cancel_remarks);
      console.log('   - cancelled_by_userId:', call.cancelled_by_userId);
      console.log('   - cancelled_at:', call.cancelled_at);
    } else {
      console.log('   ✗ Call not found');
    }

    // Check pending cancellation requests
    console.log('\n2. Checking pending cancellation requests...');
    const requestsResult = await sequelize.query(
      `SELECT cancellation_id, call_id, request_status, reason FROM call_cancellation_requests 
       WHERE request_status = 'pending'`,
      { type: sequelize.QueryTypes.SELECT }
    );
    console.log('   Pending requests:', requestsResult.length);
    requestsResult.forEach(req => {
      console.log(`   - Request ID: ${req.cancellation_id}, Call ID: ${req.call_id}, Reason: ${req.reason}`);
    });

    // Check if there's a request for call 3
    console.log('\n3. Checking cancellation request for call_id 3...');
    const callRequestResult = await sequelize.query(
      `SELECT cancellation_id, call_id, request_status, reason FROM call_cancellation_requests 
       WHERE call_id = 3`,
      { type: sequelize.QueryTypes.SELECT }
    );
    
    if (callRequestResult && callRequestResult[0]) {
      const req = callRequestResult[0];
      console.log('   Found cancellation request:');
      console.log('   - Cancellation ID:', req.cancellation_id);
      console.log('   - Request Status:', req.request_status);
      console.log('   - Reason:', req.reason);
    } else {
      console.log('   No cancellation request found for call 3');
    }

    console.log('\n=== Test Complete ===\n');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

testCancellationApproval();
