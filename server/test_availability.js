import http from 'http';

const payload = JSON.stringify({
  email: 'superadmin@finolexcrm.com',
  password: 'SuperAdmin@123'
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      console.log('Login response:', response);
      if (response.token) {
        console.log('Token received');
        // Now test availability
        testAvailability(response.token);
      }
    } catch (e) {
      console.log('Response:', data);
    }
  });
});

req.on('error', (e) => {
  console.error('Error:', e.message);
});

req.write(payload);
req.end();

function testAvailability(token) {
  const sku = '000000FCSMNBRNE045';
  const options2 = {
    hostname: 'localhost',
    port: 5000,
    path: '/api/spare-requests/spare-parts/' + encodeURIComponent(sku) + '/availability',
    method: 'GET',
    headers: {
      'Authorization': 'Bearer ' + token
    }
  };

  const req2 = http.request(options2, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      console.log('Availability response status:', res.statusCode);
      console.log('Availability response:', data);
    });
  });

  req2.on('error', (e) => {
    console.error('Availability error:', e.message);
  });

  req2.end();
}