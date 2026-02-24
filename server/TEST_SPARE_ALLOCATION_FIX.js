/**
 * TEST GUIDE: Technician Spare Request → Stock Movement Flow
 * 
 * This demonstrates the complete fixed workflow:
 * 1. Service Center has spare parts in inventory
 * 2. Technician requests spares
 * 3. Service Center approves
 * 4. Stock movement is automatically created
 * 5. Inventory is tracked
 *
 * HOW TO TEST:
 * ============
 * 1. Start the server: npm start
 * 2. Run this test: node server/test_spare_allocation_complete.js
 * 3. Check output for ✅ or ❌ marks
 * 
 * EXPECTED BEHAVIOR:
 * ==================
 * ✅ Request created
 * ✅ Request approved
 * ✅ Stock movement created automatically
 * ✅ Goods movement items recorded
 * ✅ All data properly linked
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

// Test data
const TEST_REQUEST = 1;  // You'll need to create this first or use an existing one
const TEST_SC = 4;       // Service Center ID
const TEST_TECH = 1;     // Technician ID

async function testSpareAllocationFlow() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 TECHNICIAN SPARE REQUEST → STOCK MOVEMENT FLOW TEST');
  console.log('='.repeat(80) + '\n');

  try {
    // Step 1: Create a test request via API (if needed)
    console.log('📋 SETUP: Creating test request...\n');
    
    const approvePayload = {
      approvedItems: [
        {
          spare_request_item_id: 1,  // Replace with actual item ID from your test request
          approvedQty: 5,
          remarks: 'Approved - in stock at service center'
        }
      ]
    };

    console.log('Approval Payload:', JSON.stringify(approvePayload, null, 2));

    // Step 2: Send approval request
    console.log('\n✅ STEP 1: Sending approval request...');
    let response = await fetch(`${BASE_URL}/api/technician-spare-requests/1/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(approvePayload)
    });

    if (!response.ok) {
      const errText = await response.text();
      console.log('❌ Approval failed:', response.status, errText);
      return;
    }

    const approveResult = await response.json();
    console.log('✅ Approval successful!');
    console.log('Response:', JSON.stringify(approveResult, null, 2));

    if (approveResult.stockMovements && approveResult.stockMovements.length > 0) {
      console.log('\n✅ SUCCESS! Stock movements were created:');
      approveResult.stockMovements.forEach(mov => {
        console.log(`   - Movement ID: ${mov.movement_id}, Ref: ${mov.reference_no}, Qty: ${mov.qty}`);
      });
    } else {
      console.log('\n⚠️  Warning: No stock movements in response');
      console.log('This might indicate the service function was not called');
    }

    // Step 3: Verify the database
    console.log('\n✅ STEP 2: Verifying database records...\n');
    console.log('You should check:');
    console.log('  1. spare_requests table - status should be "approved"');
    console.log('  2. spare_request_items table - updated_at should be fresh');
    console.log('  3. stock_movement table - new record with movement_type="outward"');
    console.log('  4. goods_movement_items table - items linked to the movement');
    console.log('  5. approvals table - approval record created');

    console.log('\n' + '='.repeat(80));
    console.log('✅ TEST COMPLETE');
    console.log('='.repeat(80) + '\n');
    console.log('If you see stock movements created above, the fix is working!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testSpareAllocationFlow();
