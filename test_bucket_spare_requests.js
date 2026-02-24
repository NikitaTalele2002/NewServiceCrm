/**
 * Test Bucket System & Spare Request Creation
 * Tests all new endpoints for spare request creation with bucket integration
 */

import { config } from 'dotenv';

config();

const API_BASE = process.env.API_URL || 'http://localhost:3000/api';
let token = '';

// Test data
const TEST_SPARE_ID = 1;
const TEST_SERVICE_CENTER_ID = 1;
const TEST_TECHNICIAN_ID = 5;

async function getToken() {
  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'admin',
        password: 'admin123'
      })
    });
    const data = await response.json();
    token = data.token;
    console.log('✅ Got auth token');
    return token;
  } catch (error) {
    console.error('❌ Failed to get token:', error.message);
    throw error;
  }
}

async function testBucketInventory() {
  console.log('\n🧪 Testing: GET /api/spare-requests/bucket-inventory/:spareId/:locationType/:locationId');
  try {
    const response = await fetch(
      `${API_BASE}/spare-requests/bucket-inventory/${TEST_SPARE_ID}/service_center/${TEST_SERVICE_CENTER_ID}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await response.json();
    console.log('✅ Response:', data);
    return data.data;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

async function testCheckAvailability() {
  console.log('\n🧪 Testing: GET /api/spare-requests/check-availability');
  try {
    const params = new URLSearchParams({
      spareId: TEST_SPARE_ID,
      quantity: 2,
      locationType: 'service_center',
      locationId: TEST_SERVICE_CENTER_ID
    });
    const response = await fetch(
      `${API_BASE}/spare-requests/check-availability?${params}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await response.json();
    console.log('✅ Response:', data);
    return data.data;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

async function testCreateWithBucket() {
  console.log('\n🧪 Testing: POST /api/spare-requests/create-with-bucket');
  try {
    const response = await fetch(
      `${API_BASE}/spare-requests/create-with-bucket`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          spare_request_type: 'TECH_ISSUE',
          spare_id: TEST_SPARE_ID,
          quantity: 2,
          requested_by: TEST_TECHNICIAN_ID,
          source_location_type: 'service_center',
          source_location_id: TEST_SERVICE_CENTER_ID,
          destination_location_type: 'technician',
          destination_location_id: TEST_TECHNICIAN_ID,
          reason: 'msl',
          notes: 'Test spare request for bucket system'
        })
      }
    );
    const data = await response.json();
    console.log('✅ Response:', data);
    return data;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

async function testSpareRequestTypes() {
  console.log('\n🧪 Testing: GET /api/spare-requests/types/all');
  try {
    const response = await fetch(
      `${API_BASE}/spare-requests/types/all`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await response.json();
    console.log('✅ Response:', data);
    return data.data;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

async function testInventoryPageUpdate() {
  console.log('\n🧪 Testing: GET /api/technician-spare-requests (Updated with bucket quantities)');
  try {
    const params = new URLSearchParams({
      serviceCenterId: TEST_SERVICE_CENTER_ID
    });
    const response = await fetch(
      `${API_BASE}/technician-spare-requests?${params}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await response.json();
    
    console.log('✅ Response (first request):', JSON.stringify(data.data[0], null, 2));
    
    // Check if bucket quantities are present
    if (data.data.length > 0 && data.data[0].items.length > 0) {
      const firstItem = data.data[0].items[0];
      console.log('\n📊 Bucket Quantities in Response:');
      console.log(`  - qty_good: ${firstItem.qty_good}`);
      console.log(`  - qty_defective: ${firstItem.qty_defective}`);
      console.log(`  - qty_in_transit: ${firstItem.qty_in_transit}`);
      console.log(`  - total_qty: ${firstItem.total_qty}`);
    }
    
    return data.data;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

async function runTests() {
  console.log('\n========================================');
  console.log('BUCKET SYSTEM TEST SUITE');
  console.log('========================================');

  try {
    // Get auth token first
    await getToken();

    // Test 1: Get spare request types
    const types = await testSpareRequestTypes();

    // Test 2: Check bucket inventory
    const inventory = await testBucketInventory();

    // Test 3: Check availability
    const availability = await testCheckAvailability();

    // Test 4: Create spare request with bucket integration
    const createResult = await testCreateWithBucket();

    // Test 5: Verify inventory page shows buckets
    const updatedInventory = await testInventoryPageUpdate();

    console.log('\n========================================');
    console.log('✅ ALL TESTS COMPLETED');
    console.log('========================================');

    // Summary
    console.log('\n📋 TEST SUMMARY:');
    console.log(`  ✅ Authentication: ${token ? 'PASSED' : 'FAILED'}`);
    console.log(`  ✅ Spare request types endpoint: ${types ? 'PASSED' : 'FAILED'}`);
    console.log(`  ✅ Bucket inventory lookup: ${inventory ? 'PASSED' : 'FAILED'}`);
    console.log(`  ✅ Availability check: ${availability ? 'PASSED' : 'FAILED'}`);
    console.log(`  ✅ Create with bucket: ${createResult ? 'PASSED' : 'FAILED'}`);
    console.log(`  ✅ Inventory page update: ${updatedInventory ? 'PASSED' : 'FAILED'}`);

  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

// Run tests
runTests().catch(console.error);
