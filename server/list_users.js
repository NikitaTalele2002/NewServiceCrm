import { Users } from './models/index.js';

try {
  const users = await Users.findAll({ 
    attributes: ['user_id', 'name', 'password'],
    limit: 30 
  });
  
  console.log('\n📋 Available Users in Database:');
  console.log('═'.repeat(70));
  users.forEach(u => {
    const pwd = u.password ? u.password.substring(0, 10) : 'no-pwd';
    console.log(`  ID: ${u.user_id.toString().padEnd(4)} | Name: ${u.name?.padEnd(35)} | Pwd: ${pwd}`);
  });
  console.log('═'.repeat(70));
  process.exit(0);
} catch(err) {
  console.error('Error:', err.message);
  process.exit(1);
}
