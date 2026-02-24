const http = require('http');

/**
 * Direct HTTP test for complaint registration endpoint
 * Tests the POST /api/call-center/complaint endpoint
 * 
 * Usage: node test_complaint_direct.js
 */

const testData = {
  customer_id: 1,
  customer_product_id: 1,
  remark: 'Motor Not working - Test Complaint',
  visit_date: '2026-02-12',
  visit_time: '16:06',
  assigned_asc_id: null,
  created_by: null
};

console.log('📋 Complaint Registration Direct API Test');
console.log('=====================================');
console.log('Endpoint: POST http://localhost:5000/api/call-center/complaint');
console.log('Payload:', JSON.stringify(testData, null, 2));
console.log('=====================================\n');

const postData = JSON.stringify(testData);

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/call-center/complaint',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
  }
};

const req = http.request(options, (res) => {
  console.log(`📊 Response Status: ${res.statusCode}`);
  console.log(`📊 Response Headers:`, res.headers);
  console.log('\n📥 Response Body:');
  
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log(JSON.stringify(parsed, null, 2));
      
      if (res.statusCode === 200 || res.statusCode === 201) {
        console.log('\n✅ SUCCESS - Complaint registered!');
        if (parsed.call && parsed.call.call_id) {
          console.log(`✅ Call ID: ${parsed.call.call_id}`);
        }
        process.exit(0);
      } else {
        console.log('\n❌ FAILURE - Error response received');
        console.log(`Error: ${parsed.error || 'Unknown error'}`);
        console.log(`Details: ${parsed.details || 'No details provided'}`);
        process.exit(1);
      }
    } catch (e) {
      console.log('Raw response (parse error):');
      console.log(data);
      console.log('\n❌ Failed to parse JSON response');
      process.exit(1);
    }
  });
});

req.on('error', (e) => {
  console.error(`❌ Request Error: ${e.message}`);
  if (e.code === 'ECONNREFUSED') {
    console.error('⚠️  Cannot connect to server. Is the server running on port 5000?');
    console.error('   Start the server with: npm run dev (from server folder) or npm start');
  }
  process.exit(1);
});

console.log('📤 Sending POST request...\n');
req.write(postData);
req.end();
