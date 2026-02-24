import http from 'http';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const API_HOST = 'localhost';
const API_PORT = 5000;
const SECRET_KEY = 'supersecret_jwt_key_change_me';

// Create a test token for a service center user
const testToken = jwt.sign(
  {
    id: 1,
    centerId: 1,  // Service center ID 1
    role: 'service_center'
  },
  SECRET_KEY,
  { expiresIn: '1h' }
);

console.log('🔑 Test Token:', testToken);

// Test payload
const testPayload = {
  items: [
    {
      productGroupId: 1,
      productId: 1,
      modelId: 1,
      sparePartId: 1,
      quantity: 5
    }
  ]
};

async function testOrderRequest() {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(testPayload);

    const options = {
      hostname: API_HOST,
      port: API_PORT,
      path: '/api/spare-requests',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Authorization': `Bearer ${testToken}`
      }
    };

    console.log('\n📤 Sending request to POST /api/spare-requests');
    console.log('Payload:', JSON.stringify(testPayload, null, 2));

    const req = http.request(options, (res) => {
      console.log('\n📥 Response Status:', res.statusCode, res.statusMessage);

      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const responseData = JSON.parse(data);
          console.log('Response Data:', JSON.stringify(responseData, null, 2));

          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log('\n✅ Order request created successfully!');
            console.log('Request ID:', responseData.request?.requestId);
          } else {
            console.log('\n❌ Error creating order request');
            console.log('Error Message:', responseData.message || responseData.error);
            if (responseData.stack) {
              console.log('Stack Trace:', responseData.stack);
            }
          }
          resolve();
        } catch (err) {
          console.error('❌ Failed to parse response:', err.message);
          console.error('Raw response:', data);
          reject(err);
        }
      });
    });

    req.on('error', (err) => {
      console.error('❌ Network error:', err.message);
      reject(err);
    });

    req.write(postData);
    req.end();
  });
}

// Wait a moment for server to be ready, then test
setTimeout(async () => {
  try {
    await testOrderRequest();
  } catch (err) {
    console.error('Test failed:', err.message);
  }
  process.exit(0);
}, 1000);
