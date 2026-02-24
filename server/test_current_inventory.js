/**
 * Test /current-inventory Endpoint
 * Run: node test_current_inventory.js rsm|sc|branch [role_id]
 */

import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';

const JWT_SECRET = 'supersecret_jwt_key_change_me';

async function testEndpoint() {
  try {
    const userType = process.argv[2] || 'rsm'; // rsm, sc, branch
    const roleId = process.argv[3] || 1;

    console.log('\n' + '═'.repeat(80));
    console.log(`  TEST /current-inventory ENDPOINT - ${userType.toUpperCase()} USER`);
    console.log('═'.repeat(80) + '\n');

    let payload;
    
    if (userType === 'rsm') {
      payload = {
        id: 1,
        username: 'test_rsm',
        role: 'rsm',
        rsmId: 1,
      };
    } else if (userType === 'sc' || userType === 'service_center') {
      payload = {
        id: 1,
        username: 'test_sc',
        role: 'service_center',
        centerId: 1,
        branchId: 1,
      };
    } else if (userType === 'branch') {
      payload = {
        id: 1,
        username: 'test_branch',
        role: 'branch',
        branchId: 1,
      };
    } else {
      console.log('❌ Unknown user type. Use: rsm, sc, or branch');
      process.exit(1);
    }

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
    console.log('📌 Token Payload:', JSON.stringify(payload, null, 2));
    console.log('');

    // Make request
    console.log('📌 Making Request to /api/branch/current-inventory...\n');
    
    const response = await fetch('http://localhost:5000/api/branch/current-inventory', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    
    console.log('Response Status:', response.status);
    console.log('Response Summary:');
    console.log(`  - ok: ${data.ok}`);
    if (data.error) console.log(`  - error: ${data.error}`);
    if (data.inventory) {
      console.log(`  - inventory items: ${data.inventory.length}`);
      if (data.inventory.length > 0) {
        console.log('\n  First 3 items:');
        data.inventory.slice(0, 3).forEach((item, i) => {
          console.log(`    ${i+1}. SKU: ${item.sku}, Name: ${item.spareName}, Good: ${item.goodQty}, Defective: ${item.defectiveQty}`);
        });
        if (data.inventory.length > 3) {
          console.log(`    ... and ${data.inventory.length - 3} more\n`);
        }
      }
    }

    console.log('\n' + '═'.repeat(80));
    console.log(`  ✅ TEST COMPLETED - ${userType.toUpperCase()}`);
    console.log('═'.repeat(80) + '\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error:');
    console.error('Message:', error.message);
    console.error('\n⚠️  Make sure server is running on port 5000');
    process.exit(1);
  }
}

testEndpoint();
