import { sequelize } from '../db.js';
import bcrypt from 'bcryptjs';

(async () => {
  try {
    console.log('Creating admin user...');

    // Hash the password
    const hashedPassword = await bcrypt.hash('Admin@123', 10);

    // Insert into Users table
    await sequelize.query(`
      INSERT INTO Users (Username, Password, Role, Email)
      VALUES ('admin', '${hashedPassword}', 'admin', 'admin@crm.com')
    `);

    console.log('Admin user created successfully!');
    console.log('Username: admin');
    console.log('Password: Admin@123');
    console.log('Role: admin');

    process.exit(0);
  } catch (err) {
    console.error('Error creating admin user:', err.message);
    process.exit(1);
  }
})();