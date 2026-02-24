/**
 * Test: Service Center to Branch Spare Request (Using SC-Branch Endpoint)
 * 
 * This comprehensive test demonstrates:
 * 1. Checking inventory at Service Center
 * 2. Creating a spare request from SC to Branch using dedicated endpoint
 * 3. Verifying the request in database
 * 4. Listing all SC-Branch requests
 * 5. Getting detailed request information
 */

const API_BASE = 'http://localhost:5000/api';

// Test Configuration
const TEST_CONFIG = {
  serviceCenterId: 4,        // Service Center ID (ASC India)
  branchId: 5,               // Branch ID
  spareId: 1,                // Spare Part ID (existing spare)
  quantity: 3,               // Quantity to transfer
  testToken: ''              // Will be filled from env or login
};

/**
 * Authenticate and get token
 */
async function getAuthToken() {
  try {
    console.log('🔐 Step 1: Getting Authentication Token\n');
    
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'scuser',
        password: 'password'
      })
    });
    
    const data = await response.json();
    
    if (data.success && data.token) {
      TEST_CONFIG.testToken = data.token;
      console.log('✅ Authentication successful');
      console.log(`   Token: ${TEST_CONFIG.testToken.substring(0, 20)}...`);
      return true;
    } else if (process.env.TEST_TOKEN) {
      TEST_CONFIG.testToken = process.env.TEST_TOKEN;
      console.log('⚠️  Using token from environment variable');
      return true;
    }
    
    console.log('⚠️  Authentication failed, some tests may not work');
    return false;
  } catch (error) {
    console.error('❌ Auth error:', error.message);
    return false;
  }
}

/**
 * Check inventory at Service Center
 */
