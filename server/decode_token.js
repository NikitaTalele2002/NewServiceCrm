/**
 * Decode JWT Token
 */

const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTUsInVzZXJuYW1lIjoiUlNNLVNoYXJtYS0xIiwicm9sZSI6InJzbSIsImNlbnRlcklkIjpudWxsLCJpYXQiOjE3NzE3OTk2MjMsImV4cCI6MTc3MTgyODQyM30.t7fAkmv_JDr705RC7euTv2U_nck5rkMPw9TpVwRshHk";

const parts = token.split('.');
const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());

console.log('Token Payload:');
console.log(JSON.stringify(payload, null, 2));

if (payload.rsmId) {
  console.log('\n✅ rsmId found:', payload.rsmId);
} else {
  console.log('\n❌ rsmId NOT found in token!');
  console.log('\nThis means the auth service is not including rsmId in the token.');
}
