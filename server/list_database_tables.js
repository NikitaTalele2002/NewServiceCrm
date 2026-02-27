import { sequelize } from './db.js';

try {
  const [result] = await sequelize.query(`
    SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE'
    ORDER BY TABLE_NAME
  `);
  
  console.log('\n=== ALL TABLES IN DATABASE ===\n');
  result.forEach(row => {
    console.log(' -', row.TABLE_NAME);
  });
  
  process.exit(0);
} catch(e) {
  console.error(e.message);
  process.exit(1);
}
