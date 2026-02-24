// Usage: node get_branch_token.js <username> <password>
import fetch from 'node-fetch';

const [,, username, password] = process.argv;
if (!username || !password) {
  console.error('Usage: node get_branch_token.js <username> <password>');
  process.exit(1);
}

const API_URL = 'http://localhost:5000/api/auth/login';

async function getToken() {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (res.ok && data.token) {
      console.log('\n[LOGIN SUCCESS] Token for', username, ':\n');
      console.log(data.token);
      process.exit(0);
    } else {
      console.error('\n[LOGIN FAILED]', data.error || data.message || data);
      process.exit(2);
    }
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(3);
  }
}

getToken();
