/**
 * Direct API test for request 31 receive-delivery
 */

import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';

const JWT_SECRET = 'supersecret_jwt_key_change_me';
const BASE_URL = 'http://localhost:5000';

function generateToken(ascId = 4) {
  const payload = {
    id: 1,
    username: 'test_asc_user',
    role: 'service_center',
    centerId: ascId,
    service_center_id: ascId
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

async function test() {
  const token = generateToken(4);

  console.log('\n✅ === TEST RECEIVE-DELIVERY FOR REQUEST 31 ===\n');

  console.log('📋 Request Details:');
  console.log('  Request ID: 31');
  console.log('  From Plant: 4 (but should use assigned plant)');
  console.log('  To ASC: 4');
  console.log('  Spare ID: 3, Qty: 2');
  console.log('  Expected DN from DB: DN-20260216-744NY\n');

  try {
    console.log('📝 Calling /api/logistics/receive-delivery...\n');

    const response = await fetch(`${BASE_URL}/api/logistics/receive-delivery`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        requestId: 31,
        documentType: 'DN',
        documentNumber: 'DN-WRONG-ON-PURPOSE',  // Send wrong DN - backend should replace it
        plantId: 4,  // Won't matter, ASC assignment will determine plant
        ascId: 4,
        items: [{
          spare_id: 3,
          qty: 2
        }]
      })
    });

    console.log(`Response Status: ${response.status}\n`);

    const text = await response.text();
    console.log(`Response Body:\n${text}\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

try {
  await test();
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
