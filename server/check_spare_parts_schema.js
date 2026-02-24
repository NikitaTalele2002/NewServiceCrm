/**
 * Check Spare Parts Schema
 */

import { sequelize } from './db.js';
import { QueryTypes } from 'sequelize';

async function checkSchema() {
  try {
    const columns = await sequelize.query(`
      SELECT COLUMN_NAME, DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'spare_parts'
      ORDER BY ORDINAL_POSITION
    `, { type: QueryTypes.SELECT });

    console.log('✅ Spare Parts Columns:');
    columns.forEach(c => console.log(`  - ${c.COLUMN_NAME} (${c.DATA_TYPE})`));

    console.log('\n📋 Sample Parts:');
    const parts = await sequelize.query(`
      SELECT TOP 5 Id, PART, DESCRIPTION FROM spare_parts
    `, { type: QueryTypes.SELECT });

    parts.forEach(p => {
      console.log(`  - ID: ${p.Id}, Code: ${p.PART}, Desc: ${p.DESCRIPTION}`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
}

checkSchema();
