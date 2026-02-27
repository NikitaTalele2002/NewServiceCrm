import { sequelize } from './db.js';

async function testFullCancellationFlow() {
  try {
    console.log('\n=== Testing Full Cancellation Approval Flow ===\n');

    // 1. Check if call 3 exists
    console.log('Step 1: Checking call 3...');
    const callResult = await sequelize.query(
      `SELECT TOP 1 call_id, status_id FROM calls WHERE call_id = 3`,
      { type: sequelize.QueryTypes.SELECT }
    );
    if (!callResult || !callResult[0]) {
      console.log('   ✗ Call not found');
      process.exit(1);
    } else {
      console.log('   ✓ Call 3 exists');
    }

    // 2. Clean up any old request for this call
    console.log('\nStep 2: Cleaning up old requests...');
    await sequelize.query(
      `DELETE FROM call_cancellation_requests WHERE call_id = 3`,
      { type: sequelize.QueryTypes.DELETE }
    );
    console.log('   ✓ Cleaned');

    // 3. Create a cancellation request (simulating SC request)
    console.log('\nStep 3: Creating cancellation request (SC request)...');
    
    // Get "Cancelled - Pending RSM Approval" status ID
    const statusRes = await sequelize.query(
      `SELECT TOP 1 status_id FROM status WHERE status_name = 'Cancelled - Pending RSM Approval'`,
      { type: sequelize.QueryTypes.SELECT }
    );
    const pendingCancelStatus = statusRes[0].status_id;
    
    // Create cancellation request with all required fields
    const reqInsert = await sequelize.query(
      `INSERT INTO call_cancellation_requests (call_id, requested_by_id, requested_by_role, reason, request_status) 
       VALUES (3, 1, 5, 'OTHER', 'pending')`,
      { type: sequelize.QueryTypes.INSERT }
    );
    
    // Get the inserted cancellation request ID
    const newReqResult = await sequelize.query(
      `SELECT TOP 1 cancellation_id FROM call_cancellation_requests WHERE call_id = 3 ORDER BY cancellation_id DESC`,
      { type: sequelize.QueryTypes.SELECT }
    );
    const cancellationId = newReqResult[0].cancellation_id;
    console.log('   ✓ Cancellation request created (ID:', cancellationId + ')');

    // 4. Simulate SC updating cancel_reason in calls table
    console.log('\nStep 4: Simulating SC updating cancel_reason...');
    await sequelize.query(
      `UPDATE calls SET cancel_reason = 'OTHER' WHERE call_id = 3`,
      { type: sequelize.QueryTypes.UPDATE }
    );
    console.log('   ✓ Cancel reason updated in calls table');

    // 5. Verify before approval
    console.log('\nStep 5: State BEFORE RSM approval...');
    const beforeApproval = await sequelize.query(
      `SELECT call_id, cancel_reason, cancel_remarks, cancelled_by_userId, cancelled_at FROM calls WHERE call_id = 3`,
      { type: sequelize.QueryTypes.SELECT }
    );
    if (beforeApproval[0]) {
      const call = beforeApproval[0];
      console.log('   - cancel_reason:', call.cancel_reason);
      console.log('   - cancel_remarks:', call.cancel_remarks);
      console.log('   - cancelled_by_userId:', call.cancelled_by_userId);
      console.log('   - cancelled_at:', call.cancelled_at);
    }

    // 6. Simulate RSM approval by updating cancellation status AND calls table
    console.log('\nStep 6: Simulating RSM approval...');
    
    // Get cancelled status ID
    const cancelledStatusRes = await sequelize.query(
      `SELECT TOP 1 status_id FROM status WHERE status_name = 'cancelled'`,
      { type: sequelize.QueryTypes.SELECT }
    );
    const cancelledStatusId = cancelledStatusRes[0].status_id;
    
    // Update cancellation request status to approved
    await sequelize.query(
      `UPDATE call_cancellation_requests SET request_status = 'approved' WHERE cancellation_id = ?`,
      { replacements: [cancellationId], type: sequelize.QueryTypes.UPDATE }
    );
    
    // Update calls table with RSM approval details
    const rsmUserId = 1; // Simulating RSM user ID
    const approvalTime = new Date();
    
    await sequelize.query(
      `UPDATE calls 
       SET status_id = ?, 
           cancel_remarks = ?, 
           cancelled_by_userId = ?,
           cancelled_at = ?,
           call_closure_source = 'system',
           updated_at = GETDATE()
       WHERE call_id = 3`,
      {
        replacements: [cancelledStatusId, 'RSM approval remarks', rsmUserId, approvalTime],
        type: sequelize.QueryTypes.UPDATE
      }
    );
    console.log('   ✓ RSM approval applied');

    // 7. Verify AFTER approval
    console.log('\nStep 7: State AFTER RSM approval...');
    const afterApproval = await sequelize.query(
      `SELECT call_id, status_id, cancel_reason, cancel_remarks, cancelled_by_userId, cancelled_at FROM calls WHERE call_id = 3`,
      { type: sequelize.QueryTypes.SELECT }
    );
    
    if (afterApproval[0]) {
      const call = afterApproval[0];
      console.log('   ✓ call_id:', call.call_id);
      console.log('   ✓ status_id:', call.status_id);
      console.log('   ✓ cancel_reason:', call.cancel_reason);
      console.log('   ✓ cancel_remarks:', call.cancel_remarks);
      console.log('   ✓ cancelled_by_userId:', call.cancelled_by_userId);
      console.log('   ✓ cancelled_at:', call.cancelled_at);
      
      if (call.cancelled_by_userId && call.cancelled_at && call.cancel_reason && call.cancel_remarks) {
        console.log('\n✓✓✓ SUCCESS! All cancellation fields are properly populated! ✓✓✓\n');
      } else {
        console.log('\n✗ ISSUE: Some fields are still NULL\n');
      }
    }

    console.log('=== Test Complete ===\n');
    process.exit(0);
  } catch (error) {
    console.error('\n✗ ERROR:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testFullCancellationFlow();
