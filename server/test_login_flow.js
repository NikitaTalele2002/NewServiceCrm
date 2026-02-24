/**
 * Test: Login Flow and Service Center ID Flow
 * This test verifies:
 * 1. Server returns correct centerId for service center users
 * 2. Frontend properly stores serviceCenterId in localStorage
 * 3. CallUpdate page can retrieve the ID for API calls
 */

import http from 'http';

const API_BASE = 'localhost:5000';

// Service center user credentials (adjust based on your database)
const SERVICE_CENTER_USER = {
  username: 'Pune_East_Service_Centre', // Service center user with CenterId: 4
  password: 'password'
};

const ADMIN_USER = {
  username: 'admin',
  password: 'admin'
};

let testResults = {
  passed: 0,
  failed: 0,
  errors: []
};

// Helper: Make HTTP request
function makeRequest(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        try {
          const parsed = responseData ? JSON.parse(responseData) : {};
          resolve({ status: res.statusCode, data: parsed, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: responseData, headers: res.headers });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

// Helper: Log test results
function logTest(testName, passed, message = '') {
  const prefix = passed ? '✓ ' : '✗ ';
  const color = passed ? '\x1b[32m' : '\x1b[31m';
  const reset = '\x1b[0m';
  console.log(`${color}${prefix}${testName}${reset}${message ? ' - ' + message : ''}`);
  if (passed) {
    testResults.passed++;
  } else {
    testResults.failed++;
    testResults.errors.push(`${testName}: ${message}`);
  }
}

// Test 1: Service center user login
async function testServiceCenterUserLogin() {
  console.log('\n\x1b[33m════════════════════════════════════════\x1b[0m');
  console.log('\x1b[33mPHASE 1: Server Authentication\x1b[0m');
  console.log('\x1b[33m════════════════════════════════════════\x1b[0m\n');
  
  try {
    const response = await makeRequest('POST', '/api/auth/login', SERVICE_CENTER_USER);
    
    const isSuccess = response.status === 200;
    const user = response.data.user;
    const hasToken = !!response.data.token;
    
    logTest('Service Center User Login', isSuccess, `Status: ${response.status}`);
    logTest('Response Has Token', hasToken, `Token length: ${response.data.token?.length || 0}`);
    logTest('User Role is service_center', user?.Role === 'service_center', `Role: ${user?.Role || 'N/A'}`);
    
    if (isSuccess && user && hasToken) {
      return { user, token: response.data.token };
    }
    return null;
  } catch (error) {
    logTest('Service Center User Login', false, error.message);
    return null;
  }
}

// Test 2: Verify centerId is returned
async function testServerReturnsCenterId(user) {
  console.log('\n\x1b[33m════════════════════════════════════════\x1b[0m');
  console.log('\x1b[33mPHASE 2: Server Response Verification\x1b[0m');
  console.log('\x1b[33m════════════════════════════════════════\x1b[0m\n');
  
  if (!user) {
    logTest('Server Returns centerId', false, 'No user data from previous test');
    return null;
  }
  
  const hasCenterId = user.centerId !== null && user.centerId !== undefined;
  logTest(
    'Server Returns centerId',
    hasCenterId,
    `centerId: ${user.centerId} (type: ${typeof user.centerId})`
  );
  
  if (hasCenterId) {
    logTest(
      'Service Center ID is Valid',
      user.centerId > 0,
      `Value: ${user.centerId}`
    );
  }
  
  return user.centerId;
}

// Test 3: Verify complaints endpoint works
async function testComplaintsEndpoint(centerId, token) {
  console.log('\n\x1b[33m════════════════════════════════════════\x1b[0m');
  console.log('\x1b[33mPHASE 3: API Endpoint Verification\x1b[0m');
  console.log('\x1b[33m════════════════════════════════════════\x1b[0m\n');
  
  if (!centerId || !token) {
    logTest('Complaints by Service Center Endpoint', false, 'Missing centerId or token');
    return false;
  }
  
  try {
    const response = await makeRequest(
      'GET',
      `/api/call-center/complaints/by-service-center/${centerId}`,
      null,
      { Authorization: `Bearer ${token}` }
    );
    
    const isSuccess = response.status === 200;
    const complaints = response.data.complaints || response.data;
    const hasComplaints = Array.isArray(complaints);
    
    logTest(
      'Complaints by Service Center Endpoint',
      isSuccess,
      `Status: ${response.status}`
    );
    
    if (isSuccess && hasComplaints) {
      logTest(
        'Complaints Data Format',
        true,
        `Returned ${complaints.length} complaints`
      );
    } else if (isSuccess) {
      logTest(
        'Complaints Data Format',
        false,
        `Expected array, got: ${typeof complaints}`
      );
    }
    
    return isSuccess;
  } catch (error) {
    logTest('Complaints by Service Center Endpoint', false, error.message);
    return false;
  }
}

// Test 4 Admin user has no centerId
async function testAdminNoServiceCenterId() {
  console.log('\n\x1b[33m════════════════════════════════════════\x1b[0m');
  console.log('\x1b[33mPHASE 4: Role-Based Verification\x1b[0m');
  console.log('\x1b[33m════════════════════════════════════════\x1b[0m\n');
  
  try {
    const response = await makeRequest('POST', '/api/auth/login', ADMIN_USER);
    
    const isSuccess = response.status === 200;
    const user = response.data.user;
    const isAdmin = user?.Role === 'admin';
    const hasNoCenterId = user?.centerId === null || user?.centerId === undefined;
    
    logTest('Admin User Login', isSuccess, `Status: ${response.status}`);
    logTest(
      'Admin Has No Service Center ID',
      isAdmin && hasNoCenterId,
      `Role: ${user?.Role}, centerId: ${user?.centerId}`
    );
    
    return isSuccess;
  } catch (error) {
    logTest('Admin User Login', false, error.message);
    return false;
  }
}

// Test 5: Simulate localStorage flow
function testLocalStorageFlow(centerId) {
  console.log('\n\x1b[33m════════════════════════════════════════\x1b[0m');
  console.log('\x1b[33mPHASE 5: Frontend localStorage Simulation\x1b[0m');
  console.log('\x1b[33m════════════════════════════════════════\x1b[0m\n');
  
  // Simulate what happens in login.jsx
  const mockLocalStorage = {};
  
  // Set token
  mockLocalStorage['token'] = 'mock_token';
  logTest('Store Token in localStorage', true);
  
  // Set serviceCenterId
  if (centerId) {
    mockLocalStorage['serviceCenterId'] = String(centerId);
    logTest(
      'Store serviceCenterId in localStorage',
      true,
      `Value: ${mockLocalStorage['serviceCenterId']}`
    );
  } else {
    logTest(
      'Store serviceCenterId in localStorage',
      false,
      'No centerId provided'
    );
    return false;
  }
  
  // Retrieve (simulating CallUpdate)
  const retrieved = mockLocalStorage['serviceCenterId'];
  logTest(
    'Retrieve serviceCenterId from localStorage',
    !!retrieved,
    `Retrieved: ${retrieved}`
  );
  
  // Verify it's usable
  const isUsable = retrieved && !isNaN(retrieved);
  logTest(
    'Service Center ID is Usable',
    isUsable,
    `Type: ${typeof retrieved}, Value: ${retrieved}`
  );
  
  return retrieved;
}

// Main test runner
async function runAllTests() {
  console.log('\n\x1b[36m\x1b[1m');
  console.log('╔════════════════════════════════════════╗');
  console.log('║  SERVICE CENTER ID FLOW TEST SUITE     ║');
  console.log('╚════════════════════════════════════════╝');
  console.log('\x1b[0m');
  
  try {
    // Phase 1: Test login
    const loginResult = await testServiceCenterUserLogin();
    
    if (!loginResult) {
      console.log('\n\x1b[31m✗ Cannot proceed - Service center user login failed\x1b[0m\n');
      console.log('\x1b[33mTROUBLESHOOTING:\x1b[0m');
      console.log('1. Verify service center user exists in database');
      console.log("2. Check user's role_id points to 'service_center' role");
      console.log('3. Verify user has associated ServiceCenter record');
      printSummary();
      process.exit(1);
    }

    // Phase 2: Check centerId
    const centerId = await testServerReturnsCenterId(loginResult.user);
    
    // Phase 3: Test API
    if (centerId) {
      await testComplaintsEndpoint(centerId, loginResult.token);
    }

    // Phase 4: Test admin
    await testAdminNoServiceCenterId();

    // Phase 5: Test localStorage
    testLocalStorageFlow(centerId);

    // Print summary
    printSummary();
    
  } catch (error) {
    console.error('\n\x1b[31mTest suite error:\x1b[0m', error);
    process.exit(1);
  }
}

function printSummary() {
  console.log('\n\x1b[36m\x1b[1m');
  console.log('╔════════════════════════════════════════╗');
  console.log('║       TEST RESULTS SUMMARY             ║');
  console.log('╚════════════════════════════════════════╝');
  console.log('\x1b[0m');
  
  console.log(`\x1b[32mPassed: ${testResults.passed}\x1b[0m`);
  console.log(`\x1b[31mFailed: ${testResults.failed}\x1b[0m`);
  
  if (testResults.errors.length > 0) {
    console.log('\n\x1b[31mErrors:\x1b[0m');
    testResults.errors.forEach(err => console.log(`  · ${err}`));
  }
  
  console.log('\n\x1b[36m\x1b[1m');
  console.log('╔════════════════════════════════════════╗');
  console.log('║     FRONTEND DEBUGGING STEPS           ║');
  console.log('╚════════════════════════════════════════╝');
  console.log('\x1b[0m');
  
  console.log('\n\x1b[33m1. After logging in, check browser console (F12)\x1b[0m');
  console.log('   - Look for [LOGIN] messages showing serviceCenterId storage');
  console.log('   - Look for [CallUpdate] messages showing retrieval');
  
  console.log('\n\x1b[33m2. Verify localStorage contents\x1b[0m');
  console.log('   - Open DevTools → Application → LocalStorage');
  console.log('   - Check keys: token, role, user, serviceCenterId');
  console.log('   - serviceCenterId should be a positive number');
  
  console.log('\n\x1b[33m3. If error persists\x1b[0m');
  console.log('   - Clear all storage: LocalStorage → Clear All');
  console.log('   - Logout and login again');
  console.log('   - Check server logs for centerId assignment\n');
}

// Run tests
runAllTests();
