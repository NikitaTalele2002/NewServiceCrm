/**
 * Quick Setup: Add Test User for Login
 */

import { sequelize } from '../db.js';
import { QueryTypes } from 'sequelize';

async function setupTestUser() {
  try {
    console.log('\n========== SETUP TEST USER ==========\n');

    // First, run the migration to ensure columns exist
    console.log('Step 1: Ensuring columns exist...');
    
    // Check and add columns if needed
    const tableInfo = await sequelize.query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'users'
    `, { type: QueryTypes.SELECT });

    const columnNames = tableInfo.map(col => col.COLUMN_NAME.toLowerCase());

    if (!columnNames.includes('email')) {
      console.log('Adding email column...');
      await sequelize.query(`ALTER TABLE users ADD email VARCHAR(100) NULL UNIQUE`);
    }

    if (!columnNames.includes('role_id')) {
      console.log('Adding role_id column...');
      await sequelize.query(`ALTER TABLE users ADD role_id INT NULL`);
    }

    console.log('✅ Columns verified\n');

    // Check for default role
    console.log('Step 2: Checking roles...');
    const existingRole = await sequelize.query(`
      SELECT TOP 1 roles_id FROM roles ORDER BY roles_id
    `, { type: QueryTypes.SELECT });

    const defaultRoleId = existingRole.length > 0 ? existingRole[0].roles_id : 1;
    console.log(`✅ Using role_id: ${defaultRoleId}\n`);

    // Check if test user exists
    console.log('Step 3: Checking for existing test user...');
    const existingUser = await sequelize.query(`
      SELECT user_id FROM users WHERE email = 'admin@system.local'
    `, { type: QueryTypes.SELECT });

    if (existingUser.length > 0) {
      console.log('⚠️  Test user already exists (admin@system.local)\n');
      const user = existingUser[0];
      console.log('Login with:');
      console.log('  Email: admin@system.local');
      console.log('  Password: admin123\n');
      return;
    }

    // Create test user
    console.log('Step 4: Creating test user...');
    await sequelize.query(`
      INSERT INTO users (name, email, password, role_id)
      VALUES (?, ?, ?, ?)
    `, {
      replacements: ['Admin User', 'admin@system.local', 'admin123', defaultRoleId],
      type: QueryTypes.INSERT
    });

    console.log('✅ Test user created!\n');
    console.log('========== LOGIN CREDENTIALS ==========\n');
    console.log('Email: admin@system.local');
    console.log('Password: admin123\n');
    console.log('========== NEXT STEPS ==========\n');
    console.log('1. Start your server: npm start');
    console.log('2. Go to http://localhost:5173 (or your frontend URL)');
    console.log('3. Log in with the credentials above\n');

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.log('\nTroubleshooting:');
    console.log('1. Make sure your database is running');
    console.log('2. Make sure server/db.js is configured correctly');
    console.log('3. Check that users table exists\n');
  } finally {
    await sequelize.close();
  }
}

setupTestUser();
