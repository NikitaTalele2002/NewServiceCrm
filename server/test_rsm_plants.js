/**
 * Test RSM Assigned Plants with Proper Token
 * Run: node test_rsm_plants.js
 */

import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';

const JWT_SECRET = 'supersecret_jwt_key_change_me';

async function testRSMPlants() {
  try {
    console.log('\n' + '═'.repeat(80));
    console.log('  TEST RSM ASSIGNED PLANTS ENDPOINT');
    console.log('═'.repeat(80) + '\n');

    // Create a proper token for user ID 1 with RSM role
    const payload = {
      id: 1,                    // This must match rsm_user_id in the database (1 or 2)
      username: 'test_rsm_1',
      role: 'rsm',
      rsmId: 1,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
    console.log('📌 Generated Token for RSM User 1:');
    console.log('  Token Payload:', JSON.stringify(payload, null, 2));
    console.log('  Token:', token.substring(0, 50) + '...\n');

    // Make request to the API
    console.log('📌 Making Request to /api/branch/assigned-plants...\n');
    
    const response = await fetch('http://localhost:5000/api/branch/assigned-plants', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    
    console.log('Response Status:', response.status);
    console.log('Response Data:', JSON.stringify(data, null, 2));
    console.log('');

    if (data.ok) {
      console.log('✅ SUCCESS!');
      if (data.plants && data.plants.length > 0) {
        console.log(`   Found ${data.plants.length} plants/branches:\n`);
        data.plants.forEach(p => {
          console.log(`   - Plant ID: ${p.plant_id}, Code: ${p.plant_name}`);
        });
      } else {
        console.log('   ⚠️  No plants found for this RSM');
      }
    } else {
      console.log('❌ ERROR:', data.error || data.message);
    }

    console.log('\n' + '═'.repeat(80));
    console.log('  TIP: Check server console for debug messages');
    console.log('═'.repeat(80) + '\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error:');
    console.error('Message:', error.message);
    console.error('\n⚠️  Make sure server is running on port 5000');
    process.exit(1);
  }
}

testRSMPlants();
