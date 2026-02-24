/**
 * Test Fresh Login with Fixed Auth Service
 * Verifies that new tokens now include correct rsmId
 */

const API_BASE = 'http://localhost:5000';

async function testFreshLogin() {
  console.log('🔐 Testing Fresh Login with Fixed Auth Service\n');
  
  // User 15 (RSM-Sharma-1) credentials
  const credentials = {
    username: 'RSM-Sharma-1',
    password: '123'
  };

  try {
    // Step 1: Login and get fresh token
    console.log('📝 Step 1: Logging in with RSM User 15...');
    console.log(`   Credentials: ${credentials.username}\n`);

    const loginRes = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });

    const loginData = await loginRes.json();
    
    if (!loginRes.ok) {
      console.error('❌ Login failed:', loginData.message || JSON.stringify(loginData));
      return;
    }

    const token = loginData.token;
    console.log('✅ Login successful!');
    console.log(`   Token received: ${token.substring(0, 30)}...\n`);

    // Step 2: Decode token to check payload
    console.log('📋 Step 2: Decoding Token Payload...\n');
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      console.log('Token Payload:');
      console.log(JSON.stringify(payload, null, 2));
      console.log();
      
      // Verify rsmId is present and correct
      if (payload.rsmId) {
        console.log(`✅ Token contains rsmId: ${payload.rsmId}`);
        if (payload.rsmId === 2) {
          console.log('✅ CORRECT - rsmId is 2 (RSM-Sharma-1 correctly mapped)');
        } else {
          console.log(`⚠️  rsmId is ${payload.rsmId}, expected 2`);
        }
      } else {
        console.log('❌ Token does NOT contain rsmId');
      }
      
      console.log(`   User ID: ${payload.id}`);
      console.log(`   Role: ${payload.role}`);
      console.log();
    } catch (e) {
      console.error('Error decoding token:', e);
      return;
    }

    // Step 3: Test /api/branch/assigned-plants endpoint
    console.log('📌 Step 3: Testing /api/branch/assigned-plants with Fresh Token\n');

    const plantsRes = await fetch(`${API_BASE}/api/branch/assigned-plants`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const plantsData = await plantsRes.json();
    console.log('Response from /api/branch/assigned-plants:');
    console.log(JSON.stringify(plantsData, null, 2));
    console.log();

    if (plantsData.ok && plantsData.plants && plantsData.plants.length > 0) {
      console.log('✅ Successfully retrieved assigned plants:');
      plantsData.plants.forEach(p => {
        console.log(`   - ${p.plant_name} (ID: ${p.plant_id})`);
      });
    } else {
      console.log('❌ No plants returned');
      if (plantsData.error) console.log(`   Error: ${plantsData.error}`);
    }

    console.log('\n✅ Fresh Login Test Complete');
    console.log('💡 If plants are visible above, the auth fix is working!');

  } catch (error) {
    console.error('❌ Test Error:', error.message);
  }
}

testFreshLogin();
