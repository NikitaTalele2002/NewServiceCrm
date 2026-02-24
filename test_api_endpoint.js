// Test the API endpoint
const http = require('http');

// Test with service center ID 4 (from our test data)
const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/technician-spare-requests',
  method: 'GET',
  headers: {
    'Authorization': 'Bearer test-token'  // Mock token
  }
};

console.log('🔍 Testing API: GET /api/technician-spare-requests\n');

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Headers:', res.headers['content-type']);
    console.log('\nResponse Body:');
    try {
      const response = JSON.parse(data);
      console.log(JSON.stringify(response, null, 2));
    } catch (e) {
      console.log(data);
    }

    process.exit(0);
  });
});

req.on('error', (error) => {
  console.error('Request error:', error);
  process.exit(1);
});

req.end();
