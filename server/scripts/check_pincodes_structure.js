import { sequelize } from '../models/index.js';

async function run() {
  try {
    console.log('\n=== Checking Pincodes Table Structure ===\n');

    const result = await sequelize.query(`
      SELECT 
        COLUMN_NAME,
        DATA_TYPE,
        IS_NULLABLE,
        COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'Pincodes' AND TABLE_SCHEMA = 'dbo'
      ORDER BY ORDINAL_POSITION
    `);

    console.log('Columns in Pincodes table:');
    result[0].forEach(col => {
      console.log(`  - ${col.COLUMN_NAME}: ${col.DATA_TYPE} (Nullable: ${col.IS_NULLABLE})`);
    });

    // Check if VALUE column has a unique constraint
    console.log('\n=== Checking Unique Constraints ===\n');
    
    const constraints = await sequelize.query(`
      SELECT 
        CONSTRAINT_NAME,
        COLUMN_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_NAME = 'Pincodes' AND TABLE_SCHEMA = 'dbo'
    `);

    console.log('Key constraints:');
    constraints[0].forEach(con => {
      console.log(`  - ${con.CONSTRAINT_NAME}: ${con.COLUMN_NAME}`);
    });

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

run();
