/**
 * Check Users Table Schema
 */

import { sequelize } from './db.js';
import { QueryTypes } from 'sequelize';

async function checkUsersSchema() {
  try {
    console.log('Checking users table schema...\n');

    const columns = await sequelize.query(`
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'users'
      ORDER BY ORDINAL_POSITION
    `, { type: QueryTypes.SELECT });

    if (columns.length === 0) {
      console.log('❌ users table not found!');
    } else {
      console.log('✅ Users Table Columns:');
      columns.forEach(col => {
        console.log(`  - ${col.COLUMN_NAME} (${col.DATA_TYPE})`);
      });
    }

    // Show sample users
    console.log('\n📋 Sample Users:');
    const users = await sequelize.query(`
      SELECT TOP 20 * FROM users
    `, { type: QueryTypes.SELECT });

    users.forEach(u => {
      console.log(`  - ID: ${u.user_id}, Name: ${u.name || u.user_name || 'N/A'}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message || error);
  } finally {
    process.exit(0);
  }
}

checkUsersSchema();
