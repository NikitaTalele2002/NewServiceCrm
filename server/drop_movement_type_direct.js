/**
 * Direct SQL drop of movement_type column
 * Using raw SQL query without error handling complications
 */

import { sequelize } from './db.js';

async function dropColumn() {
  try {
    console.log('=== Attempting to drop movement_type column ===\n');

    // Simple direct drop
    console.log('Executing: ALTER TABLE stock_movement DROP COLUMN movement_type;\n');
    
    const result = await sequelize.query(`
      ALTER TABLE stock_movement DROP COLUMN movement_type
    `);

    console.log('✅ SUCCESS: Column dropped successfully!\n');

    // Verify
    console.log('Verifying removal...');
    const [cols] = await sequelize.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'stock_movement' 
      AND COLUMN_NAME LIKE '%movement%'
      ORDER BY ORDINAL_POSITION
    `);

    console.log('\nRemaining columns with "movement" in name:');
    if (cols.length === 0) {
      console.log('(none - old movement_type is gone!)');
    } else {
      cols.forEach(c => console.log(`  - ${c.COLUMN_NAME}`));
    }

    console.log('\n✅ Migration complete!');

  } catch (error) {
    console.error('\n❌ Error:', error.message || error.toString());
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

dropColumn();
