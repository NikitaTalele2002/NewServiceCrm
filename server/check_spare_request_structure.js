import { sequelize } from './db.js';

console.log('\n📋 === SPARE REQUEST STRUCTURE ===\n');

try {
  // Check spare_requests columns
  const columns = await sequelize.query(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = 'spare_requests'
    ORDER BY ORDINAL_POSITION
  `, { type: sequelize.QueryTypes.SELECT });

  console.log('Spare Requests Columns:');
  columns.forEach(col => console.log(`  - ${col.COLUMN_NAME}`));

  // Check a sample spare request
  const sr = await sequelize.query(`
    SELECT TOP 1 * FROM spare_requests WHERE request_id = 25
  `, { type: sequelize.QueryTypes.SELECT });

  if (sr.length > 0) {
    console.log('\nSample Spare Request (ID 25):');
    Object.entries(sr[0]).forEach(([key, value]) => {
      if (value !== null) {
        console.log(`  ${key}: ${value}`);
      }
    });
  }

} catch (error) {
  console.error('❌ Error:', error.message);
}

await sequelize.close();
