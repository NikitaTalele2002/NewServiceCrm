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

console.log('🔐 Generated JWT Token:');
console.log(token);
console.log('\nPayload:', payload);
console.log('\nUse this token in your API calls:');
console.log(`Authorization: Bearer ${token}`);
