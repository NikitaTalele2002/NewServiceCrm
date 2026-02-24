/**
 * Check spare_requests table structure
 */

import { sequelize } from './db.js';

async function checkTable() {
  try {
    console.log('Checking spare_requests table structure...\n');

    // Show table columns
    const columns = await sequelize.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'spare_requests'
      ORDER BY ORDINAL_POSITION
    `, { raw: true });

    console.log('Columns in spare_requests:');
    columns[0].forEach(col => {
      console.log(`  - ${col.COLUMN_NAME} (${col.DATA_TYPE}, ${col.IS_NULLABLE})`);
    });

    // Show sample data
    console.log('\nSample spare_requests records:');
    const samples = await sequelize.query(`
      SELECT TOP 5 * FROM spare_requests
    `, { raw: true });

    if (samples[0] && samples[0].length > 0) {
      console.log(JSON.stringify(samples[0][0], null, 2));
    } else {
      console.log('No records found');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
}

checkTable();
