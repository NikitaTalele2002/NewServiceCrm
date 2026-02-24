/**
 * Migration Script: Add email and role_id columns to users table
 * Run this to update your database schema
 */

import { sequelize } from '../db.js';
import { QueryTypes } from 'sequelize';

async function migrateUsersTable() {
  try {
    console.log('\n========== USERS TABLE MIGRATION ==========\n');

    // Check if columns exist
    console.log('Checking for existing columns...');
    
    const tableInfo = await sequelize.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'users'
    `, { type: QueryTypes.SELECT });

    const columnNames = tableInfo.map(col => col.COLUMN_NAME.toLowerCase());
    console.log('Existing columns:', columnNames);

    // Add email column if it doesn't exist
    if (!columnNames.includes('email')) {
      console.log('\n Adding email column...');
      await sequelize.query(`
        ALTER TABLE users
        ADD email VARCHAR(100) NULL UNIQUE
      `);
      console.log('✅ Email column added');
    } else {
      console.log('✅ Email column already exists');
    }

    // Add role_id column if it doesn't exist
    if (!columnNames.includes('role_id')) {
      console.log('\n Adding role_id column...');
      await sequelize.query(`
        ALTER TABLE users
        ADD role_id INT NULL
      `);
      console.log('✅ Role_id column added');
    } else {
      console.log('✅ Role_id column already exists');
    }

    // Get all users and set default role_id if missing
    console.log('\n Verifying user data...');
    const users = await sequelize.query(`
      SELECT user_id, name, email, role_id 
      FROM users
    `, { type: QueryTypes.SELECT });

    console.log(`Total users in database: ${users.length}`);

    if (users.length > 0) {
      console.log('\nCurrent users:');
      users.forEach(user => {
        console.log(`  - ID: ${user.user_id}, Name: ${user.name}, Email: ${user.email}, Role: ${user.role_id}`);
      });

      // Update users without email - use name as email
      const usersWithoutEmail = users.filter(u => !u.email);
      if (usersWithoutEmail.length > 0) {
        console.log(`\nUpdating ${usersWithoutEmail.length} users with email derived from name...`);
        for (const user of usersWithoutEmail) {
          const email = `${user.name.toLowerCase().replace(/\s+/g, '.')}@system.local`;
          await sequelize.query(`
            UPDATE users 
            SET email = ? 
            WHERE user_id = ?
          `, { replacements: [email, user.user_id], type: QueryTypes.UPDATE });
          console.log(`  ✅ User ${user.user_id}: email set to ${email}`);
        }
      }

      // Update users without role_id - set to 1 (default)
      const usersWithoutRole = users.filter(u => !u.role_id);
      if (usersWithoutRole.length > 0) {
        console.log(`\nUpdating ${usersWithoutRole.length} users with default role_id = 1...`);
        await sequelize.query(`
          UPDATE users 
          SET role_id = 1 
          WHERE role_id IS NULL
        `, { type: QueryTypes.UPDATE });
        console.log('✅ Default role_id set for users');
      }
    } else {
      console.log('\nℹ️  No users found in database. Users can be created through the API.');
    }

    console.log('\n========== MIGRATION COMPLETE ==========\n');
    console.log('Users table is now ready for authentication.');
    console.log('\nTo test login:');
    console.log('1. Add a test user to the database (or use existing users)');
    console.log('2. Use the email and password to login\n');

  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

migrateUsersTable();
