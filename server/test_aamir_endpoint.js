/**
 * Test RSM Aamir Login and Return Requests Endpoint
 */

import http from 'http';
import https from 'https';

function makeRequest(url, options) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    const req = protocol.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data
          });
        }
      });
    });
    
    req.on('error', reject);
    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function testAamirFlow() {
  try {
    console.log('🔐 Step 1: Login as RSM-Aamir-1\n');

    // Login
    const loginRes = await makeRequest('http://localhost:5000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'RSM-Aamir-1',
        password: '123'
      })
    });

    console.log('Login Response Status:', loginRes.status);
    const loginData = JSON.parse(loginRes.body);
    console.log('Login Response:', JSON.stringify(loginData, null, 2));

    if (!loginData.token) {
      console.log('❌ No token received!');
      process.exit(1);
    }

    const token = loginData.token;
    console.log('✅ Token:', token.substring(0, 50) + '...\n');

    // Decode token to see payload
    const parts = token.split('.');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    console.log('Token Payload:', JSON.stringify(payload, null, 2));

    console.log('\n📍 Step 2: Get Assigned Plants\n');

    // Get plants
    const plantsRes = await makeRequest('http://localhost:5000/api/branch/assigned-plants', {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Plants Response Status:', plantsRes.status);
    const plantsData = JSON.parse(plantsRes.body);
    console.log('Plants:', JSON.stringify(plantsData, null, 2));

    if (!plantsData.plants || plantsData.plants.length === 0) {
      console.log('❌ No plants assigned!');
      process.exit(1);
    }

    const plantId = plantsData.plants[0].plant_id;
    console.log(`✅ Using Plant ID: ${plantId}\n`);

    console.log('📦 Step 3: Get Pending Return Requests\n');

    // Get pending returns
    const returnsRes = await makeRequest(`http://localhost:5000/api/spare-returns/pending-approval?plant_id=${plantId}`, {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('Pending Returns Response Status:', returnsRes.status);
    const returnsData = JSON.parse(returnsRes.body);
    console.log('Pending Returns:', JSON.stringify(returnsData, null, 2));

    if (returnsData.success && returnsData.count > 0) {
      console.log(`\n✅ SUCCESS: Found ${returnsData.count} pending return request(s)!`);
    } else {
      console.log(`\n⚠️  No pending returns found, but API is working!`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
}

testAamirFlow();
