import jwt from 'jsonwebtoken';

const JWT_SECRET = 'supersecret_jwt_key_change_me';

// Create tokens for different service centers
const scs = [
  { id: 1, username: 'SC1User', centerId: 1, name: 'ABC Service Center' },
  { id: 1, username: 'SC2User', centerId: 2, name: 'New Service Center' },
  { id: 1, username: 'SC4User', centerId: 4, name: 'Test SC 4' }
];

console.log('\n🔐 GENERATED JWT TOKENS FOR SERVICE CENTERS\n');

scs.forEach(sc => {
  const payload = {
    id: sc.id,
    username: sc.username,
    centerId: sc.centerId,
    role: 'service_center'
  };

  const token = jwt.sign(payload, JWT_SECRET);
  console.log(`SC ${sc.centerId} (${sc.name}):`);
  console.log(`  Token: ${token}`);
  console.log(`  Use in code: token = '${token}';`);
  console.log();
});
