import { sequelize } from './db.js';

const query = ` SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'dbo' ORDER BY TABLE_NAME`;

try {
  const tables = await sequelize.query(query, { type: sequelize.QueryTypes.SELECT });
  console.log('All tables in database:');
  tables.forEach(t => console.log(' -', t.TABLE_NAME));
  
  const inventoryTables = tables.filter(t => t.TABLE_NAME.toLowerCase().includes('inventory'));
  console.log('\n\n Inventory-related tables:');
  inventoryTables.forEach(t => console.log(' -', t.TABLE_NAME));
  
  process.exit(0);
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
