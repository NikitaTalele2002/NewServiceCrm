import { sequelize, Users } from './models/index.js';
import { connectDB } from './db.js';

const checkUsers = async () => {
  try {
    await connectDB();
    
    console.log('\n📋 ===== USERS IN DATABASE =====\n');
    const users = await Users.findAll();
    
    if(users.length === 0) {
      console.log('❌ No users found in database!');
      console.log('\nTo create a test user, run this SQL:');
      console.log(`
INSERT INTO users (name, email, password, role_id, status)
VALUES ('Call Center Agent', 'call_center@company.com', 'Call@123', 1, 'active');
      `);
    } else {
      users.forEach((u, idx) => {
        console.log(`${idx + 1}. User ID: ${u.user_id}`);
        console.log(`   Name: ${u.name}`);
        console.log(`   Email: ${u.email}`);
        console.log(`   Password: ${u.password}`);
        console.log(`   Role ID: ${u.role_id}`);
        console.log(`   Status: ${u.status}`);
        console.log('');
      });
    }
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
};

checkUsers();
