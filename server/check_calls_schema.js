import { sequelize } from './db.js';

async function checkCallsTableSchema() {
  try {
    console.log('\n=== Checking Calls Table Schema ===\n');

    // Get table information
    const columns = await sequelize.query(
      `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_NAME = 'calls'
       ORDER BY ORDINAL_POSITION`,
      { type: sequelize.QueryTypes.SELECT }
    );

    console.log('Cancellation-related columns:');
    columns.forEach(col => {
      if (col.COLUMN_NAME.toLowerCase().includes('cancel') || 
          col.COLUMN_NAME.toLowerCase().includes('closure')) {
        console.log(`  - ${col.COLUMN_NAME}: ${col.DATA_TYPE} (Nullable: ${col.IS_NULLABLE})`);
      }
    });

    console.log('\nAll columns with "user" in name:');
    columns.forEach(col => {
      if (col.COLUMN_NAME.toLowerCase().includes('user')) {
        console.log(`  - ${col.COLUMN_NAME}: ${col.DATA_TYPE} (Nullable: ${col.IS_NULLABLE})`);
      }
    });

    console.log('\n=== Test Complete ===\n');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkCallsTableSchema();
