import { sequelize } from '../models/index.js';

async function run() {
  try {
    console.log('\n=== Checking All FKs in Database ===\n');

    const result = await sequelize.query(`
      SELECT 
        CONSTRAINT_NAME,
        TABLE_NAME,
        COLUMN_NAME,
        REFERENCED_TABLE_NAME,
        REFERENCED_COLUMN_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE REFERENCED_TABLE_NAME IS NOT NULL 
        AND (TABLE_NAME = 'customers' OR REFERENCED_TABLE_NAME = 'customers' OR TABLE_NAME = 'Pincodes')
    `);

    console.log('Foreign Keys involving customers or Pincodes:');
    result[0].forEach(fk => {
      console.log(`  ${fk.CONSTRAINT_NAME}`);
      console.log(`    ${fk.TABLE_NAME}.${fk.COLUMN_NAME} → ${fk.REFERENCED_TABLE_NAME}.${fk.REFERENCED_COLUMN_NAME}`);
    });

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

run();
