import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';

const JWT_SECRET = 'supersecret_jwt_key_change_me';

const payload = {
  id: 1,
  username: 'SCUser',
  centerId: 4,
  role: 'service_center'
};

const token = jwt.sign(payload, JWT_SECRET);

async function testBasicQueries() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 DIAGNOSTIC TEST - Checking Database State');
  console.log('='.repeat(80));

  try {
    // Test simple endpoint first
    console.log('\n1️⃣  Testing basic connectivity...');
    const healthResponse = await fetch('http://localhost:5000/api/products/hierarchy',  {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 5000
    });

    if (healthResponse.ok) {
      console.log('✅ Server is responding');
      const data = await healthResponse.json();
      console.log(`   Groups count: ${data.length}`);
    } else {
      console.error(`❌ Server error: ${healthResponse.status}`);
      return;
    }

    // Test inventory endpoint with timeout
    console.log('\n2️⃣  Testing inventory endpoint (with 30 second timeout)...');
    const inventoryPromise = fetch('http://localhost:5000/api/spare-returns/inventory', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    const inventoryResponse = await inventoryPromise;

    if (inventoryResponse.ok) {
      console.log('✅ Inventory API responded');
      const data = await inventoryResponse.json();
      console.log(`   Total items: ${data.totalItems}`);
      console.log(`   Groups in map: ${Object.keys(data.inventoryMap || {}).length}`);
      
      if (data.totalItems === 0) {
        console.warn('\n⚠️  WARNING: Service center 4 has NO spare inventory!');
        console.log('   This could mean:');
        console.log('   1. No spares allocated to service center ID 4');
        console.log('   2. All spare_inventory records for SC 4 have qty_good = 0');
        console.log('   3. The spare_inventory table is empty');
      }
    } else {
      const errorText = await inventoryResponse.text();
      console.error(`❌ HTTP Error: ${inventoryResponse.status}`);
      console.error('Response:', errorText);
    }

    console.log('\n' + '='.repeat(80));

  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

testBasicQueries();