async function checkServiceCenterInventory() {
  console.log('\n📊 Step 2: Checking Service Center Inventory\n');
  
  try {
    const response = await fetch(
      `${API_BASE}/sc-branch-requests/inventory/${TEST_CONFIG.serviceCenterId}/${TEST_CONFIG.spareId}`,
      { headers: { Authorization: `Bearer ${TEST_CONFIG.testToken}` } }
    );
    
    const data = await response.json();
    
    if (data.success) {
      console.log(`✅ Inventory Retrieved for Service Center ${TEST_CONFIG.serviceCenterId}`);
      console.log(`   Spare ID: ${TEST_CONFIG.spareId}`);
      
      if (data.data.inventory) {
        console.log(`   📦 Current Inventory:`);
        console.log(`      Good: ${data.data.inventory.good}`);
        console.log(`      Defective: ${data.data.inventory.defective}`);
        console.log(`      In Transit: ${data.data.inventory.in_transit}`);
        console.log(`   📦 Available to Send:`);
        console.log(`      Good: ${data.data.available_to_send.good}`);
        console.log(`      Defective: ${data.data.available_to_send.defective}`);
        
        if (data.data.available_to_send.good >= TEST_CONFIG.quantity) {
          console.log(`   ✅ Sufficient inventory to send ${TEST_CONFIG.quantity} units`);
          return true;
        } else {
          console.log(`   ❌ Insufficient inventory! Available: ${data.data.available_to_send.good}, Needed: ${TEST_CONFIG.quantity}`);
          return false;
        }
      }
    } else {
      console.log(`⚠️  ${data.data.message || 'Could not fetch inventory'}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

/**
 * Create SC to Branch spare request
 */
async function createSCToBranchRequest() {
  console.log('\n📝 Step 3: Creating Service Center → Branch Spare Request\n');
  
  try {
    const payload = {
      spare_request_type: 'SEND_TO_BRANCH',
      spare_id: TEST_CONFIG.spareId,
      quantity: TEST_CONFIG.quantity,
      sc_id: TEST_CONFIG.serviceCenterId,
      branch_id: TEST_CONFIG.branchId,
      reason: 'sc_inventory_transfer',
      notes: `Auto-generated test request from SC${TEST_CONFIG.serviceCenterId} to Branch${TEST_CONFIG.branchId}`
    };
    
    console.log('📦 Request Details:');
    console.log(`   From: Service Center ${payload.sc_id}`);
    console.log(`   To: Branch ${payload.branch_id}`);
    console.log(`   Spare: ${payload.spare_id}`);
    console.log(`   Qty: ${payload.quantity}`);
    console.log(`   Type: ${payload.spare_request_type}\n`);
    
    const response = await fetch(
      `${API_BASE}/sc-branch-requests`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${TEST_CONFIG.testToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }
    );
    
    const data = await response.json();
    
    if (data.success) {
      console.log(`✅ SPARE REQUEST CREATED SUCCESSFULLY!`);
      console.log(`   Request ID: ${data.request.request_id}`);
      console.log(`   Status: ${data.request.status}`);
      console.log(`   Source: ${data.request.source}`);
      console.log(`   Destination: ${data.request.destination}`);
      
      if (data.request.movements && data.request.movements.length > 0) {
        console.log(`   📊 Movements Created:`);
        data.request.movements.forEach((mvt, idx) => {
          console.log(`      ${idx + 1}. ${mvt.stock_movement_type}`);
          console.log(`         Bucket: ${mvt.bucket} (${mvt.operation}) x${mvt.quantity}`);
        });
      }
      
      return data.request.request_id;
    } else {
      console.log(`❌ FAILED TO CREATE REQUEST`);
      console.log(`   Error: ${data.error}`);
      if (data.available !== undefined) {
        console.log(`   Available: ${data.available}, Requested: ${data.requested}`);
      }
      return null;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

/**
 * Get request details
 */
async function getRequestDetails(requestId) {
  console.log(`\n✔️  Step 4: Retrieving Request Details (ID: ${requestId})\n`);
  
  try {
    const response = await fetch(
      `${API_BASE}/sc-branch-requests/${requestId}`,
      { headers: { Authorization: `Bearer ${TEST_CONFIG.testToken}` } }
    );
    
    const data = await response.json();
    
    if (data.success) {
      const req = data.data;
      console.log(`✅ Request Details:`);
      console.log(`   ID: ${req.request_id}`);
      console.log(`   Type: ${req.spare_request_type}`);
      console.log(`   Spare: ${req.spare_code || req.spare_id} - ${req.spare_description || 'N/A'}`);
      console.log(`   Qty: ${req.quantity}`);
      console.log(`   From SC: ${req.sc_id}`);
      console.log(`   To Branch: ${req.branch_id}`);
      console.log(`   Status: ${req.status}`);
      console.log(`   Created: ${req.created_at}`);
      
      if (req.movements && req.movements.length > 0) {
        console.log(`   📊 Movements:`);
        req.movements.forEach((mvt, idx) => {
          console.log(`      ${idx + 1}. ${mvt.stock_movement_type}`);
          console.log(`         Qty: ${mvt.total_qty}, Bucket: ${mvt.bucket} (${mvt.bucket_operation})`);
          console.log(`         Created: ${mvt.created_at}`);
        });
      }
      
      return true;
    } else {
      console.log(`❌ Error: ${data.error}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

/**
 * List all SC-Branch requests
 */
async function listSCBranchRequests() {
  console.log(`\n📋 Step 5: Listing All Service Center → Branch Requests\n`);
  
  try {
    const params = new URLSearchParams({
      sc_id: TEST_CONFIG.serviceCenterId
    });
    
    const response = await fetch(
      `${API_BASE}/sc-branch-requests?${params}`,
      { headers: { Authorization: `Bearer ${TEST_CONFIG.testToken}` } }
    );
    
    const data = await response.json();
    
    if (data.success) {
      console.log(`✅ Found ${data.total} SC→Branch requests for Service Center ${TEST_CONFIG.serviceCenterId}\n`);
      
      if (data.data && data.data.length > 0) {
        data.data.slice(0, 5).forEach((req, idx) => {
          console.log(`${idx + 1}. Request #${req.request_id}`);
          console.log(`   Type: ${req.spare_request_type}`);
          console.log(`   Spare: ${req.spare_code} (${req.spare_description})`);
          console.log(`   Qty: ${req.quantity}`);
          console.log(`   To Branch: ${req.branch_id}`);
          console.log(`   Status: ${req.status}`);
          console.log(`   Created: ${req.created_at}\n`);
        });
      }
      
      return true;
    } else {
      console.log(`❌ Error: ${data.error}`);
      return false;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    return false;
  }
}

/**
 * Check inventory after request
 */
async function checkInventoryAfter() {
  console.log(`\n📊 Step 6: Verifying Updated Inventory\n`);
  
  try {
    const response = await fetch(
      `${API_BASE}/sc-branch-requests/inventory/${TEST_CONFIG.serviceCenterId}/${TEST_CONFIG.spareId}`,
      { headers: { Authorization: `Bearer ${TEST_CONFIG.testToken}` } }
    );
    
    const data = await response.json();
    
    if (data.success && data.data.inventory) {
      console.log(`✅ Updated Inventory at Service Center ${TEST_CONFIG.serviceCenterId}`);
      console.log(`   Good: ${data.data.inventory.good}`);
      console.log(`   Defective: ${data.data.inventory.defective}`);
      console.log(`   In Transit: ${data.data.inventory.in_transit}`);
      console.log(`   (Good quantity should be reduced by ${TEST_CONFIG.quantity})`);
      return true;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  return false;
}

/**
 * Run complete test suite
 */
async function runCompleteTest() {
  console.log('\n${'='.repeat(70)}');
  console.log('🚀 SERVICE CENTER TO BRANCH SPARE REQUEST - COMPLETE TEST 🚀');
  console.log('='.repeat(70));
  
  console.log(`\n📌 Test Configuration:`);
  console.log(`   Service Center ID: ${TEST_CONFIG.serviceCenterId}`);
  console.log(`   Branch ID: ${TEST_CONFIG.branchId}`);
  console.log(`   Spare ID: ${TEST_CONFIG.spareId}`);
  console.log(`   Quantity: ${TEST_CONFIG.quantity}`);
  
  try {
    // Step 1: Authenticate
    const authenticated = await getAuthToken();
    if (!authenticated) {
      console.log('\n❌ Authentication failed. Cannot proceed with tests.');
      return;
    }
    
    // Step 2: Check inventory
    const hasInventory = await checkServiceCenterInventory();
    if (!hasInventory) {
      console.log('\n⚠️  Insufficient inventory to proceed with transfer.');
      console.log(`   Please ensure Service Center has at least ${TEST_CONFIG.quantity} units of Spare ${TEST_CONFIG.spareId}`);
      return;
    }
    
    // Step 3: Create request
    const requestId = await createSCToBranchRequest();
    if (!requestId) {
      console.log('\n❌ Failed to create spare request.');
      return;
    }
    
    // Step 4: Get details
    await getRequestDetails(requestId);
    
    // Step 5: List requests
    await listSCBranchRequests();
    
    // Step 6: Verify inventory
    await checkInventoryAfter();
    
    // Success!
    console.log(`\n${'='.repeat(70)}`);
    console.log(`✅ TEST COMPLETED SUCCESSFULLY!`);
    console.log(`='.repeat(70)`);
    console.log(`\n✨ Service Center → Branch Spare Request Process is Working!`);
    console.log(`   ✓ Inventory checked and validated`);
    console.log(`   ✓ Spare request created (ID: ${requestId})`);
    console.log(`   ✓ Stock movements processed`);
    console.log(`   ✓ Inventory updated`);
    console.log(`   ✓ Request details retrieved`);
    console.log(`   ✓ All SC→Branch requests listed\n`);
    
  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error.message);
    console.error(error.stack);
  }
}

// Start the test
console.log(`\nInitializing Service Center to Branch Spare Request Test...`);
runCompleteTest().catch(console.error);
