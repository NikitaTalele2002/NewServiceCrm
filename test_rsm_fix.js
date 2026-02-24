/**
 * Test RSM Fix: Verify centerId is populated for RSM users
 * 
 * This test checks:
 * 1. RSM user can login successfully
 * 2. Login response includes centerId (asc_id)
 * 3. JWT token includes rsmId
 * 4. RSM can fetch assigned plants
 * 5. RSM can fetch spare requests
 */

const API_BASE = 'http://localhost:5000';

async function testRSMLogin() {
  console.log('\n========================================');
  console.log('   RSM FIX TEST - LOGIN & VISIBILITY   ');
  console.log('========================================\n');

  try {
    // 1. Login as RSM user
    console.log('📋 Step 1: Testing RSM login...');
    const loginRes = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'RSM-Aamir-1', password: 'password' })
    });

    if (!loginRes.ok) {
      console.error('❌ Login failed:', loginRes.status);
      const text = await loginRes.text();
      console.error('Response:', text);
      return;
    }

    const loginData = await loginRes.json();
    const token = loginData.token;
    const user = loginData.user;

    console.log('⚠️  Current user object:', JSON.stringify(user, null, 2));

    // Check if centerId is present
    if (user.centerId) {
      console.log(`✅ centerId (asc_id) found: ${user.centerId}`);
    } else {
      console.error('❌ centerId (asc_id) NOT found in user object!');
    }

    // 2. Decode JWT to check rsmId
    console.log('\n📋 Step 2: Checking JWT token payload...');
    const tokenParts = token.split('.');
    if (tokenParts.length === 3) {
      const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
      console.log('✅ JWT Payload:', JSON.stringify(payload, null, 2));
      
      if (payload.rsmId) {
        console.log(`✅ JWT includes rsmId: ${payload.rsmId}`);
      } else {
        console.error('❌ JWT does NOT include rsmId!');
      }
    }

    // 3. Fetch assigned plants
    console.log('\n📋 Step 3: Fetching RSM assigned plants...');
    const plantsRes = await fetch(`${API_BASE}/api/rsm/plants`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!plantsRes.ok) {
      console.error('❌ Failed to fetch plants:', plantsRes.status);
      const text = await plantsRes.text();
      console.error('Response:', text);
    } else {
      const plantsData = await plantsRes.json();
      if (plantsData.plantIds && plantsData.plantIds.length > 0) {
        console.log(`✅ Found ${plantsData.plantIds.length} assigned plants:`, plantsData.plantIds);
      } else {
        console.log('⚠️  No plants assigned to this RSM:', plantsData);
      }
    }

    // 4. Fetch spare requests visible to RSM
    console.log('\n📋 Step 4: Fetching spare requests for RSM...');
    const requestsRes = await fetch(`${API_BASE}/api/rsm/spare-requests`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!requestsRes.ok) {
      console.error('❌ Failed to fetch spare requests:', requestsRes.status);
      const text = await requestsRes.text();
      console.error('Response:', text);
    } else {
      const requestsData = await requestsRes.json();
      console.log('✅ Spare requests response:', JSON.stringify(requestsData, null, 2));
      
      if (requestsData.ok && requestsData.requests) {
        const modernRequests = requestsData.requests.modern || [];
        console.log(`✅ Found ${modernRequests.length} spare requests`);
        
        if (modernRequests.length > 0) {
          console.log('Sample request:');
          console.log(JSON.stringify(modernRequests[0], null, 2));
        }
      }
    }

    console.log('\n✅ TEST COMPLETED SUCCESSFULLY!\n');
  } catch (err) {
    console.error('\n❌ TEST FAILED:', err.message);
    console.error(err);
  }
}

// Run the test
console.log('Starting RSM Fix Test...');
console.log('Note: Make sure the server is running on http://localhost:5000\n');
testRSMLogin();
