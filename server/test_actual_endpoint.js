import axios from 'axios';

async function testAPIResponse() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🧪 TESTING ACTUAL API ENDPOINT');
    console.log('='.repeat(80) + '\n');

    // First, get a test token
    const tokenResponse = await axios.get('http://localhost:5000/api/auth/test-token?centerId=1');
    const token = tokenResponse.data.token;
    
    console.log('✅ Got test token for SC 1\n');

    // Call the actual endpoint
    console.log('📞 Calling: GET /api/technician-sc-spare-requests/rental-allocation\n');
    const response = await axios.get(
      'http://localhost:5000/api/technician-sc-spare-requests/rental-allocation',
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const data = response.data;
    console.log(`✅ Got response with ${data.data.length} requests\n`);

    // Find Request 22
    const req22 = data.data.find(r => r.requestId === 22);
    
    if (!req22) {
      console.error('❌ Request 22 not found in response!');
      console.log('Requests in response:', data.data.map(r => r.requestId));
      process.exit(1);
    }

    console.log('✅ Found Request 22\n');
    console.log('REQUEST STRUCTURE:');
    console.log('  requestId:', req22.requestId);
    console.log('  technicianName:', req22.technicianName);
    console.log('  status:', req22.status);
    console.log('  items:', Array.isArray(req22.items) ? `Array[${req22.items.length}]` : typeof req22.items);
    console.log();

    if (!req22.items || req22.items.length === 0) {
      console.log('⚠️  WARNING: Items array is empty or missing!');
    } else {
      console.log('ITEMS DETAILS:');
      req22.items.forEach((item, i) => {
        console.log(`\nItem ${i + 1}:`);
        console.log('  Keys:', Object.keys(item));
        console.log('  itemId:', item.itemId);
        console.log('  spareId:', item.spareId);
        console.log('  partCode:', item.partCode);
        console.log('  partDescription:', item.partDescription);
        console.log('  requestedQty:', item.requestedQty);
        console.log('  availableQty:', item.availableQty);
      });
    }

    console.log('\n' + '='.repeat(80));
    console.log('FULL RESPONSE FOR REQUEST 22:');
    console.log('='.repeat(80));
    console.log(JSON.stringify(req22, null, 2));
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response?.data) {
      console.error('Response:', error.response.data);
    }
  } finally {
    process.exit(0);
  }
}

testAPIResponse();
