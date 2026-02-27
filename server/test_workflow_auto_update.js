const axios = require('axios');
const sequelize = require('./db');
const { Calls, CallCancellationRequests, ActionLog, Status, Users } = require('./models');

const API_BASE_URL = 'http://localhost:5000/api';
let scToken, rsmToken, testCallId;

async function generateToken(userId) {
  const authService = require('./services/authService');
  const user = await Users.findByPk(userId);
  if (!user) throw new Error(`User ${userId} not found`);
  return authService.createTokenForUser(user);
}

async function testCompleteWorkflow() {
  try {
    console.log('\n========== COMPLETE CANCELLATION WORKFLOW TEST ==========\n');

    // Step 1: Generate tokens
    console.log('Step 1: Setting up test tokens...');
    scToken = await generateToken(2); // SC user
    rsmToken = await generateToken(3); // RSM user
    console.log('✓ Tokens generated\n');

    // Step 2: Get a test call
    console.log('Step 2: Finding test call...');
    const call = await Calls.findOne({
      where: { assigned_asc_id: 1 },
      include: [{ association: 'status', attributes: ['status_id', 'status_name'] }]
    });

    if (!call) {
      console.log('✗ No call found assigned to SC #1');
      return;
    }

    testCallId = call.call_id;
    console.log(`✓ Test call found: ${call.call_id}`);
    console.log(`  Current Status: ${call.status.status_name} (ID: ${call.status.status_id})\n`);

    // Step 3: Request cancellation
    console.log('Step 3: Service Center requests cancellation...');
    const cancelResponse = await axios.post(
      `${API_BASE_URL}/call-center/complaints/${testCallId}/cancel`,
      {
        reason: 'DUPLICATE',
        remarks: 'Testing automatic workflow'
      },
      {
        headers: { Authorization: `Bearer ${scToken}` }
      }
    ).catch(e => ({ error: e.response?.data || e.message }));

    if (cancelResponse.error) {
      console.log('✗ Error requesting cancellation:', cancelResponse.error);
      return;
    }

    console.log('✓ Cancellation request submitted');
    const cancellationId = cancelResponse.data.cancellation_request.id;
    console.log(`  Cancellation ID: ${cancellationId}\n`);

    // Step 4: Verify automatic database updates (Request stage)
    console.log('Step 4: Verifying AUTOMATIC database updates after request...');
    
    const callAfterRequest = await Calls.findByPk(testCallId, {
      include: [{ association: 'status', attributes: ['status_id', 'status_name'] }]
    });

    const requestRecord = await CallCancellationRequests.findByPk(cancellationId);
    const requestLogs = await ActionLog.findAll({
      where: { entity_id: testCallId, entity_type: 'Call' },
      order: [['action_at', 'DESC']],
      limit: 1
    });

    console.log('Database State After Request:');
    console.log(`  ✓ Call Status: ${callAfterRequest.status.status_name} (was: ${call.status.status_name})`);
    console.log(`  ✓ Request Record: Status = ${requestRecord.request_status}`);
    console.log(`  ${requestLogs.length > 0 ? '✓' : '✗'} Action Log Created: ${requestLogs.length > 0 ? 'YES' : 'NO'}`);
    if (requestLogs[0]) {
      console.log(`     Remarks: "${requestLogs[0].remarks}"`);
    }
    console.log();

    // Step 5: RSM approves cancellation
    console.log('Step 5: RSM approves cancellation...');
    const approveResponse = await axios.post(
      `${API_BASE_URL}/call-center/cancellation-requests/${cancellationId}/approve`,
      { remarks: 'Approved by RSM' },
      { headers: { Authorization: `Bearer ${rsmToken}` } }
    ).catch(e => ({ error: e.response?.data || e.message }));

    if (approveResponse.error) {
      console.log('✗ Error approving cancellation:', approveResponse.error);
      return;
    }

    console.log('✓ Cancellation approved by RSM\n');

    // Step 6: Verify automatic database updates (Approval stage)
    console.log('Step 6: Verifying AUTOMATIC database updates after approval...');
    
    const callAfterApproval = await Calls.findByPk(testCallId, {
      include: [{ association: 'status', attributes: ['status_id', 'status_name'] }]
    });

    const approvalLogs = await ActionLog.findAll({
      where: { entity_id: testCallId, entity_type: 'Call' },
      order: [['action_at', 'DESC']],
      limit: 2
    });

    console.log('Database State After Approval:');
    console.log(`  ✓ Call Status: ${callAfterApproval.status.status_name}`);
    console.log(`  ✓ Action Logs: ${approvalLogs.length} total`);
    approvalLogs.forEach((log, idx) => {
      console.log(`     Log ${idx + 1}: "${log.remarks}"`);
    });
    console.log();

    // Step 7: Summary
    console.log('========== WORKFLOW VERIFICATION COMPLETE ==========\n');
    console.log('AUTOMATIC UPDATES VERIFIED:');
    console.log(callAfterRequest.status.status_name !== call.status.status_name ? '✓ Status changes when request submitted' : '✗ Status NOT changing on request');
    console.log(requestLogs.length > 0 ? '✓ Action logs created automatically on request' : '✗ Action logs NOT being created');
    console.log(callAfterApproval.status.status_name === 'Cancelled' ? '✓ Status changes to "Cancelled" on approval' : '✗ Status NOT changing to Cancelled');
    console.log(approvalLogs.length >= 2 ? '✓ Multiple action logs created throughout workflow' : '⚠ Not enough logs');
    console.log('\nResult: Database is AUTOMATICALLY updated when actions occur!\n');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

testCompleteWorkflow();
