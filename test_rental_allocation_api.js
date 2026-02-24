import { sequelize } from './server/db.js';
import { QueryTypes } from 'sequelize';
import axios from 'axios';

const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJTQ1VzZXIiLCJjZW50ZXJJZCI6NCwicm9sZSI6InNlcnZpY2VfY2VudGVyIiwiaWF0IjoxNzcxMjM1NjU2fQ.oxbba2nqMYdAjWQmJK95SFbKzOf8a6l9AkEdFGFAx5s';

async function testEndpoint() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🧪 TESTING RENTAL ALLOCATION ENDPOINT');
    console.log('='.repeat(80) + '\n');

    // First check database
    console.log('📊 Checking database for pending requests...');
    const dbRequests = await sequelize.query(`
      SELECT TOP 10 
        r.request_id,
        r.spare_request_type,
        r.requested_source_id,
        r.requested_to_id,
        s.status_name,
        r.created_at
      FROM spare_requests r
      LEFT JOIN [status] s ON r.status_id = s.status_id
      WHERE r.status_id = (SELECT status_id FROM [status] WHERE status_name = 'pending')
      ORDER BY r.created_at DESC
    `, { type: QueryTypes.SELECT });

    console.log(`✅ Found ${dbRequests.length} pending requests in database`);
    if (dbRequests.length > 0) {
      console.log('📝 Sample requests:');
      dbRequests.slice(0, 3).forEach(r => {
        console.log(`   - REQ-${r.request_id}: Type=${r.spare_request_type}, Status=${r.status_name}`);
      });
    }

    // Test API endpoint
    console.log('\n📡 Testing API endpoint...');
    const apiUrl = 'http://localhost:5000/api/technician-sc-spare-requests/rental-allocation';
    console.log(`📍 URL: ${apiUrl}`);
    
    const response = await axios.get(apiUrl, {
      headers: {
        'Authorization': `Bearer ${TEST_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ API Response status:', response.status);
    console.log('✅ Response data:', JSON.stringify(response.data, null, 2));

    if (response.data.data && response.data.data.length > 0) {
      console.log(`\n✅ SUCCESS: API returned ${response.data.data.length} requests`);
    } else {
      console.log('\n⚠️ WARNING: API returned empty data array');
    }

    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
    process.exit(1);
  }
}

testEndpoint();
