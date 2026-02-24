import { sequelize } from './db.js';

const tables = ['plants', 'service_centers', 'spare_parts', 'spare_requests'];

for (const table of tables) {
  const result = await sequelize.query(`
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '${table}'
  `, { type: sequelize.QueryTypes.SELECT });
  
  console.log(`\n${table} columns:`);
  result.forEach(col => console.log(`  - ${col.COLUMN_NAME}`));
}

await sequelize.close();
process.exit(0);
