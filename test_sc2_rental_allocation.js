import axios from 'axios';

// Token for Service Center 2
const SC2_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJTQzIgVXNlciIsImNlbnRlcklkIjoyLCJyb2xlIjoic2VydmljZV9jZW50ZXIiLCJpYXQiOjE3NzEyMzU2NTZ9.2L9pq1kr3qXz-pR0mN8wF-sT1vU2yV3xW4aB5cD6eE7';

async function testEndpoint() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🧪 TESTING RENTAL ALLOCATION FOR SERVICE CENTER 2');
    console.log('='.repeat(80) + '\n');

    const apiUrl = 'http://localhost:5000/api/technician-sc-spare-requests/rental-allocation';
    console.log('📍 Testing endpoint:', apiUrl);
    console.log('🎯 Service Center: 2 (New Service Center)\n');
    
    const response = await axios.get(apiUrl, {
      headers: {
        'Authorization': `Bearer ${SC2_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ API Response status:', response.status);
    console.log('\n📋 Response Summary:');
    console.log(`   Total Requests: ${response.data.summary?.totalRequests || 0}`);
    console.log(`   Approvable: ${response.data.summary?.approvableRequests || 0}`);
    console.log(`   Requests Found: ${response.data.data?.length || 0}\n`);

    if (response.data.data && response.data.data.length > 0) {
      console.log('✅ SUCCESS! Requests are visible:\n');
      response.data.data.forEach((req, idx) => {
        console.log(`   ${idx + 1}. Request: ${req.requestNumber}`);
        console.log(`      Technician: ${req.technicianName}`);
        console.log(`      Items: ${req.items?.length || 0}`);
        console.log(`      Status: ${req.status}`);
        console.log(`      Created: ${req.createdAt}`);
      });
    } else {
      console.log('⚠️ No requests found');
    }

    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    if (error.response?.data) {
      console.error('Response:', error.response.data);
    }
    process.exit(1);
  }
}

testEndpoint();
