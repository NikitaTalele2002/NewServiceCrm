const jwt = require('jsonwebtoken');

const JWT_SECRET = 'supersecret_jwt_key_change_me';

// Create a token for service center with ID 2 (New Service Center - has test data)
const payload = {
  id: 1,
  username: 'SC2User',
  centerId: 2,
  role: 'service_center'
};

const token = jwt.sign(payload, JWT_SECRET);

console.log('🔐 Generated JWT Token for SC 2:');
console.log(token);
console.log('\nPayload:', payload);
console.log('\nUse this token in your API calls:');
console.log(`Authorization: Bearer ${token}`);

