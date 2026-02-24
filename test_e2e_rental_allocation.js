import axios from 'axios';

const SC4_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJTQ1VzZXIiLCJjZW50ZXJJZCI6NCwicm9sZSI6InNlcnZpY2VfY2VudGVyIiwiaWF0IjoxNzcxMjM1NjU2fQ.oxbba2nqMYdAjWQmJK95SFbKzOf8a6l9AkEdFGFAx5s';

async function test() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🧪 END-TO-END TEST: Rental Allocation Endpoints (Service Center 4)');
    console.log('='.repeat(80) + '\n');

    // Get technicians for SC 4
    console.log('📌 Step 1: Getting technicians for Service Center 4...');
    const techResponse = await axios.get(
      'http://localhost:5000/api/spare-requests/technicians',
      {
        headers: { 'Authorization': `Bearer ${SC4_TOKEN}` }
      }
    );

    if (!techResponse.data.data || techResponse.data.data.length === 0) {
      console.log('❌ No technicians found for Service Center 4');
      console.log('⚠️  Cannot proceed - need at least one technician');
      process.exit(1);
    }

    const tech = techResponse.data.data[0];
    console.log(`✅ Found technician: ${tech.name} (ID: ${tech.technician_id})\n`);

    // Get spares
    console.log('📌 Step 2: Getting available spares...');
    const sparesResponse = await axios.get(
      'http://localhost:5000/api/spare-requests/spares',
      {
        headers: { 'Authorization': `Bearer ${SC4_TOKEN}` }
      }
    );

    if (!sparesResponse.data.data || sparesResponse.data.data.length === 0) {
      console.log('❌ No spares found');
      process.exit(1);
    }

    const spares = sparesResponse.data.data.slice(0, 2).map(s => ({
      spareId: s.Id,
      quantity: 2
    }));
    console.log(`✅ Found ${spares.length} spares to request\n`);

    // Create request as technician
    console.log('📌 Step 3: Creating spare request (as technician)...');
    const createResponse = await axios.post(
      'http://localhost:5000/api/technician-sc-spare-requests/create',
      {
        spares: spares,
        requestReason: 'TEST: Customer request for spare parts',
        remarks: 'Testing rental allocation flow'
      },
      {
        headers: { 
          'Authorization': `Bearer ${SC4_TOKEN}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (createResponse.data.success) {
      console.log(`✅ Request created successfully\n`);
    } else {
      console.log('⚠️ Create response:', createResponse.data);
    }

    // Fetch rental allocation page
    console.log('📌 Step 4: Fetching rental allocation page...');
    const listResponse = await axios.get(
      'http://localhost:5000/api/technician-sc-spare-requests/rental-allocation',
      {
        headers: { 'Authorization': `Bearer ${SC4_TOKEN}` }
      }
    );

    console.log(`✅ API Response:`);
    console.log(`   - Status: ${listResponse.status}`);
    console.log(`   - Requests found: ${listResponse.data.data.length}`);

    if (listResponse.data.data.length > 0) {
      const req = listResponse.data.data[0];
      console.log(`\n✅ SUCCESS! Requests are now visible in rental allocation:\n`);
      console.log(`   📋 Request: ${req.requestNumber}`);
      console.log(`   👤 Technician: ${req.technicianName}`);
      console.log(`   📦 Items: ${req.items.length}`);
      console.log(`   📅 Created: ${req.createdAt}`);
      console.log(`   ✓ The frontend should now show these requests!`);
    } else {
      console.log('\n⚠️ Still no requests visible');
      console.log('   This could mean the Service Center 4 setup needs review');
    }

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
