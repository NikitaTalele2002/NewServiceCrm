/**
 * Test with User 15 (After Setup)
 * Run: node test_user15_endpoint.js
 */

import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';

const JWT_SECRET = 'supersecret_jwt_key_change_me';

async function testUser15() {
  try {
    console.log('\n' + '═'.repeat(80));
    console.log('  TEST ENDPOINT WITH USER 15');
    console.log('═'.repeat(80) + '\n');

    // Create token for user 15 with RSM role
    const payload = {
      id: 15,
      username: 'RSM-Sharma-1',
      role: 'rsm',
      rsmId: 2,  // Add the actual RSM ID
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
    console.log('📌 Token Payload:');
    console.log(JSON.stringify(payload, null, 2));
    console.log('');

    // Test assigned plants
    console.log('📌 Test 1: /api/branch/assigned-plants\n');
    
    const plantsResponse = await fetch('http://localhost:5000/api/branch/assigned-plants', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const plantsData = await plantsResponse.json();
    console.log('Response:', JSON.stringify(plantsData, null, 2));
    console.log('');

    // Test current inventory with plant selection
    console.log('📌 Test 2: /api/branch/current-inventory (with plant_id=1)\n');
    
    const inventoryResponse = await fetch('http://localhost:5000/api/branch/current-inventory?plant_id=1', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const inventoryData = await inventoryResponse.json();
    console.log('Response Summary:');
    console.log(`  - ok: ${inventoryData.ok}`);
    console.log(`  - inventory items: ${inventoryData.inventory ? inventoryData.inventory.length : 0}`);
    if (inventoryData.error) console.log(`  - error: ${inventoryData.error}`);
    
    console.log('\n' + '═'.repeat(80));
    if (plantsData.plants && plantsData.plants.length > 0) {
      console.log('  ✅ Plants endpoint working!');
    }
    if (inventoryData.ok) {
      console.log('  ✅ Inventory endpoint working!');
    }
    console.log('═'.repeat(80) + '\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

testUser15();
