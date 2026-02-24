import fetch from 'node-fetch';

(async () => {
  try {
    // Replace YOUR_TOKEN_HERE with the actual token from browser localStorage.getItem('token')
    const res = await fetch('http://localhost:5000/api/branch/branch-requests', {
      headers: {
        'Authorization': 'Bearer YOUR_TOKEN_HERE',
        'Content-Type': 'application/json'
      }
    });
    if (!res.ok) {
      console.log('Status:', res.status, res.statusText);
      return;
    }
    const data = await res.json();
    console.log('API Response:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  }
})();