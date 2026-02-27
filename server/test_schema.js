import { sequelize } from './db.js';

(async () => {
  try {
    console.log('Checking spare_request_items table schema...\n');
    const columns = await sequelize.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'spare_request_items'
      ORDER BY ORDINAL_POSITION
    `, { type: sequelize.QueryTypes.SELECT });

    console.log('spare_request_items columns:');
    const colNames = [];
    columns.forEach(col => {
      console.log(`  - ${col.COLUMN_NAME} (${col.DATA_TYPE})`);
      colNames.push(col.COLUMN_NAME);
    });

    const hasCallUsageId = colNames.includes('call_usage_id');
    console.log(`\ncall_usage_id exists: ${hasCallUsageId ? 'YES' : 'NO ❌'}`);
    console.log(`\nAll columns: ${colNames.join(', ')}`);
    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
