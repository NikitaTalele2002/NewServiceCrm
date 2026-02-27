import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5000';

// Token for service center user (based on earlier logs)
const token = 'YOUR_SC_USER_TOKEN_HERE';

async function testCancellation() {
  try {
    console.log('🧪 Testing cancellation endpoint...\n');

    // First, get a valid token by logging in
    console.log('Step 1: Getting valid token...');
    const loginRes = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'sc_user@example.com',
        password: 'password123'
      })
    });

    if (!loginRes.ok) {
      console.log('❌ Login failed:', loginRes.status);
      return;
    }

    const loginData = await loginRes.json();
    const authToken = loginData.token;
    console.log('✅ Got token:', authToken.substring(0, 20) + '...\n');

    // Test cancellation request
    console.log('Step 2: Sending cancellation request for call 1...');
    const cancelRes = await fetch(`${API_BASE}/api/call-center/complaints/1/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        reason: 'Customer not available',
        notes: 'Will reschedule visit'
      })
    });

    console.log('Response status:', cancelRes.status);
    const cancelData = await cancelRes.json();
    console.log('Response:', JSON.stringify(cancelData, null, 2));

    if (cancelRes.ok) {
      console.log('✅ Cancellation successful!');
    } else {
      console.log('❌ Cancellation failed');
    }

  } catch (err) {
    console.error('Error:', err.message);
  }
}

testCancellation();
