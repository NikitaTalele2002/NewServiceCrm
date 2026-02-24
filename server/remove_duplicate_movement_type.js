import { sequelize } from './db.js';

async function removeMovementTypeDuplicate() {
  try {
    console.log('=== Removing Duplicate movement_type Column ===\n');

    // Step 1: Drop the old movement_type column (we're keeping stock_movement_type)
    console.log('Dropping old movement_type column...');
    await sequelize.query(
      `ALTER TABLE stock_movement DROP COLUMN movement_type`
    );
    console.log('✅ Dropped movement_type column');

    // Step 2: Check for other unused columns and drop if needed
    const checkColumns = await sequelize.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_NAME = 'stock_movement' 
       AND COLUMN_NAME IN ('bucket_impact', 'sap_process', 'sap_integration')`,
      { type: sequelize.QueryTypes.SELECT }
    );

    if (checkColumns.length > 0) {
      console.log('\nFound additional legacy columns to clean up:');
      checkColumns.forEach(col => console.log(`  - ${col.COLUMN_NAME}`));
      
      for (const col of checkColumns) {
        console.log(`Dropping ${col.COLUMN_NAME}...`);
        await sequelize.query(
          `ALTER TABLE stock_movement DROP COLUMN ${col.COLUMN_NAME}`
        );
        console.log(`✅ Dropped ${col.COLUMN_NAME}`);
      }
    }

    console.log('\n=== Summary ===');
    console.log('✅ Removed duplicate movement_type column');
    console.log('✅ Kept stock_movement_type as the single source of truth');
    console.log('✅ Cleaned up legacy columns');
    console.log('\nColumns now use stock_movement_type for:');
    console.log('  - ASC_RETURN_DEFECTIVE_OUT');
    console.log('  - FILLUP_DISPATCH');
    console.log('  - And other detailed movement types');

    process.exit(0);
  } catch (e) {
    console.error('❌ Error Details:', e);
    console.error('❌ Message:', e.message);
    if (e.original) {
      console.error('❌ Original Error:', e.original.message);
    }
    process.exit(1);
  }
}

removeMovementTypeDuplicate();
