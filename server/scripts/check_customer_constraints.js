import { sequelize } from '../models/index.js';

async function run() {
  try {
    console.log('\n=== Checking Constraints on customers table ===\n');

    const constraints = await sequelize.query(`
      SELECT 
        CONSTRAINT_NAME,
        CONSTRAINT_TYPE
      FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
      WHERE TABLE_NAME = 'customers' AND TABLE_SCHEMA = 'dbo'
    `);

    console.log('Constraints on customers table:');
    constraints[0].forEach(con => {
      console.log(`  - ${con.CONSTRAINT_NAME}: ${con.CONSTRAINT_TYPE}`);
    });

    // Also check FK details
    console.log('\n=== FK Details ===\n');
    const fks = await sequelize.query(`
      SELECT 
        CONSTRAINT_NAME,
        COLUMN_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_NAME = 'customers' AND REFERENCED_TABLE_NAME IS NOT NULL
    `);

    console.log('Foreign Keys:');
    fks[0].forEach(fk => {
      console.log(`  - ${fk.CONSTRAINT_NAME}`);
      console.log(`    Column: ${fk.COLUMN_NAME} → ${fk.REFERENCED_TABLE_NAME}.${fk.REFERENCED_COLUMN_NAME}`);
    });

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

run();
