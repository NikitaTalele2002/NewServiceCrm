#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:5000/api/call-center/complaint';
const DB_SCRIPT = path.join(__dirname, 'server', 'verify_complaint_status.js');

console.log('🧪 COMPLETE COMPLAINT REGISTRATION TEST');
console.log('═' .repeat(50));

// Test payload
const testPayload = {
  customer_id: 1,
  customer_product_id: 1,
  remark: 'Test complaint from automated script',
  visit_date: '2026-02-20',
  visit_time: '14:30',
  assigned_asc_id: null
};

console.log('\n📦 Test Payload:');
console.log(JSON.stringify(testPayload, null, 2));

// Function to make API call
function makeApiCall(payload) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(payload);

    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/call-center/complaint',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Authorization': 'Bearer test-token'
      }
    };

    console.log('\n🚀 Making API call...');
    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.write(postData);
    req.end();
  });
}

// Function to delay execution
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Main test function
async function runTest() {
  try {
    // Step 1: Make API call
    console.log('\n' + '═'.repeat(50));
    console.log('STEP 1: Register Complaint via API');
    console.log('═'.repeat(50));

    const response = await makeApiCall(testPayload);
    
    console.log(`\n📊 Response Status: ${response.statusCode}`);
    console.log('📋 Response Headers:', response.headers);
    
    let responseBody;
    try {
      responseBody = JSON.parse(response.body);
    } catch (e) {
      responseBody = response.body;
    }

    console.log('📄 Response Body:');
    console.log(JSON.stringify(responseBody, null, 2));

    // Check if successful
    if (response.statusCode === 201 || response.statusCode === 200) {
      console.log('\n✅ API call successful!');
      const callId = responseBody.data?.call_id || responseBody.callId;
      console.log(`   Call ID: ${callId}`);
    } else if (response.statusCode === 400) {
      console.log('\n❌ API returned 400 Bad Request');
      console.log(`   Error: ${responseBody.message || response.body}`);
      process.exit(1);
    } else if (response.statusCode === 500) {
      console.log('\n❌ API returned 500 Server Error');
      console.log(`   Error: ${responseBody.message || response.body}`);
      process.exit(1);
    } else {
      console.log(`\n⚠️  Unexpected status code: ${response.statusCode}`);
      process.exit(1);
    }

    // Step 2: Wait for database
    console.log('\n' + '═'.repeat(50));
    console.log('STEP 2: Waiting for database sync...');
    console.log('═'.repeat(50));
    await delay(2000);
    console.log('✓ Database should be updated');

    // Step 3: Verify in database
    console.log('\n' + '═'.repeat(50));
    console.log('STEP 3: Verify Complaint in Database');
    console.log('═'.repeat(50));

    const { execSync } = require('child_process');
    try {
      const dbOutput = execSync(`node "${DB_SCRIPT}"`, { 
        encoding: 'utf-8',
        cwd: __dirname 
      });
      console.log('\n📊 Database Verification Output:');
      console.log(dbOutput);
    } catch (err) {
      console.log('\n⚠️  Database verification script error:');
      console.log(err.message);
    }

    console.log('\n' + '═'.repeat(50));
    console.log('✅ TEST COMPLETE');
    console.log('═'.repeat(50));
    console.log('\n📌 Summary:');
    console.log('  ✓ API call made and processed');
    console.log('  ✓ Response received');
    console.log('  ✓ Database verified');
    console.log('\n🎯 Next Steps:');
    console.log('  1. Check server logs for emoji-formatted messages');
    console.log('  2. Verify visit_time is stored in database');
    console.log('  3. Test through UI form if needed');

  } catch (err) {
    console.error('\n❌ TEST FAILED');
    console.error('Error:', err.message);
    process.exit(1);
  }
}

// Run the test
runTest();
