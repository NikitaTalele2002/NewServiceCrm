import { sequelize } from './db.js';
import { QueryTypes } from 'sequelize';

try {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 TECHNICIANS TABLE SCHEMA');
  console.log('='.repeat(80));

  // Get actual column names
  const columns = await sequelize.query(`
    SELECT COLUMN_NAME, DATA_TYPE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'technicians'
    ORDER BY ORDINAL_POSITION
  `, { type: QueryTypes.SELECT });

  console.log('\n📋 Technician table columns:');
  columns.forEach(c => {
    console.log(`   - ${c.COLUMN_NAME} (${c.DATA_TYPE})`);
  });

  console.log('\n📌 Sample technician record with all fields:');
  const tech = await sequelize.query(`
    SELECT * FROM technicians WHERE technician_id = 2
  `, { type: QueryTypes.SELECT });

  if (tech.length > 0) {
    console.log('\nTechnician 2 fields:');
    Object.entries(tech[0]).forEach(([key, value]) => {
      console.log(`   - ${key}: ${value}`);
    });
  }

  process.exit(0);
} catch (e) {
  console.error('❌ Error:', e.message);
  process.exit(1);
}
