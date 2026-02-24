import { sequelize } from '../models/index.js';

async function run() {
  try {
    console.log('\n=== Checking FK Constraints with SQL ===\n');

    const result = await sequelize.query(`
      SELECT 
        obj.name AS 'Constraint Name',
        tab1.name AS 'Table',
        col1.name AS 'Column',
        tab2.name AS 'Referenced Table',
        col2.name AS 'Referenced Column'
      FROM sys.foreign_key_columns fkc
      INNER JOIN sys.objects obj ON obj.object_id = fkc.constraint_object_id
      INNER JOIN sys.tables tab1 ON tab1.object_id = fkc.parent_object_id
      INNER JOIN sys.columns col1 ON col1.column_id = fkc.parent_column_id AND col1.object_id = tab1.object_id
      INNER JOIN sys.tables tab2 ON tab2.object_id = fkc.referenced_object_id
      INNER JOIN sys.columns col2 ON col2.column_id = fkc.referenced_column_id AND col2.object_id = tab2.object_id
      WHERE tab1.name IN ('customers', 'Pincodes') OR tab2.name IN ('customers', 'Pincodes')
    `);

    if (result[0].length === 0) {
      console.log('No FK constraints found involving customers or Pincodes');
      process.exit(0);
    }

    console.log('Foreign Key Constraints:');
    result[0].forEach(row => {
      console.log(`\n✓ ${row['Constraint Name']}`);
      console.log(`  ${row['Table']}.${row['Column']} → ${row['Referenced Table']}.${row['Referenced Column']}`);
    });

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

run();
