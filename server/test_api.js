import jwt from 'jsonwebtoken';

const JWT_SECRET = 'supersecret_jwt_key_change_me';

// Create a token for service center with ID 4
const payload = {
  id: 1,
  username: 'SCUser',
  centerId: 4,
  role: 'service_center'
};

const token = jwt.sign(payload, JWT_SECRET);

async function testAPI() {
  try {
    console.log('\n=== Testing Product Hierarchy API ===');
    const response = await fetch('http://localhost:5000/api/products/hierarchy', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error(`HTTP Error: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.error('Response:', errorText);
      return;
    }

    const data = await response.json();
    console.log('✅ API Response:');
    console.log(`Groups count: ${data.length || 'N/A'}`);
    if (Array.isArray(data) && data.length > 0) {
      console.log(`First group: ${JSON.stringify(data[0]).substring(0, 200)}...`);
    }
    console.log('Response structure:', Object.keys(data[0] || {}));
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testAPI();
