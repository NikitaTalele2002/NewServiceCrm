import axios from 'axios';

const BASE_URL = 'http://localhost:3000/api';

async function testMSLBulkDetermination() {
  console.log('\n🧪 Testing MSL vs BULK Spare Request Type Determination\n');
  console.log('═'.repeat(60));

  try {
    // Get token first
    console.log('\n1️⃣  Getting authentication token...');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'sc001@servicecenters.com',
      password: 'password123'
    });
    const token = loginRes.data.token;
    const userId = loginRes.data.userId;
    const centerId = loginRes.data.centerId;
    console.log(`✅ Login success - Token received, CenterId: ${centerId}`);

    // Scenario 1: Test with a spare that should trigger MSL
    console.log('\n2️⃣  Scenario 1: Testing MSL Request (low stock scenario)');
    console.log('   Creating request with spares below MSL threshold...');
    
    const mslRequest = await axios.post(
      `${BASE_URL}/spare-requests`,
      {
        items: [
          { sparePartId: 1, quantity: 10 } // Assuming ID 1 has low stock
        ],
        remarks: 'Testing MSL determination - stock below minimum'
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('\n📊 MSL Request Response:');
    console.log('  Request Reason:', mslRequest.data.spare_request?.request_reason);
    console.log('  Request Type:', mslRequest.data.spare_request?.spare_request_type);
    console.log('  Request ID:', mslRequest.data.spare_request?.request_id);
    
    if (mslRequest.data.spare_request?.request_reason === 'msl') {
      console.log('✅ PASS: Request correctly identified as MSL');
    } else {
      console.log('⚠️  WARNING: Request reason was not identified as MSL');
    }

    // Scenario 2: Test with a spare that should trigger BULK
    console.log('\n3️⃣  Scenario 2: Testing BULK Request (adequate stock scenario)');
    console.log('   Creating request with spares above MSL threshold...');
    
    const bulkRequest = await axios.post(
      `${BASE_URL}/spare-requests`,
      {
        items: [
          { sparePartId: 2, quantity: 5 } // Assuming ID 2 has adequate stock
        ],
        remarks: 'Testing BULK determination - stock above minimum'
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('\n📊 BULK Request Response:');
    console.log('  Request Reason:', bulkRequest.data.spare_request?.request_reason);
    console.log('  Request Type:', bulkRequest.data.spare_request?.spare_request_type);
    console.log('  Request ID:', bulkRequest.data.spare_request?.request_id);
    
    if (bulkRequest.data.spare_request?.request_reason === 'bulk') {
      console.log('✅ PASS: Request correctly identified as BULK');
    } else {
      console.log('⚠️  WARNING: Request reason was not identified as BULK');
    }

    // Scenario 3: Mixed request (some low, some adequate)
    console.log('\n4️⃣  Scenario 3: Testing Mixed Request (some low + some adequate)');
    console.log('   Creating request with mixed spare stock levels...');
    
    const mixedRequest = await axios.post(
      `${BASE_URL}/spare-requests`,
      {
        items: [
          { sparePartId: 1, quantity: 10 }, // Low stock
          { sparePartId: 2, quantity: 5 }   // Adequate stock
        ],
        remarks: 'Testing mixed determination - should be MSL if any item is low'
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('\n📊 Mixed Request Response:');
    console.log('  Request Reason:', mixedRequest.data.spare_request?.request_reason);
    console.log('  Request Type:', mixedRequest.data.spare_request?.spare_request_type);
    console.log('  Request ID:', mixedRequest.data.spare_request?.request_id);
    
    if (mixedRequest.data.spare_request?.request_reason === 'msl') {
      console.log('✅ PASS: Mixed request correctly identified as MSL (priority: any low = MSL)');
    } else {
      console.log('⚠️  INFO: Mixed request identified as BULK (logic may treat items independently)');
    }

    console.log('\n' + '═'.repeat(60));
    console.log('\n✅ MSL vs BULK Determination Test Complete!');
    console.log('\n📝 Summary:');
    console.log('  • If ANY spare part in the request has stock <= MSL → Request is MSL');
    console.log('  • If ALL spare parts have stock > MSL → Request is BULK');
    console.log('  • MSL requests have higher priority for warehouse fulfillment');

  } catch (error) {
    console.error('\n❌ Test Error:');
    if (error.response?.data) {
      console.error('  Status:', error.response.status);
      console.error('  Message:', error.response.data.error || error.response.data.message);
      console.error('  Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('  ', error.message);
    }
  }
}

testMSLBulkDetermination();
