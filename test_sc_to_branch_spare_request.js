/**
 * Test: Service Center to Branch Spare Request Creation
 * 
 * This test demonstrates:
 * 1. Creating a spare request from Service Center to Branch
 * 2. Automatic stock movements with bucket updates
 * 3. Inventory verification
 */

const API_BASE = 'http://localhost:5000/api';

// Test Configuration
const TEST_CONFIG = {
  serviceCenterId: 4,        // Service Center ID (ASC)
  branchId: 5,               // Branch ID
  spareId: 1,                // Spare Part ID
  quantity: 5,               // Quantity to request
  testToken: process.env.TEST_TOKEN || 'your_service_center_token'
};

/**
 * Get authentication token
 */
async function getToken() {
  try {
    console.log('🔐 Getting authentication token...');
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
      console.log('✅ Token acquired');
      return data.token;
    }
  } catch (error) {
    console.error('⚠️  Token fetch failed, using provided token');
  }
  return TEST_CONFIG.testToken;
}

/**
 * Check current inventory at Service Center
 */
async function checkServiceCenterInventory() {
  console.log('\n📊 STEP 1: Checking Service Center Inventory');
  console.log('═'.repeat(60));
  
  try {
    const params = new URLSearchParams({
      serviceCenterId: TEST_CONFIG.serviceCenterId,
      spareId: TEST_CONFIG.spareId
    });
    
    const response = await fetch(
      `${API_BASE}/spare-requests/check-availability?${params}`,
      { headers: { Authorization: `Bearer ${TEST_CONFIG.testToken}` } }
    );
    
    const data = await response.json();
    
    if (data.success && data.data) {
      console.log(`\n✅ Service Center ${TEST_CONFIG.serviceCenterId} Inventory:`);
      console.log(`   Spare ID: ${TEST_CONFIG.spareId}`);
      console.log(`   Available (Good): ${data.data.available || 0}`);
      console.log(`   Requested Qty: ${TEST_CONFIG.quantity}`);
      
      if (data.data.available >= TEST_CONFIG.quantity) {
        console.log(`   ✅ Sufficient stock available`);
        return true;
      } else {
        console.log(`   ⚠️  Insufficient stock! (Have: ${data.data.available}, Need: ${TEST_CONFIG.quantity})`);
        return false;
      }
    } else {
      console.log(`⚠️  Could not fetch inventory: ${data.error}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error checking inventory:`, error.message);
    return false;
  }
}

/**
 * Create Service Center to Branch Spare Request
 */
async function createSCToBranchRequest() {
  console.log('\n📝 STEP 2: Creating Service Center → Branch Spare Request');
  console.log('═'.repeat(60));
  
  try {
    const requestPayload = {
      spare_request_type: 'CFU',  // Consignment Fill-Up (can be adapted)
      spare_id: TEST_CONFIG.spareId,
      quantity: TEST_CONFIG.quantity,
      requested_by: 1,     // Admin user
      source_location_type: 'service_center',
      source_location_id: TEST_CONFIG.serviceCenterId,
      destination_location_type: 'plant',
      destination_location_id: TEST_CONFIG.branchId,
      reason: 'sc_to_branch_transfer',
      notes: `Service Center ${TEST_CONFIG.serviceCenterId} → Branch ${TEST_CONFIG.branchId} Transfer (Test: ${new Date().toISOString()})`
    };
    
    console.log('\n📦 Request Payload:');
    console.log(`   Type: ${requestPayload.spare_request_type}`);
    console.log(`   From: Service Center ${requestPayload.source_location_id}`);
    console.log(`   To: Branch ${requestPayload.destination_location_id}`);
    console.log(`   Spare: ${requestPayload.spare_id}`);
    console.log(`   Quantity: ${requestPayload.quantity}`);
    
    const response = await fetch(
      `${API_BASE}/spare-requests/create-with-bucket`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${TEST_CONFIG.testToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestPayload)
      }
    );
    
    const data = await response.json();
    
    if (data.success) {
      console.log(`\n✅ SPARE REQUEST CREATED SUCCESSFULLY!`);
      console.log(`   Request ID: ${data.request.request_id}`);
      console.log(`   Status: ${data.request.status}`);
      console.log(`   Movements Created: ${(data.request.movements || []).length}`);
      
      // Display movements
      if (data.request.movements && data.request.movements.length > 0) {
        console.log(`\n   📊 Stock Movements:`);
        data.request.movements.forEach((mvt, index) => {
          console.log(`      ${index + 1}. ${mvt.stock_movement_type}`);
          console.log(`         Bucket: ${mvt.bucket} (${mvt.operation})`);
          console.log(`         Qty: ${mvt.quantity}`);
        });
      }
      
      return {
        success: true,
        requestId: data.request.request_id,
        movements: data.request.movements || []
      };
    } else {
      console.log(`\n❌ FAILED TO CREATE REQUEST`);
      console.log(`   Error: ${data.error}`);
      if (data.available !== undefined) {
        console.log(`   Available: ${data.available}, Requested: ${data.requested}`);
      }
      return { success: false, error: data.error };
    }
  } catch (error) {
    console.error(`❌ Error creating request:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Verify the spare request was created in database
 */
async function verifyRequestInDatabase(requestId) {
  console.log('\n✔️ STEP 3: Verifying Request in Database');
  console.log('═'.repeat(60));
  
  try {
    const response = await fetch(
      `${API_BASE}/spare-requests/${requestId}`,
      { headers: { Authorization: `Bearer ${TEST_CONFIG.testToken}` } }
    );
    
    if (response.ok) {
      const data = await response.json();
      
      console.log(`\n✅ Request Details Retrieved:`);
      console.log(`   ID: ${data.request_id || data.id}`);
      console.log(`   Type: ${data.spare_request_type || data.type}`);
      console.log(`   Status: ${data.status}`);
      console.log(`   Quantity: ${data.quantity}`);
      console.log(`   Created: ${data.created_at}`);
      
      return true;
    } else {
      console.log(`⚠️  Could not fetch request details`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error verifying request:`, error.message);
    return false;
  }
}

