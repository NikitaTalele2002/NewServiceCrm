#!/usr/bin/env node
const http = require('http');

// Test tokens - update these based on your actual user data
const SC_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJzYzEiLCJyb2xlIjoic2VydmljZV9jZW50ZXIiLCJjZW50ZXJOYW1lIjoiIiwiY2VudGVySWQiOjEsImlhdCI6MTcwOTAzOTIwM30.test';
const RSM_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwidXNlcm5hbWUiOiJyc20xIiwicm9sZSI6InJzbSIsImNlbnRlck5hbWUiOiIiLCJpYXQiOjE3MDkwMzkyMDN9.test';

const BASE_URL = 'http://localhost:5000/api';

function makeRequest(method, path, token, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    };

    console.log(`\n📤 ${method} ${url.toString()}`);
    console.log('🔑 Token Role:', token.includes('service_center') ? 'Service Center' : 'RSM');
    console.log('📍 Path:', options.path);

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log(`📥 Status: ${res.statusCode}`);
        
        try {
          const parsed = JSON.parse(data);
          console.log('✅ Response:', JSON.stringify(parsed, null, 2));
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          console.log('❌ Response (not JSON):', data);
          resolve({ status: res.statusCode, data: data });
        }
      });
    });

    req.on('error', (error) => {
      console.error('❌ Request Error:', error.message);
      reject(error);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function runTests() {
  try {
    console.log('🚀 Starting Cancellation Flow Tests\n');
    console.log('=' .repeat(50));

    // Test 1: Service center requests cancellation
    console.log('\n📋 TEST 1: Service Center Requests Cancellation');
    console.log('-' .repeat(50));
    
    const cancelResponse = await makeRequest(
      'POST',
      'call-center/complaints/1/cancel',  // <-- Changed: removed leading /
      SC_TOKEN,
      {
        reason: 'DUPLICATE',
        remarks: 'Duplicate complaint request'
      }
    );

    if (cancelResponse.status === 201 || cancelResponse.status === 200) {
      console.log('✅ Cancellation request created successfully');
      const cancellationId = cancelResponse.data?.cancellation_request?.id;
      
      if (cancellationId) {
        // Test 2: RSM fetches pending requests
        console.log('\n📋 TEST 2: RSM Fetches Pending Cancellation Requests');
        console.log('-' .repeat(50));
        
        await makeRequest('GET', 'call-center/cancellation-requests?status=pending', RSM_TOKEN);  // <-- Changed

        // Test 3: RSM approves cancellation
        console.log('\n📋 TEST 3: RSM Approves Cancellation Request');
        console.log('-' .repeat(50));
        
        const approveResponse = await makeRequest(
          'POST',
          `call-center/cancellation-requests/${cancellationId}/approve`,  // <-- Changed
          RSM_TOKEN,
          { remarks: 'Approved - duplicate resolved' }
        );

        if (approveResponse.status === 200) {
          console.log('✅ Cancellation approved successfully');
          
          // Test 4: Verify call status updated
          console.log('\n📋 TEST 4: Verify Call Status and Action Log');
          console.log('-' .repeat(50));
          console.log('Manual verification needed:');
          console.log('- Check calls table for call_id=1, status_id should be "Cancelled"');
          console.log('- Check action_logs table for new entry');
        }
      }
    } else {
      console.log('❌ Failed to create cancellation request');
    }

    console.log('\n' + '='.repeat(50));
    console.log('✅ Tests completed');
    process.exit(0);

  } catch (error) {
    console.error('❌ Test error:', error);
    process.exit(1);
  }
}

// Run tests with a delay to ensure server is ready
setTimeout(runTests, 2000);
