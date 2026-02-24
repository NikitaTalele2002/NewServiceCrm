/**
 * Check current table structure
 */

import { sequelize } from './db.js';

async function checkTable() {
  try {
    console.log('Checking logistics_document_items table structure...\n');

    const result = await sequelize.query(
      `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'logistics_document_items' ORDER BY ORDINAL_POSITION`
    );

    if (result[0].length === 0) {
      console.log('❌ Table does not exist!');
      process.exit(1);
    }

    console.log('✅ Current Columns:');
    console.log('┌─────────────────────┬──────────────┬───────────────┐');
    console.log('│ COLUMN_NAME         │ DATA_TYPE    │ IS_NULLABLE   │');
    console.log('├─────────────────────┼──────────────┼───────────────┤');
    result[0].forEach(row => {
      const colName = row.COLUMN_NAME.padEnd(19);
      const dataType = row.DATA_TYPE.padEnd(12);
      const nullable = row.IS_NULLABLE.padEnd(13);
      console.log(`│ ${colName} │ ${dataType} │ ${nullable} │`);
    });
    console.log('└─────────────────────┴──────────────┴───────────────┘');

    // Check row count
    const countResult = await sequelize.query(
      `SELECT COUNT(*) as count FROM logistics_document_items`
    );
    console.log(`\n📊 Row Count: ${countResult[0][0].count}`);

    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

checkTable();
