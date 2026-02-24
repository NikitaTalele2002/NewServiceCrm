#!/usr/bin/env node
import http from 'http';

// Generate test token for SC 1
const generateToken = async () => {
  const JWT_SECRET = 'supersecret_jwt_key_change_me';
  // This would need jwt library, so let's use a pre-generated test token
  // For testing, we'll construct the token manually
  const now = Math.floor(Date.now() / 1000);
  
  // This is a hand-crafted token for SC 1, role service_center
  // You would normally use: jwt.sign({id: 1, centerId: 1, role: 'service_center'}, JWT_SECRET)
  // For now, we'll make a simpler test
  return null;
};

const makeRequest = (hostname, path, token) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: hostname,
      port: 5000,
      path: path,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve({
          status: res.statusCode,
          data: data ? JSON.parse(data) : null
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
};

async function test() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🧪 TESTING API DIRECTLY');
    console.log('='.repeat(80) + '\n');

    // First get a test token
    console.log('1️⃣ Getting test token...');
    const tokenRes = await makeRequest('localhost', '/api/auth/test-token?centerId=1', null);
    const token = tokenRes.data?.token;
    
    if (!token) {
      console.error('❌ Could not get token');
      process.exit(1);
    }
    console.log('✅ Got token\n');

    // Call rental allocation endpoint
    console.log('2️⃣ Calling /api/technician-sc-spare-requests/rental-allocation...');
    const response = await makeRequest('localhost', '/api/technician-sc-spare-requests/rental-allocation', token);
    
    console.log(`Status: ${response.status}\n`);

    if (response.status !== 200) {
      console.error('❌ Request failed!');
      console.error(response.data);
      process.exit(1);
    }

    const data = response.data;
    console.log(`✅ Got response with ${data.data.length} requests\n`);

    // Find Request 22
    const req22 = data.data.find(r => r.requestId === 22);
    if (!req22) {
      console.error('❌ Request 22 not found!');
      console.log('Available request IDs:', data.data.map(r => r.requestId));
      process.exit(1);
    }

    console.log('✅ Found Request 22');
    console.log(`   Technician: ${req22.technicianName}`);
    console.log(`   Items count: ${Array.isArray(req22.items) ? req22.items.length : 'NOT ARRAY'}`);
    console.log();

    if (!req22.items || req22.items.length === 0) {
      console.error('⚠️  WARNING: Items array is empty!');
    } else {
      console.log('Items preview:');
      req22.items.slice(0, 2).forEach((item, i) => {
        console.log(`  ${i + 1}. partCode="${item.partCode}", qty=${item.requestedQty}`);
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log('Full Request 22 object:');
    console.log('='.repeat(80));
    console.log(JSON.stringify(req22, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
}

test();
