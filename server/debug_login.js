/**
 * Debug Login Response
 */

const API_BASE = 'http://localhost:5000';

async function debugLogin() {
  console.log('🔍 Debugging Login Response\n');
  
  const credentials = {
    username: 'RSM-Sharma-1',
    password: 'password123'
  };

  try {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });

    console.log(`Status: ${res.status}`);
    console.log(`Headers: ${res.headers.get('content-type')}\n`);

    const text = await res.text();
    console.log('Raw Response:');
    console.log(text);
    console.log();

    try {
      const data = JSON.parse(text);
      console.log('Parsed JSON:');
      console.log(JSON.stringify(data, null, 2));
    } catch (e) {
      console.log('Could not parse as JSON');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Make sure server is running on port 5000');
  }
}

debugLogin();
