const http = require('http');

const payload = {
  mobileNo: '9000000001',
  name: 'Test Customer',
  state: 'Maharashtra',
  city: 'Pune',
  complaintId: null,
  customerId: null,
  callInfo: {
    CallType: 'Complaint',
    CallStatus: 'Open',
    CustomerRemarks: 'Device not working properly',
    ProductId: 1,
    ProductSerialNo: 'SN-EX-100-1'
  },
  product: {
    Id: 1,
    ProductSerialNo: 'SN-EX-100-1'
  }
};

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/complaints',
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
    console.log('Response:', data);
    process.exit(0);
  });
});

req.on('error', (e) => {
  console.error('Error:', e.message);
  process.exit(1);
});

req.write(JSON.stringify(payload));
req.end();
