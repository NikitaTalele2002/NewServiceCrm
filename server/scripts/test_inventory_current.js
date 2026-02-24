import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_jwt_key_change_me';

async function run() {
  try {
    // Signed token for a service_center user (adjust id/centerId as needed)
    const payload = { id: 4, centerId: 4, role: 'service_center' };
    const token = jwt.sign(payload, JWT_SECRET);

    const url = 'http://localhost:5000/api/inventory/current';
    console.log('Calling', url, 'with token for centerId=', payload.centerId);

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    });

    console.log('Status:', res.status, res.statusText);
    const body = await res.text();
    try {
      console.log('Response JSON:', JSON.parse(body));
    } catch (e) {
      console.log('Response body (raw):', body);
    }
  } catch (err) {
    console.error('Test failed:', err);
    process.exitCode = 1;
  }
}

run();
