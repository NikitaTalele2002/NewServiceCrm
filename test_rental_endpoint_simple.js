import axios from 'axios';

const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJTQ1VzZXIiLCJjZW50ZXJJZCI6NCwicm9sZSI6InNlcnZpY2VfY2VudGVyIiwiaWF0IjoxNzcxMjM1NjU2fQ.oxbba2nqMYdAjWQmJK95SFbKzOf8a6l9AkEdFGFAx5s';

async function testEndpoint() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🧪 TESTING RENTAL ALLOCATION ENDPOINT');
    console.log('='.repeat(80) + '\n');

    // Test API endpoint
    const apiUrl = 'http://localhost:5000/api/technician-sc-spare-requests/rental-allocation';
    console.log('📍 Testing endpoint:', apiUrl);
    console.log('🔑 Using test token for Service Center 4\n');
    
    const response = await axios.get(apiUrl, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ API Response status:', response.status);
    console.log('\n📋 Response Data:');
    console.log(JSON.stringify(response.data, null, 2));

    if (response.data.data && response.data.data.length > 0) {
      console.log(`\n✅ SUCCESS: API returned ${response.data.data.length} pending requests!`);
      console.log('\n📌 Sample Request:');
      const sample = response.data.data[0];
      console.log(`   - Request ID: ${sample.request_id || sample.requestId}`);
      console.log(`   - Technician: ${sample.technician_name || sample.technicianName}`);
      console.log(`   - Service Center: ${sample.service_center_name || sample.serviceCenterName}`);
      console.log(`   - Items: ${sample.items?.length || 0}`);
    } else {
      console.log('\n⚠️ API returned empty data array');
      console.log('   This could mean:');
      console.log('   - No pending requests in the database');
      console.log('   - Service center has no technicians assigned');
      console.log('   - Query is filtering out all results');
    }

    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else if (error.code === 'ECONNREFUSED') {
      console.error('❌ Cannot connect to server at http://localhost:5000');
      console.error('   Make sure the server is running!');
    }
    process.exit(1);
  }
}

testEndpoint();
