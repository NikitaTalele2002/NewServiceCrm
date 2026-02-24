/**
 * Debug test - logs full API response
 */

import jwt from 'jsonwebtoken';

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

(async () => {
  console.log('\n🔧 Sending receive-delivery request ...\n');

  const token = generateToken(4);

  try {
    const response = await fetch(`${BASE_URL}/api/logistics/receive-delivery`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        requestId: 24,
        documentType: 'DN',
        documentNumber: 'DN-20260216-XRKKV',
        items: [{
          spare_id: 0,
          qty: 2,
          carton_number: `CTN-DEBUG-${Date.now()}`,
          condition: 'good'
        }]
      })
    });

    const data = await response.json();
    
    console.log(`Status: ${response.status}\n`);
    console.log('Full Response:');
    console.log(JSON.stringify(data, null, 2));

  } catch (error) {
    console.log(`Error: ${error.message}`);
  }
})();
