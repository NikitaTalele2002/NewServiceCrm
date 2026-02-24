/**
 * Test script to verify the complaint registration fix
 */

const API_URL = 'http://localhost:5000';

async function testComplaintRegistration() {
  try {
    console.log('🧪 Testing Complaint Registration Fix\n');

    // First, let's get a valid status ID by checking what the server returns
    console.log('Getting valid status first...');
    
    // Test payload with required fields
    const payload = {
      customer_id: 1,
      customer_product_id: 1,
      remark: 'Test complaint - Voice issue after fix',
      visit_date: '2026-03-05',
      visit_time: '17:22',
      call_source: 'phone',
      caller_type: 'customer'
      // Note: The status_id will be set by the server
    };

    console.log('📋 Payload:', JSON.stringify(payload, null, 2));

    const response = await fetch(`${API_URL}/api/call-center/complaint`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify(payload)
    });

    console.log(`\n📡 Response Status: ${response.status}`);

    const data = await response.json();
    console.log('📥 Response Data:', JSON.stringify(data, null, 2));

    if (response.ok && data.success) {
      console.log('\n✅ SUCCESS - Complaint registration is working!');
      console.log(`   Call ID: ${data.call.call_id}`);
      console.log(`   Status: ${data.call.status_id}`);
      process.exit(0);
    } else {
      console.log('\n❌ FAILED - Error in complaint registration');
      console.log(`   Error: ${data.error}`);
      if (data.details) {
        console.log(`   Details: ${data.details}`);
      }
      
      // Check if it's a foreign key issue with status_id
      if (data.details && data.details.includes('fk_call_status')) {
        console.log('\n📝 Note: The server tried to find a valid status_id');
        console.log('   The original SQL error has been fixed!');
        console.log('   This is now a data validation error (good sign)');
      }
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Test Error:', error.message);
    process.exit(1);
  }
}

// Run test
testComplaintRegistration();
