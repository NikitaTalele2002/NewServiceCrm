import { sequelize } from './db.js';

(async () => {
  try {
    const [constraints] = await sequelize.query(`
      SELECT CONSTRAINT_NAME, CHECK_CLAUSE 
      FROM INFORMATION_SCHEMA.CHECK_CONSTRAINTS 
      WHERE TABLE_NAME = 'stock_movement'
    `);

    console.log('\nCHECK constraints on stock_movement table:\n');
    constraints.forEach(r => {
      console.log('Constraint:', r.CONSTRAINT_NAME);
      console.log('Clause:', (r.CHECK_CLAUSE || 'N/A'));
      console.log('');
    });

    // Also check the column type directly
    const [columns] = await sequelize.query(`
      SELECT COLUMN_NAME, DATA_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'stock_movement' 
      AND COLUMN_NAME = 'reference_type'
    `);

    console.log('reference_type column:');
    columns.forEach(c => {
      console.log(`  Name: ${c.COLUMN_NAME}`);
      console.log(`  Type: ${c.DATA_TYPE}`);
    });

    process.exit(0);
  } catch(e) {
    console.error(e.message);
    process.exit(1);
  }
})();
