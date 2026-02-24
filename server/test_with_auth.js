/**
 * Generate JWT Token and Test receive-delivery
 * Creates a valid token and calls the endpoint
 */

import jwt from 'jsonwebtoken';

const JWT_SECRET = 'supersecret_jwt_key_change_me'; // Same as auth.js
const BASE_URL = 'http://localhost:5000';

function generateToken() {
  const payload = {
    id: 1,
    username: 'test_user',
    role: 'service_center',
    centerId: 3, // ASC ID
    service_center_id: 3
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
  return token;
}

async function testReceiveDelivery() {
  console.log('\n🔧 === RECEIVE DELIVERY WITH AUTH TEST ===\n');

  // Generate valid token
  console.log('🔐 Generating JWT token...');
  const token = generateToken();
  console.log(`✅ Token generated\n`);
  console.log('token generated successfully');
  console.log('Token:', token, '\n');
    console.log('Decoded token payload ',jwt.decode(token),'\n');
    console.log('Token expires at:', new Date(jwt.decode(token).exp * 1000),'\n');

  // Test payload
  const payload = {
    requestId: 25,
    documentType: 'DN',
    documentNumber: 'DN-20260216-R8H2V',
    plants: 4,
    items: [
      {
        spare_id: 0,
        qty: 1,
        carton_number: 'CTN-20260216-001',
        condition: 'good'
      }
    ]
  };

  console.log('📝 Request Payload:');
  console.log(JSON.stringify(payload, null, 2));
  console.log('\n');

  try {
    console.log('🔄 Sending POST request with valid token...\n');
    
    const response = await fetch(`${BASE_URL}/api/logistics/receive-delivery`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    console.log(`📊 Response Status: ${response.status}\n`);
    console.log('📋 Response Body:');
    console.log(JSON.stringify(data, null, 2));
    console.log('\n');

    if (response.status === 201 && data.ok) {
      console.log('✅✅✅ SUCCESS! Endpoint processing worked!\n');
      console.log('Generated stock movement:');
      console.log(`  Movement ID: ${data.movement?.movement?.movement_id}`);
      console.log(`  Type: ${data.movement?.movement?.movement_type}`);
      console.log(`  Status: ${data.movement?.movement?.status}`);
      console.log(`  Total Qty: ${data.movement?.movement?.total_qty}\n`);
      
      console.log('Generated items:');
      data.movement?.items?.forEach((item, idx) => {
        console.log(`  ${idx + 1}. Item ID: ${item.item_id}, Qty: ${item.qty}, Spare: ${item.spare_part_id}`);
      });
      
    } else {
      console.log(`❌ Request returned status ${response.status}\n`);
      if (data.error) {
        console.log(`Error: ${data.error}\n`);
      }
      if (data.message) {
        console.log(`Message: ${data.message}\n`);
      }
    }

  } catch (error) {
    console.log('❌ Connection failed\n');
    console.log(`Error: ${error.message}\n`);
    console.log('Make sure the server is running at http://localhost:5000');
  }

  console.log('\n⏳ Waiting 3 seconds before checking database...\n');
  await new Promise(resolve => setTimeout(resolve, 3000));

  console.log('📝 Now checking the database with direct query...\n');
}

testReceiveDelivery();
