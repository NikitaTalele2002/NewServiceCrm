const http = require('http');

const payload = {
  email: 'superadmin@finolexcrm.com',
  password: 'SuperAdmin@123'
};

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/admin/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    try {
      const response = JSON.parse(data);
      console.log('\n✅ Admin Login Successful!');
      console.log('\nResponse:', JSON.stringify(response, null, 2));
    } catch (e) {
      console.log('Response:', data);
    }
    process.exit(0);
  });
});

req.on('error', (e) => {
  console.error('Error:', e.message);
  process.exit(1);
});

req.write(JSON.stringify(payload));
req.end();
