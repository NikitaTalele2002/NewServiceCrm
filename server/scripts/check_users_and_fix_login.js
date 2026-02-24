/**
 * Script: Check Users and Fix Login Credentials
 */

import { sequelize } from '../db.js';
import { QueryTypes } from 'sequelize';

async function checkUsersAndFixLoginIssues() {
  try {
    console.log('\n========== USER AUTHENTICATION CHECK ==========\n');

    // Check users table schema
    console.log('Checking users table structure...');
    const columns = await sequelize.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'users'
      ORDER BY ORDINAL_POSITION
    `, { type: QueryTypes.SELECT });

    console.log('Users table columns:');
    columns.forEach(col => {
      console.log(`  - ${col.COLUMN_NAME}: ${col.DATA_TYPE} (${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'})`);
    });

    // Get all users
    console.log('\n\nCurrent users in database:');
    const users = await sequelize.query(`
      SELECT user_id, name, email, password, role_id
      FROM users
    `, { type: QueryTypes.SELECT });

    if (users.length === 0) {
      console.log('  ⚠️  No users found in database!');
    } else {
      console.log(`Found ${users.length} user(s):\n`);
      users.forEach((user, index) => {
        console.log(`  ${index + 1}. User ID: ${user.user_id}`);
        console.log(`     Name: ${user.name}`);
        console.log(`     Email: ${user.email || '(not set)'}`);
        console.log(`     Password: ${user.password}`);
        console.log(`     Role ID: ${user.role_id || '(not set)'}`);
        console.log('');
      });
    }

    // Check for authentication issues
    console.log('\n========== AUTHENTICATION STATUS ==========\n');

    const issues = [];
    
    for (const user of users) {
      if (!user.email) {
        issues.push(`User ${user.user_id} (${user.name}): Missing email`);
      }
      if (!user.role_id) {
        issues.push(`User ${user.user_id} (${user.name}): Missing role_id`);
      }
      if (!user.password) {
        issues.push(`User ${user.user_id} (${user.name}): Missing password`);
      }
    }

    if (issues.length > 0) {
      console.log('⚠️  Authentication Issues Found:');
      issues.forEach(issue => console.log(`  - ${issue}`));
      console.log('\nTo fix these issues, run:');
      console.log('  node server/scripts/migrate_users_table.js');
    } else if (users.length > 0) {
      console.log('✅ All users have required fields for authentication!\n');
      console.log('Login Credentials (use these to test):');
      console.log('─'.repeat(50));
      users.forEach(user => {
        const loginMethod = user.email ? 'Email' : 'Name';
        const loginValue = user.email || user.name;
        console.log(`${loginMethod}: ${loginValue}`);
        console.log(`Password: ${user.password}`);
        console.log('');
      });
    }

    // Check roles table
    console.log('\n========== AVAILABLE ROLES ==========\n');
    const roles = await sequelize.query(`
      SELECT roles_id, roles_name
      FROM roles
    `, { type: QueryTypes.SELECT });

    if (roles.length === 0) {
      console.log('⚠️  No roles found in database');
    } else {
      console.log('Available roles:');
      roles.forEach(role => {
        console.log(`  - ID ${role.roles_id}: ${role.roles_name}`);
      });
    }

    console.log('\n========== WHAT TO DO NEXT ==========\n');
    if (users.length === 0) {
      console.log('1. Add a test user to the database');
      console.log('2. Make sure email and password are set');
      console.log('3. Try logging in with: EMAIL and PASSWORD');
    } else if (issues.length > 0) {
      console.log('1. Run migration: node server/scripts/migrate_users_table.js');
      console.log('2. Use the displayed credentials to login');
    } else {
      console.log('1. Use one of the credentials above to login');
      console.log('2. If login still fails, check the server logs');
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await sequelize.close();
  }
}

checkUsersAndFixLoginIssues();
