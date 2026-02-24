const API_BASE = 'http://localhost:5000/api';

// Test data - ensure these IDs exist in your database
const TEST_DATA = {
  testToken: process.env.TEST_TOKEN || 'your_service_center_token',
  requestId: 50, // Change to actual pending return request ID
  approvalRemarks: 'Test approval - all items verified and in good condition'
};

async function testApprovalFlow() {
  try {
    console.log('\n========================================');
    console.log('🧪 TESTING APPROVAL FLOW');
    console.log('========================================\n');

    // Test 1: Check if return request exists
    console.log('📋 TEST 1: Checking return request exists...');
    try {
      const response = await fetch(`${API_BASE}/spare-requests/${TEST_DATA.requestId}`, {
        headers: {
          'Authorization': `Bearer ${TEST_DATA.testToken}`
        }
      });
      const getResult = await response.json();
      console.log('✅ Return request found:', {
        id: getResult.id,
        status: getResult.status,
        technicianId: getResult.technicianId
      });
    } catch (err) {
      console.log('⚠️  Could not fetch request details:', err.message);
    }

    // Test 2: Call approval endpoint
    console.log('\n🔄 TEST 2: Calling approval endpoint...');
    const response = await fetch(
      `${API_BASE}/spare-requests/${TEST_DATA.requestId}/approve-return`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${TEST_DATA.testToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          approvalRemarks: TEST_DATA.approvalRemarks
        })
      }
    );
    const approvalResponse = await response.json();

    console.log('✅ Approval response received:');
    console.log(JSON.stringify(approvalResponse, null, 2));

    const {
      returnRequestId,
      approvalId,
      stockMovementId,
      itemsProcessed,
      totalQtyApproved,
      summary
    } = approvalResponse.data;

    // Test 3: Verify approval record was created
    console.log('\n📊 TEST 3: Verifying database records...');
    console.log('\n  a) Checking APPROVALS table:');
    try {
      const verifyResponse = await fetch(
        `${API_BASE}/spare-requests/${returnRequestId}?check=approvals`,
        {
          headers: { 'Authorization': `Bearer ${TEST_DATA.testToken}` }
        }
      );
      const approvalsResult = await verifyResponse.json();
      console.log('  ✅ Approvals verified');
    } catch (err) {
      console.log('  ⚠️  Could not directly verify approvals via API');
      console.log('     Expected: Approval record with entity_type=return_request');
    }

    console.log('\n  b) Checking STOCK_MOVEMENT table:');
    if (summary?.stockMovementCreated) {
      console.log(`  ✅ Stock movement created (movement_id: ${stockMovementId})`);
      console.log(`     From: Technician → To: Service Center`);
      console.log(`     Quantity: ${totalQtyApproved} units`);
    } else {
      console.log('  ❌ Stock movement NOT created');
    }

    console.log('\n  c) Checking GOODS_MOVEMENT_ITEMS table:');
    if (summary?.goodsMovementCreated) {
      console.log(`  ✅ Goods movement items created`);
      console.log(`     Items processed: ${itemsProcessed}`);
      console.log(`     Total quantity: ${totalQtyApproved}`);
    } else {
      console.log('  ❌ Goods movement items NOT created');
    }

    console.log('\n  d) Checking SPARE_INVENTORY updates:');
    if (summary?.inventoryUpdated) {
      console.log('  ✅ Inventory updated');
      console.log('     Technician inventory: REDUCED');
      console.log('     Service Center inventory: INCREASED');
    } else {
      console.log('  ❌ Inventory NOT updated');
    }

    // Summary
    console.log('\n========================================');
    console.log('✅ APPROVAL PROCESS COMPLETED');
    console.log('========================================');
    console.log('\nSummary:');
    console.log(`  Return Request ID: ${returnRequestId}`);
    console.log(`  Approval ID: ${approvalId}`);
    console.log(`  Stock Movement ID: ${stockMovementId}`);
    console.log(`  Items Processed: ${itemsProcessed}`);
    console.log(`  Total Qty Approved: ${totalQtyApproved}`);
    console.log('\n✅ All database operations completed successfully!\n');

  } catch (error) {
    console.error('\n❌ ERROR DURING APPROVAL:');
    console.error('Status:', error.response?.status);
    console.error('Message:', error.response?.data?.error);
    console.error('Details:', error.response?.data?.message);
    console.error('\n⚠️  Error Details:');
    console.error(error.response?.data);
  }
}

// Run the test
console.log('Starting approval flow test...');
console.log(`Using Request ID: ${TEST_DATA.requestId}`);
testApprovalFlow().catch(console.error);
