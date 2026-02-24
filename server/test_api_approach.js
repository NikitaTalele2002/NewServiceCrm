/**
 * Direct Test: Spare Request to Stock Movement
 * Uses the existing API endpoints like a real client would
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';

async function runTest() {
  try {
    console.log('\n🎯 TECHNICIAN SPARE REQUEST TEST - API APPROACH\n');

    // 1. Login as ASC user to get token
    console.log('STEP 1: Getting authentication token...');
    let response = await fetch(`${BASE_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'asc_user' || 'admin',
        password: 'password123' || 'admin123'
      })
    });

    let authData = null;
    if (response.ok) {
      authData = await response.json();
      console.log(`✅ Got token`);
    } else {
      console.log(`⚠️  Login failed, will use test token`);
      authData = { token: 'test-token' };
    }

    const token = authData?.token || 'test-token';

    // 2. Try to get technician spare requests
    console.log('\nSTEP 2: Checking for existing requests...');
    response = await fetch(`${BASE_URL}/api/technician-spare-requests`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Found ${data.count} requests`);
      
      if (data.data && data.data.length > 0) {
        const req = data.data[0];
        console.log(`\nLatest Request:`);
        console.log(`  ID: ${req.id}`);
        console.log(`  Technician: ${req.technicianName}`);
        console.log(`  Items: ${req.items.length}`);
        console.log(`  Status: ${req.status}`);
        
        if (req.items.length > 0) {
          console.log(`  First Item: Spare ${req.items[0].spare_id}, Qty: ${req.items[0].quantity_requested}`);
        }
      }
    } else {
      console.log(`⚠️  GET requests failed: ${response.status}`);
    }

    console.log('\n' + '='.repeat(70));
    console.log('Note: The real test requires database setup with:');
    console.log('  - Service center(s)');
    console.log('  - Technicians assigned to service centers');
    console.log('  - Calls for those technicians');
    console.log('  - Spare parts with inventory at service centers');
    console.log('  - Creating a request via API');
    console.log('  - Approving via API');
    console.log('  - Verifying stock movement was created');
    console.log('='.repeat(70));

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

runTest();
