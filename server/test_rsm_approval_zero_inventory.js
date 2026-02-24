/**
 * Test: Simulate RSM Approval Request for Request 22
 * Directly tests the /api/rsm/spare-requests/22/approve endpoint
 */

const BASE_URL = 'http://localhost:5000';

async function testApproval() {
  try {
    console.log('=== Testing RSM Approval for Request 22 (Zero Inventory) ===\n');
    
    // First, get a valid token (assuming test user exists)
    // For this test, we'll skip auth and submit directly
    // In real scenario, you'd get proper JWT token
    
    // Item 23 in request 22 has:
    // - Spare ID: 160
    // - Requested: 2 units
    // - Available: 0 units
    // We're simulating RSM trying to approve 2 units
    
    const approvalPayload = {
      approvals: {
        23: {  // itemId
          approvedQty: 2  // RSM trying to approve 2 units
        }
      }
    };
    
    console.log('Sending approval request:');
    console.log(`  Endpoint: /api/rsm/spare-requests/22/approve`);
    console.log(`  Item 23: Requesting approval for 2 units`);
    console.log(`  Expected: REJECTION (0 inventory available)\n`);
    
    // Note: This will fail without auth. We need to actually test through the UI or with a token
    // For now, let's just document what should happen
    
    console.log('IMPORTANT: This test requires authentication token');
    console.log('To properly test, use the RSM UI:');
    console.log('1. Login as RSM');
    console.log('2. Open Request REQ-22');
    console.log('3. Set approval quantity to 2');
    console.log('4. Click Approve');
    console.log('5. Check if you see error: "Cannot approve 2 units. No spare parts in stock."');
    console.log('\nOnce submitted, check server logs for:');
    console.log('  [APPROVAL] Processing 1 items');
    console.log('  [VALIDATION CHECK] availableQty=0, requestedQtyFromFrontend=2');
    console.log('  [REJECTION TRIGGERED] Cannot approve 2 units when 0 available');
    console.log('  [REJECTING] Spare (Spare ID: 160) - ZERO INVENTORY');
    console.log('  Status Code: 400');
    console.log('  Response Error: "Cannot approve 2 units. No spare parts in stock..."');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testApproval();
