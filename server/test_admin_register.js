const http = require('http');

const payload = {
  name: 'Super Admin User',
  email: 'superadmin@finolexcrm.com',
  mobileNo: '9999999999',
  password: 'SuperAdmin@123',
  role: 'super_admin'
};

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/admin/register',
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
    console.log('Response:', JSON.stringify(JSON.parse(data), null, 2));
    process.exit(0);
  });
});

req.on('error', (e) => {
  console.error('Error:', e.message);
  process.exit(1);
});

req.write(JSON.stringify(payload));
req.end();
