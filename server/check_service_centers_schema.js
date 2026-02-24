/**
 * Check Service Centers Table Schema
 */

import { sequelize } from './db.js';
import { QueryTypes } from 'sequelize';

async function checkSchema() {
  try {
    console.log('Checking service_centers table schema...\n');

    // Get all columns from information_schema
    const columns = await sequelize.query(`
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE,
        COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'service_centers'
      ORDER BY ORDINAL_POSITION
    `, { type: QueryTypes.SELECT });

    if (columns.length === 0) {
      console.log('❌ service_centers table not found!');
    } else {
      console.log('✅ Service Centers Table Columns:');
      columns.forEach(col => {
        console.log(`  - ${col.COLUMN_NAME} (${col.DATA_TYPE}, Nullable: ${col.IS_NULLABLE})`);
      });
    }

    // Also check if service_centers exists at all
    const tables = await sequelize.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `, { type: QueryTypes.SELECT });

    console.log('\n📋 All Tables in Database:');
    tables.forEach(t => {
      if (t.TABLE_NAME.toLowerCase().includes('service') || t.TABLE_NAME.toLowerCase().includes('center') || t.TABLE_NAME.toLowerCase().includes('asc')) {
        console.log(`  * ${t.TABLE_NAME}`);
      } else {
        console.log(`  - ${t.TABLE_NAME}`);
      }
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.original && error.original.errors) {
      error.original.errors.forEach((err, i) => {
        console.error(`  Error ${i + 1}:`, err.message);
      });
    }
  } finally {
    process.exit(0);
  }
}

checkSchema();
