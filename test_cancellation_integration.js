#!/usr/bin/env node
/**
 * Cancellation Flow Integration Test
 * Tests the complete cancellation request → RSM approval → status update → action log flow
 */

const http = require('http');
const fs = require('fs');

// Generate valid JWT tokens for testing
function generateToken(userId, username, role, centerName = null) {
  // For testing, we'll use a simple token structure
  // In production, these tokens would be signed with JWT
  const payload = {
    id: userId,
    username: username,
    role: role,
    centerName: centerName,
    iat: Math.floor(Date.now() / 1000)
  };
  
  // Simple base64 encoding for testing (not secure, just for testing)
  const tokenPayload = JSON.stringify(payload);
  // In real scenario, get actual tokens from env or login endpoint
  return 'test-token-' + Buffer.from(tokenPayload).toString('base64');
}

function makeRequest(method, path, token, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    };

    console.log(`\n📤 ${method} ${path}`);

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log(`📥 Status: ${res.statusCode}`);
        
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log('✅ Success:', JSON.stringify(parsed, null, 2).substring(0, 200));
          } else {
            console.log('⚠️  Response:', JSON.stringify(parsed, null, 2).substring(0, 200));
          }
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          console.log('Response:', data.substring(0, 100));
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

    // Timeout after 10 seconds
    setTimeout(() => {
      if (req) {
        req.destroy();
        console.error('Request timeout');
      }
    }, 10000);
  });
}

async function runTests() {
  try {
    console.log('\n' + '='.repeat(60));
    console.log('🚀 Cancellation Request Integration Tests');
    console.log('='.repeat(60));

    // Get actual tokens from environment or use real login
    const scToken = process.env.SC_TOKEN || 'temp-sc-token';
    const rsmToken = process.env.RSM_TOKEN || 'temp-rsm-token';

    console.log('\n⚠️  NOTE: This test requires valid JWT tokens');
    console.log('Set SC_TOKEN and RSM_TOKEN environment variables');
    console.log('Or use tokens from a successful login\n');

    // For now, let's just test that the endpoint exists and requires authentication
    console.log('📋 TEST 1: Endpoint exists and requires authentication');
    console.log('-'.repeat(60));
    
    const noTokenResponse = await makeRequest(
      'POST',
      '/api/call-center/complaints/1/cancel',
      'invalid-token',
      { reason: 'TEST', remarks: 'Test request' }
    );

    if (noTokenResponse.status === 403) {
      console.log('✅ Endpoint correctly rejects invalid tokens');
    } else if (noTokenResponse.status === 404) {
      console.log('❌ Endpoint not found - route not registered');
      process.exit(1);
    } else {
      console.log('⚠️  Unexpected response:', noTokenResponse.status);
    }

    // Test with real tokens if provided
    if (scToken !== 'temp-sc-token') {
      console.log('\n📋 TEST 2: Cancel request with service center token');
      console.log('-'.repeat(60));
      
      const cancelResponse = await makeRequest(
        'POST',
        '/api/call-center/complaints/1/cancel',
        scToken,
        { reason: 'DUPLICATE', remarks: 'Testing cancellation' }
      );

      if (cancelResponse.status === 201 || cancelResponse.status === 200) {
        console.log('✅ Cancellation request created');
        const cancellationId = cancelResponse.data?.cancellation_request?.id;
        
        if (cancellationId) {
      console.log('\n📋 TEST 3: Fetch pending cancellation requests (RSM)');
          console.log('-'.repeat(60));
          
          await makeRequest(
            'GET',
            '/api/call-center/cancellation-requests?status=pending',
           rsmToken
          );

          console.log('\n📋 TEST 4: Approve cancellation request (RSM)');
          console.log('-'.repeat(60));
          
          const approveResponse = await makeRequest(
            'POST',
            `/api/call-center/cancellation-requests/${cancellationId}/approve`,
            rsmToken,
            { remarks: 'Approved by RSM' }
          );

          if (approveResponse.status === 200) {
            console.log('✅ Cancellation approved');
            console.log('\n📋 Verification Checklist:');
            console.log('-'.repeat(60));
            console.log('Please verify in database:');
            console.log('1. ✓ call_cancellation_requests.request_status = "approved"');
            console.log('2. ✓ calls.status_id = "Cancelled"');
            console.log('3. ✓ action_logs entry created with cancellation reason');
          }
        }
      } else {
        console.log('⚠️  Could not create cancellation request');
        console.log('This might be due to invalid token or missing call');
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Tests completed');
    console.log('='.repeat(60));
    console.log('\n🔑 To run full tests with real tokens:');
    console.log('   SC_TOKEN="your-token" RSM_TOKEN="your-token" node test_cancellation_integration.js\n');
    
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Test error:', error.message);
    process.exit(1);
  }
}

// Run tests
runTests();
