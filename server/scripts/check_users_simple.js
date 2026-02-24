/**
 * Check existing users and test login
 */

import { sequelize } from '../db.js';
import { QueryTypes } from 'sequelize';

async function checkUsers() {
  try {
    console.log('\n========== USERS IN DATABASE ==========\n');

    const users = await sequelize.query(`
      SELECT user_id, name, password
      FROM users
    `, { type: QueryTypes.SELECT });

    if (users.length === 0) {
      console.log('❌ No users found in database!\n');
      console.log('You need to add at least one user. Use these credentials:');
      console.log('  Name: admin');
      console.log('  Password: admin123\n');
      console.log('Or check your database directly to see what users exist.\n');
      return;
    }

    console.log(`Found ${users.length} user(s):\n`);
    users.forEach(user => {
      console.log(`ID: ${user.user_id}`);
      console.log(`Name: ${user.name}`);
      console.log(`Password: ${user.password}`);
      console.log('---');
    });

    console.log('\n========== LOGIN credentials ==========\n');
    console.log('Use any of these to login:\n');
    users.forEach(user => {
      console.log(`Username: ${user.name}`);
      console.log(`Password: ${user.password}\n`);
    });

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await sequelize.close();
  }
}

checkUsers();
