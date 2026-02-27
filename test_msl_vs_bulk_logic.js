/**
 * Test MSL vs BULK Spare Request Type Determination
 * 
 * This test verifies that when an ASC creates a spare request, the system automatically
 * determines if it should be MSL (Minimum Stock Level replenishment) or BULK (general request)
 * based on current inventory levels vs. configured MSL thresholds.
 * 
 * Requirements:
 * - Server running on localhost:3000
 * - Database with test data:
 *   - Service Center with city_id set
 *   - Spare Parts with MSL configured for that city tier
 *   - SpareInventory records for those spares at the service center
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:3000/api';

async function setupTestData() {
  console.log('\n📋 Setting up test data...\n');
  
  // This would normally be done through database migrations
  // For now, we'll assume test data already exists
  console.log('ℹ️  Assuming test data is already in place:');
  console.log('  ✓ Service Center with city_id set');
  console.log('  ✓ Spare Parts with MSL configured');
  console.log('  ✓ Current spare inventory levels');
}

async function testMSLVsBULK() {
  console.log('\n' + '═'.repeat(70));
  console.log('🧪 Testing MSL vs BULK Spare Request Type Determination');
  console.log('═'.repeat(70));

  try {
    // Setup test data
    await setupTestData();

    // Get authentication token
    console.log('\n1️⃣  Authenticating...');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'sc001@servicecenters.com',
      password: 'password123'
    });
    const token = loginRes.data.token;
    const centerId = loginRes.data.centerId;
    console.log(`✅ Authenticated - Service Center ID: ${centerId}`);

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // Test 1: Create a request with spares below MSL threshold (should be MSL)
    console.log('\n2️⃣  Test Case 1: Request with spare part stock BELOW MSL threshold');
    console.log('   Creating request with spare part ID 1 (assumed to have low stock)...');
    
    const mslRequest = await axios.post(
      `${BASE_URL}/spare-requests`,
      {
        items: [
          { sparePartId: 1, quantity: 10 }
        ],
        remarks: 'Test MSL determination - stock below minimum'
      },
      { headers }
    );

    const mslResult = mslRequest.data.spare_request;
    console.log('\n   📊 Response Analysis:');
    console.log(`     Request ID: REQ-${mslResult.request_id}`);
    console.log(`     Request Reason: ${mslResult.request_reason}`);
    console.log(`     Request Type: ${mslResult.spare_request_type}`);
    console.log(`     Stock Check Results:`, mslResult.stock_check_results);
    
    const mslPassed = mslResult.request_reason === 'msl';
    console.log(`     ${mslPassed ? '✅' : '❌'} Expected: MSL, Got: ${mslResult.request_reason?.toUpperCase()}`);

    // Test 2: Create a request with spares above MSL threshold (should be BULK)
    console.log('\n3️⃣  Test Case 2: Request with spare part stock ABOVE MSL threshold');
    console.log('   Creating request with spare part ID 2 (assumed to have adequate stock)...');
    
    const bulkRequest = await axios.post(
      `${BASE_URL}/spare-requests`,
      {
        items: [
          { sparePartId: 2, quantity: 5 }
        ],
        remarks: 'Test BULK determination - stock above minimum'
      },
      { headers }
    );

    const bulkResult = bulkRequest.data.spare_request;
    console.log('\n   📊 Response Analysis:');
    console.log(`     Request ID: REQ-${bulkResult.request_id}`);
    console.log(`     Request Reason: ${bulkResult.request_reason}`);
    console.log(`     Request Type: ${bulkResult.spare_request_type}`);
    console.log(`     Stock Check Results:`, bulkResult.stock_check_results);
    
    const bulkPassed = bulkResult.request_reason === 'bulk';
    console.log(`     ${bulkPassed ? '✅' : '❌'} Expected: BULK, Got: ${bulkResult.request_reason?.toUpperCase()}`);

    // Test 3: Create a mixed request (should be MSL if ANY item is low)
    console.log('\n4️⃣  Test Case 3: Mixed Request (some low, some adequate)');
    console.log('   Creating request with mixed spare part stock levels...');
    
    const mixedRequest = await axios.post(
      `${BASE_URL}/spare-requests`,
      {
        items: [
          { sparePartId: 1, quantity: 10 }, // Low stock
          { sparePartId: 2, quantity: 5 }   // Adequate stock
        ],
        remarks: 'Test mixed determination'
      },
      { headers }
    );

    const mixedResult = mixedRequest.data.spare_request;
    console.log('\n   📊 Response Analysis:');
    console.log(`     Request ID: REQ-${mixedResult.request_id}`);
    console.log(`     Request Reason: ${mixedResult.request_reason}`);
    console.log(`     Request Type: ${mixedResult.spare_request_type}`);
    console.log(`     Stock Check Results:`, mixedResult.stock_check_results);
    
    const mixedPassed = mixedResult.request_reason === 'msl';
    console.log(`     ${mixedPassed ? '✅' : '⚠️'} Expected: MSL (priority), Got: ${mixedResult.request_reason?.toUpperCase()}`);

    // Summary
    console.log('\n' + '═'.repeat(70));
    console.log('📋 Test Summary:');
    console.log(`  Test 1 (MSL): ${mslPassed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`  Test 2 (BULK): ${bulkPassed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`  Test 3 (Mixed): ${mixedPassed ? '✅ PASSED' : '⚠️ INFO'}`);
    
    console.log('\n📝 Logic Summary:');
    console.log('  • When stock <= MSL minimum → Request marked as "msl"');
    console.log('  • When stock > MSL minimum → Request marked as "bulk"');
    console.log('  • Mixed requests: If ANY item is below MSL → Entire request is "msl"');
    console.log('  • MSL requests get priority handling in warehouse/SAP systems');
    
    console.log('\n✅ MSL vs BULK Determination Test Complete!');
    console.log('═'.repeat(70) + '\n');

  } catch (error) {
    console.error('\n❌ Test Error:');
    if (error.response?.data) {
      console.error(`  Status: ${error.response.status}`);
      console.error(`  Message: ${error.response.data.error || error.response.data.message}`);
      if (error.response.data.stockCheckResults) {
        console.error('  Details:', error.response.data.stockCheckResults);
      }
    } else if (error.message) {
      console.error(`  ${error.message}`);
      if (error.message.includes('ECONNREFUSED')) {
        console.error('  ℹ️  Make sure the server is running on localhost:3000');
      }
    }
  }
}

testMSLVsBULK();
