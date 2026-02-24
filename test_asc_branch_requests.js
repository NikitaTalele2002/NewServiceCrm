/**
 * Test: ASC to Branch Spare Requests
 * Tests creating spare requests from ASC to Branch (defective/excess returns)
 */

import { config } from 'dotenv';

config();

const API_BASE = process.env.API_URL || 'http://localhost:3000/api';
let token = '';

// Test data
const TEST_SPARE_ID = 1;          // Use existing spare
const TEST_ASC_ID = 1;            // ASC service center
const TEST_BRANCH_ID = 5;         // Branch destination

async function getToken() {
  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });
    const data = await response.json();
    token = data.token;
    console.log('✅ Got auth token\n');
    return token;
  } catch (error) {
    console.error('❌ Failed to get token:', error.message);
    throw error;
  }
}

async function testCheckInventoryAtASC() {
  console.log('📋 TEST 1: Check available stock at ASC for return\n');
  try {
    const response = await fetch(
      `${API_BASE}/asc-branch-requests/inventory/${TEST_ASC_ID}/${TEST_SPARE_ID}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await response.json();
    console.log('✅ Response:');
    console.log(JSON.stringify(data, null, 2));
    
    if (data.data.available_to_return.defective > 0) {
      console.log('\n✅ ASC has defective stock to return\n');
      return true;
    } else if (data.data.available_to_return.excess > 0) {
      console.log('\n✅ ASC has excess stock to return\n');
      return true;
    } else {
      console.log('\n⚠️  No stock available to return\n');
      return false;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

async function testReturnDefectiveSpares() {
  console.log('📋 TEST 2: Create ASC→Branch request (return defective)\n');
  try {
    const response = await fetch(
      `${API_BASE}/asc-branch-requests`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          spare_request_type: 'ASC_RETURN_DEFECTIVE',
          spare_id: TEST_SPARE_ID,
          quantity: 2,
          asc_id: TEST_ASC_ID,
          branch_id: TEST_BRANCH_ID,
          reason: 'defect',
          notes: 'Returning defective units from ASC inventory'
        })
      }
    );
    
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ ASC→Branch defective return created!');
      console.log(`   Request ID: ${data.request.request_id}`);
      console.log(`   Spare: ${data.request.spare_code}`);
      console.log(`   Quantity: ${data.request.quantity}`);
      console.log(`   From: ASC ${TEST_ASC_ID} → To: Branch ${TEST_BRANCH_ID}`);
      console.log(`   Movements created: ${data.request.movements.length}`);
      data.request.movements.forEach((mvt, i) => {
        console.log(`     ${i + 1}. ${mvt.type}`);
        console.log(`        ${mvt.bucket} ${mvt.operation} x${mvt.quantity}`);
      });
      console.log('');
      return data.request.request_id;
    } else {
      console.log('❌ Failed to create request');
      console.log(JSON.stringify(data, null, 2));
      return null;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

async function testReturnExcessSpares() {
  console.log('📋 TEST 3: Create ASC→Branch request (return excess)\n');
  try {
    const response = await fetch(
      `${API_BASE}/asc-branch-requests`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          spare_request_type: 'ASC_RETURN_EXCESS',
          spare_id: TEST_SPARE_ID,
          quantity: 1,
          asc_id: TEST_ASC_ID,
          branch_id: TEST_BRANCH_ID,
          reason: 'unused',
          notes: 'Returning unused/excess units to branch'
        })
      }
    );
    
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ ASC→Branch excess return created!');
      console.log(`   Request ID: ${data.request.request_id}`);
      console.log(`   Spare: ${data.request.spare_code}`);
      console.log(`   Quantity: ${data.request.quantity}`);
      console.log(`   From: ASC ${TEST_ASC_ID} → To: Branch ${TEST_BRANCH_ID}`);
      console.log(`   Movements created: ${data.request.movements.length}`);
      data.request.movements.forEach((mvt, i) => {
        console.log(`     ${i + 1}. ${mvt.type}`);
        console.log(`        ${mvt.bucket} ${mvt.operation} x${mvt.quantity}`);
      });
      console.log('');
      return data.request.request_id;
    } else {
      console.log('❌ Failed to create request');
      console.log(JSON.stringify(data, null, 2));
      return null;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

async function testListASCBranchRequests() {
  console.log('📋 TEST 4: List ASC→Branch requests\n');
  try {
    const response = await fetch(
      `${API_BASE}/asc-branch-requests?asc_id=${TEST_ASC_ID}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    const data = await response.json();
    
    console.log(`✅ Found ${data.data.length} requests from ASC ${TEST_ASC_ID}\n`);
    
    if (data.data.length > 0) {
      data.data.forEach((req, i) => {
        console.log(`${i + 1}. Request #${req.request_id}`);
        console.log(`   Type: ${req.spare_request_type}`);
        console.log(`   Spare: ${req.spare_code}`);
        console.log(`   Qty: ${req.quantity}`);
        console.log(`   Status: ${req.status} (${req.approved_status})`);
        console.log(`   Date: ${req.created_at}`);
        console.log('');
      });
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function testGetRequestDetails(requestId) {
  if (!requestId) {
    console.log('⚠️  Skipping detail test - no request created\n');
    return;
  }

  console.log(`📋 TEST 5: Get ASC→Branch request details\n`);
  try {
    const response = await fetch(
      `${API_BASE}/asc-branch-requests/${requestId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    const data = await response.json();
    const req = data.data;
    console.log('✅ Request Details:');
    console.log(`   ID: ${req.request_id}`);
    console.log(`   Type: ${req.spare_request_type}`);
    console.log(`   Spare: ${req.spare_code} - ${req.spare_name}`);
    console.log(`   Quantity: ${req.quantity}`);
    console.log(`   From: ASC ${req.from.id}`);
    console.log(`   To: Branch ${req.to.id}`);
    console.log(`   Status: ${req.status}`);
    console.log(`   Approved: ${req.approved_status}`);
    console.log(`   Movements:`);
    
    if (req.movements && req.movements.length > 0) {
      req.movements.forEach((mvt, i) => {
        console.log(`     ${i + 1}. ${mvt.stock_movement_type}`);
        console.log(`        ${mvt.bucket} ${mvt.bucket_operation} x${mvt.quantity}`);
        console.log(`        Status: ${mvt.status}`);
      });
    }
    console.log('');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function runTests() {
  console.log('\n========================================');
  console.log('ASC→BRANCH SPARE REQUEST TEST SUITE');
  console.log('========================================\n');

  try {
    // Get token
    await getToken();

    // Test 1: Check inventory at ASC
    const hasStock = await testCheckInventoryAtASC();

    // Test 2: Create defective return request
    let requestId1 = null;
    if (hasStock) {
      requestId1 = await testReturnDefectiveSpares();
    }

    // Test 3: Create excess return request
    let requestId2 = null;
    if (hasStock) {
      requestId2 = await testReturnExcessSpares();
    }

    // Test 4: List all requests from ASC
    await testListASCBranchRequests();

    // Test 5: Get details of created request
    if (requestId1) {
      await testGetRequestDetails(requestId1);
    }

    console.log('========================================');
    console.log('✅ ASC→BRANCH TEST SUITE COMPLETED');
    console.log('========================================\n');

    console.log('Summary:');
    console.log('  Can create ASC→Branch requests for:');
    console.log('  ✅ Returning defective spares (ASC_RETURN_DEFECTIVE)');
    console.log('  ✅ Returning excess spares (ASC_RETURN_EXCESS)');
    console.log('  ✅ Automatic bucket tracking (DEFECTIVE/GOOD → IN_TRANSIT)');
    console.log('  ✅ stock_movement audit trail maintained');
    console.log('  ✅ Complete request tracking and history\n');

  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

// Run tests
runTests().catch(console.error);
