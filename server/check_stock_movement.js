import { sequelize } from './db.js';

(async () => {
  try {
    await sequelize.authenticate();
    const result = await sequelize.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'stock_movement'
      ORDER BY ORDINAL_POSITION
    `, { type: 'SELECT' });
    console.log('stock_movement table columns:');
    result.forEach(col => {
      console.log(`  - ${col.COLUMN_NAME} (${col.DATA_TYPE}) ${col.IS_NULLABLE === 'YES' ? 'nullable' : 'NOT NULL'}`);
    });
    await sequelize.close();
  } catch(e) {
    console.error('Error:', e.message);
  }
})();
