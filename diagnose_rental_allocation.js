import axios from 'axios';

// Test tokens for different service centers
const SC2_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwidXNlcm5hbWUiOiJTQ1VzZXIyIiwiY2VudGVySWQiOjIsInJvbGUiOiJzZXJ2aWNlX2NlbnRlciIsImlhdCI6MTcwNzM3OTc3Nn0.MlQf2jWFc8dHmE3_2eF5fPk_9X2kL_6vH3vP_qR8o5g';
const TECH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MywidXNlcm5hbWUiOiJ0ZWNoIiwiY2VudGVySWQiOjIsInJvbGUiOiJ0ZWNoIiwiaWF0IjoxNzA3Mzc5Nzc2fQ.aH5v6i7K8m9nL2o3pQ4rS5tU6vW7xY8zA9bC0dE1fG2h';

async function diagnose() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🔍 RENTAL ALLOCATION DIAGNOSIS');
    console.log('='.repeat(80));

    // Step 1: Check if we can fetch available spares
    console.log('\n📌 Step 1: Checking available spares...');
    const sparesRes = await axios.get('http://localhost:5000/api/spare-requests/spares', {
      headers: { 'Authorization': `Bearer ${SC2_TOKEN}` }
    });
    
    const spares = sparesRes.data.data || [];
    console.log(`✅ Found ${spares.length} spare parts`);
    if (spares.length > 0) {
      console.log(`   First spare: ID=${spares[0].Id}, Name=${spares[0].DESCRIPTION}`);
    }

    // Step 2: Create a test request
    if (spares.length >= 2) {
      console.log('\n📌 Step 2: Creating a test spare request as technician...');
      const createRes = await axios.post(
        'http://localhost:5000/api/technician-sc-spare-requests/create',
        {
          spares: [
            { spareId: spares[0].Id, quantity: 1 },
            { spareId: spares[1].Id, quantity: 1 }
          ],
          requestReason: 'Diagnostic Test Request',
          remarks: 'Testing rental allocation visibility'
        },
        {
          headers: { 'Authorization': `Bearer ${TECH_TOKEN}` }
        }
      );

      if (createRes.data.success) {
        const requestId = createRes.data.data.requestId;
        console.log(`✅ Request created successfully: REQ-${requestId}`);
        
        // Step 3: Wait a moment and fetch rental allocation
        console.log('\n📌 Step 3: Fetching rental allocation page...');
        await new Promise(resolve => setTimeout(resolve, 1000));

        const listRes = await axios.get(
          'http://localhost:5000/api/technician-sc-spare-requests/rental-allocation',
          {
            headers: { 'Authorization': `Bearer ${SC2_TOKEN}` }
          }
        );

        console.log(`✅ Rental allocation response received`);
        console.log(`   Total requests: ${listRes.data.data.length}`);
        console.log(`   Summary:`, JSON.stringify(listRes.data.summary, null, 2));

        // Check if our newly created request is visible
        const foundRequest = listRes.data.data.find(r => r.requestId === requestId);
        if (foundRequest) {
          console.log(`\n✅ SUCCESS! Created request is VISIBLE in rental allocation`);
          console.log(`   Request ID: ${foundRequest.requestId}`);
          console.log(`   Technician: ${foundRequest.technicianName}`);
          console.log(`   Status: ${foundRequest.status}`);
          console.log(`   Items: ${foundRequest.items.length}`);
        } else {
          console.log(`\n❌ ISSUE! Created request is NOT VISIBLE in rental allocation`);
          console.log(`   Created request ID: REQ-${requestId}`);
          console.log(`   Fetched requests: ${listRes.data.data.map(r => r.requestId).join(', ')}`);
        }
      }
    } else {
      console.log('⚠️  Not enough spares to create test request');
    }

    // Step 4: Check database directly for spare_requests
    console.log('\n📌 Step 4: Checking database for recent spare requests...');
    try {
      const dbCheckRes = await axios.post(
        'http://localhost:5000/api/debug/check-spare-requests',
        {},
        {
          headers: { 'Authorization': `Bearer ${SC2_TOKEN}` }
        }
      );
      console.log('Database check response:', JSON.stringify(dbCheckRes.data, null, 2));
    } catch (e) {
      console.log('Database check endpoint not available (this is normal)');
    }

  } catch (error) {
    console.error('\n❌ Error during diagnosis:');
    console.error('   Status:', error.response?.status);
    console.error('   Message:', error.response?.data?.error || error.message);
  }

  process.exit(0);
}

diagnose();
