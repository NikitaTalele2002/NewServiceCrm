/**
 * Test API Integration for Technician Allocation
 * Tests the actual POST /api/complaints/assign-technician endpoint
 */

import fetch from 'node-fetch';

const API_URL = 'http://localhost:5000/api';
const TEST_TIMEOUT = 10000;

async function testAllocationAPI() {
  try {
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║       Technician Allocation API - Integration Test            ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    // ========== TEST 1: Check if server is running ==========
    console.log('📋 TEST 1: Checking Server Connection');
    console.log('─'.repeat(60));
    
    try {
      const response = await fetch(`${API_URL}/complaints`, {
        timeout: TEST_TIMEOUT,
        headers: { Authorization: 'Bearer test-token' }
      });
      console.log(`✅ Server responding (Status: ${response.status})\n`);
    } catch (e) {
      console.log('⚠️  Server not running. Start server with: npm start (from server directory)\n');
      process.exit(1);
    }

    // ========== TEST 2: Test Initial Allocation ==========
    console.log('📋 TEST 2: Testing Initial allocation via API');
    console.log('─'.repeat(60));
    
    const allocationPayload = {
      complaintId: 0,
      technicianId: 3,
      assignmentReason: 'TESTING'
    };

    console.log(`Sending POST /api/complaints/assign-technician`);
    console.log(`Payload:`, JSON.stringify(allocationPayload, null, 2));

    const allocationResponse = await fetch(`${API_URL}/complaints/assign-technician`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token'
      },
      body: JSON.stringify(allocationPayload),
      timeout: TEST_TIMEOUT
    });

    const allocationResult = await allocationResponse.json();
    
    console.log(`\nResponse Status: ${allocationResponse.status}`);
    console.log(`Response Body:`, JSON.stringify(allocationResult, null, 2));

    if (allocationResponse.ok && allocationResult.success) {
      console.log('\n✅ Initial Allocation API call successful!');
      console.log(`   - Call ID: ${allocationResult.data.callId}`);
      console.log(`   - Technician: ${allocationResult.data.assignedTechnicianName}`);
      console.log(`   - Status: ${allocationResult.data.status}`);
      console.log(`   - Total Allocations: ${allocationResult.data.assignmentHistory.totalAllocations}`);
    } else {
      console.log('\n❌ Initial Allocation API call failed!');
      console.log(`   Error: ${allocationResult.message || 'Unknown error'}`);
    }

    // ========== TEST 3: Test Reallocation ==========
    console.log('\n📋 TEST 3: Testing Reallocation via API');
    console.log('─'.repeat(60));
    
    const reallocationPayload = {
      complaintId: 4,
      technicianId: 9,
      assignmentReason: 'PERFORMANCE'
    };

    console.log(`Sending POST /api/complaints/assign-technician (Reallocation)`);
    console.log(`Payload:`, JSON.stringify(reallocationPayload, null, 2));

    const reallocationResponse = await fetch(`${API_URL}/complaints/assign-technician`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer test-token'
      },
      body: JSON.stringify(reallocationPayload),
      timeout: TEST_TIMEOUT
    });

    const reallocationResult = await reallocationResponse.json();
    
    console.log(`\nResponse Status: ${reallocationResponse.status}`);
    console.log(`Response Body:`, JSON.stringify(reallocationResult, null, 2));

    if (reallocationResponse.ok && reallocationResult.success) {
      console.log('\n✅ Reallocation API call successful!');
      console.log(`   - Call ID: ${reallocationResult.data.callId}`);
      console.log(`   - New Technician: ${reallocationResult.data.assignedTechnicianName}`);
      console.log(`   - Is Reallocation: ${reallocationResult.data.isReallocation}`);
      console.log(`   - Previous Tech ID: ${reallocationResult.data.previousTechnicianId}`);
      console.log(`   - Status: ${reallocationResult.data.status}`);
      console.log(`   - Total Allocations: ${reallocationResult.data.assignmentHistory.totalAllocations}`);
    } else {
      console.log('\n⚠️  Reallocation API call had issues');
      console.log(`   Message: ${reallocationResult.message || 'Unknown'}`);
    }

    // ========== SUMMARY ==========
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║                    API TEST COMPLETE                          ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    console.log('✨ API Integration Tests Complete!\n');
    console.log('Next Steps:');
    console.log('  1. Go to Assign Complaint page in frontend');
    console.log('  2. Select a call and assign/reallocate technician');
    console.log('  3. Verify allocation shows in UI with updated status');
    console.log('  4. Check allocation history if available\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Test Error:', error.message);
    process.exit(1);
  }
}

testAllocationAPI();
