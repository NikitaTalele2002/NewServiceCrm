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

// Test token for service center 4

async function testSubmitReturn() {
  try {
    console.log('\n================================================================================');
    console.log('🧪 TESTING SPARE RETURN SUBMIT');
    console.log('================================================================================\n');

    console.log('📤 Submitting return request with test data...\n');

    const payload = {
      items: [
        {
          spareId: 0,
          returnQty: 5,
          remainingQty: 115
        },
        {
          spareId: 3,
          returnQty: 10,
          remainingQty: 60
        }
      ],
      returnType: 'defect',
      productGroup: '1',
      product: '1',
      model: '1'
    };

    console.log('Payload:', JSON.stringify(payload, null, 2));
    console.log('\n---\n');
    console.log('Token:', token);
    console.log('\n---\n');

    let response;
    try {
      response = await fetch('http://localhost:5000/api/spare-returns/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload),
        timeout: 30000
      });
    } catch (fetchError) {
      console.error('❌ Fetch error:', fetchError.message);
      console.log('   Code:', fetchError.code);
      console.log('   Errno:', fetchError.errno);
      console.log('\nMake sure server is running on port 5000');
      console.log('\n================================================================================\n');
      return;
    }

    console.log('Response Status:', response.status, response.statusText);

    const data = await response.json();
    console.log('\nResponse Body:', JSON.stringify(data, null, 2));

    if (response.ok && data.success) {
      console.log('\n✅ SUBMIT TEST PASSED');
      console.log('   Request ID:', data.returnRequest?.requestId);
      console.log('   Items:', data.returnRequest?.itemCount);
    } else {
      console.log('\n❌ SUBMIT TEST FAILED');
      console.log('   Error:', data.error);
      console.log('   Message:', data.message);
    }

    console.log('\n================================================================================\n');

  } catch (error) {
    console.error('❌ Test error:', error.message);
    console.error('   Stack:', error.stack);
    console.log('\n================================================================================\n');
  }
}

testSubmitReturn();
