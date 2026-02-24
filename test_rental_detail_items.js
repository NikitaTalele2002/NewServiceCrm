import axios from 'axios';

const SC2_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJTQzIgVXNlciIsImNlbnRlcklkIjoyLCJyb2xlIjoic2VydmljZV9jZW50ZXIiLCJpYXQiOjE3NzEyMzU2NTZ9.example';

async function test() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🧪 TESTING RENTAL ALLOCATION DETAIL VIEW');
    console.log('='.repeat(80) + '\n');

    // First get the rental allocation list
    console.log('📌 Step 1: Getting rental allocation list...');
    const listResponse = await axios.get(
      'http://localhost:5000/api/technician-sc-spare-requests/rental-allocation',
      {
        headers: { 'Authorization': 'Bearer test-token' }
      }
    );

    console.log(`✅ Found ${listResponse.data.data.length} requests\n`);

    if (listResponse.data.data.length === 0) {
      console.log('⚠️  No requests found');
      process.exit(1);
    }

    const firstRequest = listResponse.data.data[0];
    console.log('📋 First Request:');
    console.log(`   ID: ${firstRequest.requestId}`);
    console.log(`   Technician: ${firstRequest.technicianName}`);
    console.log(`   Items count: ${firstRequest.items?.length || 0}\n`);

    // Check if items exist
    if (!firstRequest.items || firstRequest.items.length === 0) {
      console.log('❌ ERROR: Items array is empty!');
      console.log('Request object:', JSON.stringify(firstRequest, null, 2));
      process.exit(1);
    }

    console.log('✅ SUCCESS: Items are present in the request!\n');
    console.log('📦 Items:');
    firstRequest.items.forEach((item, idx) => {
      console.log(`\n   Item ${idx + 1}:`);
      console.log(`   - itemId: ${item.itemId}`);
      console.log(`   - spareId: ${item.spareId}`);
      console.log(`   - partCode: ${item.partCode}`);
      console.log(`   - partDescription: ${item.partDescription}`);
      console.log(`   - requestedQty: ${item.requestedQty}`);
      console.log(`   - approvedQty: ${item.approvedQty}`);
      console.log(`   - availableQty: ${item.availableQty}`);
      console.log(`   - availability_status: ${item.availability_status}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('✅ API RETURNS COMPLETE ITEM DATA');
    console.log('='.repeat(80));
    console.log('\n👉 The spare items list should now be visible in the detail view!');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    if (error.response?.data) {
      console.error('Response:', error.response.data);
    }
    process.exit(1);
  }
}

test();