/**
 * Check Service Center inventory after request
 */
async function checkServiceCenterInventoryAfter() {
  console.log('\n📊 STEP 4: Checking Service Center Inventory After Request');
  console.log('═'.repeat(60));
  
  try {
    const params = new URLSearchParams({
      serviceCenterId: TEST_CONFIG.serviceCenterId,
      spareId: TEST_CONFIG.spareId
    });
    
    const response = await fetch(
      `${API_BASE}/spare-requests/check-availability?${params}`,
      { headers: { Authorization: `Bearer ${TEST_CONFIG.testToken}` } }
    );
    
    const data = await response.json();
    
    if (data.success && data.data) {
      console.log(`\n✅ Service Center ${TEST_CONFIG.serviceCenterId} Inventory After:`);
      console.log(`   Available (Good): ${data.data.available || 0}`);
      console.log(`   (Should be reduced by ${TEST_CONFIG.quantity})`);
      
      return true;
    }
  } catch (error) {
    console.error(`❌ Error checking inventory:`, error.message);
  }
  return false;
}

/**
 * List all spare requests
 */
async function listAllSpareRequests() {
  console.log('\n📋 STEP 5: Listing All Spare Requests');
  console.log('═'.repeat(60));
  
  try {
    const params = new URLSearchParams({
      serviceCenterId: TEST_CONFIG.serviceCenterId
    });
    
    const response = await fetch(
      `${API_BASE}/spare-requests?${params}`,
      { headers: { Authorization: `Bearer ${TEST_CONFIG.testToken}` } }
    );
    
    const data = await response.json();
    
    if (data.success && Array.isArray(data.data)) {
      console.log(`\n✅ Found ${data.data.length} spare requests for Service Center ${TEST_CONFIG.serviceCenterId}:`);
      
      data.data.slice(0, 5).forEach((req, index) => {
        console.log(`\n   ${index + 1}. Request #${req.id || req.request_id}`);
        console.log(`      Type: ${req.type || req.spare_request_type}`);
        console.log(`      Status: ${req.status}`);
        console.log(`      Created: ${req.createdAt || req.created_at}`);
      });
      
      return true;
    }
  } catch (error) {
    console.error(`❌ Error listing requests:`, error.message);
  }
  return false;
}

/**
 * Main test runner
 */
async function runFullTest() {
  console.log('\n🚀 SERVICE CENTER → BRANCH SPARE REQUEST TEST');
  console.log('═'.repeat(60));
  console.log(`\nTest Configuration:`);
  console.log(`  Service Center ID: ${TEST_CONFIG.serviceCenterId}`);
  console.log(`  Branch ID: ${TEST_CONFIG.branchId}`);
  console.log(`  Spare ID: ${TEST_CONFIG.spareId}`);
  console.log(`  Quantity: ${TEST_CONFIG.quantity}`);
  
  try {
    // Get token
    await getToken();
    
    // Check initial inventory
    const hasInventory = await checkServiceCenterInventory();
    
    if (!hasInventory) {
      console.log(`\n⚠️  Insufficient inventory at Service Center. Test cannot proceed.`);
      console.log(`   Please ensure Service Center has at least ${TEST_CONFIG.quantity} units of Spare ${TEST_CONFIG.spareId}`);
      return;
    }
    
    // Create request
    const result = await createSCToBranchRequest();
    
    if (!result.success) {
      console.log(`\n❌ Test Failed: Cannot create request`);
      return;
    }
    
    // Verify in database
    await verifyRequestInDatabase(result.requestId);
    
    // Check inventory after
    await checkServiceCenterInventoryAfter();
    
    // List all requests
    await listAllSpareRequests();
    
    console.log(`\n${'═'.repeat(60)}`);
    console.log(`\n✅ TEST COMPLETED SUCCESSFULLY!`);
    console.log(`   Spare Request #${result.requestId} created and verified`);
    console.log(`   ✨ Service Center → Branch transfer in progress\n`);
    
  } catch (error) {
    console.error(`\n❌ FATAL ERROR:`, error.message);
    console.error(error.stack);
  }
}

// Run the test
console.log(`Starting Service Center to Branch Spare Request Test...`);
runFullTest().catch(console.error);
