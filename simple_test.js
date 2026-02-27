#!/usr/bin/env node
const http = require('http');

// Simple test - POST to cancellation endpoint
const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/call-center/complaints/1/cancel',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer test-token'
  }
};

console.log(`Testing: POST ${options.hostname}:${options.port}${options.path}\n`);

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Headers:', res.headers);
    console.log('\nResponse:');
    try {
      const parsed = JSON.parse(data);
      console.log(JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log(data);
    }

    process.exit(0);
  });
});

req.on('error', (error) => {
  console.error('Error:', error.message);
  process.exit(1);
});

req.write(JSON.stringify({
  reason: 'TEST',
  remarks: 'Testing cancellation endpoint'
}));

req.end();

// Timeout after 5 seconds
setTimeout(() => {
  console.error('Request timeout');
  process.exit(1);
}, 5000);
