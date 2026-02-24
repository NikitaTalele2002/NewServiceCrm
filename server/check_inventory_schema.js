import { sequelize } from './db.js';

const result = await sequelize.query(`
  SELECT COLUMN_NAME, DATA_TYPE 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_NAME = 'spare_inventory' 
  ORDER BY ORDINAL_POSITION
`, {
  type: sequelize.QueryTypes.SELECT
});

console.log('spare_inventory table columns:');
result.forEach(c => console.log(`  - ${c.COLUMN_NAME} (${c.DATA_TYPE})`));
await sequelize.close();
