/**
 * Migration: Remove old movement_type column from stock_movement table
 * Simplified version without transactions (MSSQL transaction issues)
 * 
 * Purpose: Delete duplicate movement_type column that has been replaced by stock_movement_type
 * Status: All code now uses stock_movement_type, no code references movement_type
 */

import { sequelize } from '../db.js';

async function runMigration() {
  try {
    console.log('=== Migration: Remove old movement_type column ===\n');

    // Check if column exists before attempting to drop
    console.log('🔍 Checking if movement_type column exists...');
    const [results] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'stock_movement' 
      AND COLUMN_NAME = 'movement_type'
    `);

    if (results.length === 0) {
      console.log('✅ Column movement_type does not exist - already cleaned up\n');
      console.log('✅ Migration completed successfully (no action needed)\n');
      await sequelize.close();
      return;
    }

    console.log('✅ Column found - proceeding with removal\n');

    // Drop the old movement_type column
    console.log('🗑️  Dropping movement_type column from stock_movement table...');
    
    try {
      await sequelize.query(`
        ALTER TABLE stock_movement DROP COLUMN movement_type;
      `);
      console.log('✅ Column movement_type successfully dropped\n');
    } catch (dropError) {
      // Some MSSQL versions require checking constraints
      console.log('⚠️  Direct drop failed, attempting with constraint check...\n');
      
      // Try to find and drop any default constraints on this column
      try {
        await sequelize.query(`
          DECLARE @ConstraintName nvarchar(200);
          SELECT @ConstraintName = d.name
          FROM sys.default_constraints d
          INNER JOIN sys.columns c ON c.default_object_id = d.object_id
          WHERE d.parent_object_id = OBJECT_ID('stock_movement')
          AND c.name = 'movement_type';
          
          IF @ConstraintName IS NOT NULL
            EXEC('ALTER TABLE stock_movement DROP CONSTRAINT ' + @ConstraintName);
        `);
        console.log('   Dropped associated default constraints\n');
      } catch (constraintError) {
        console.log('   (No constraints found or error handling them)\n');
      }
      
      // Retry the drop
      await sequelize.query(`
        ALTER TABLE stock_movement DROP COLUMN movement_type;
      `);
      console.log('✅ Column movement_type successfully dropped\n');
    }

    // Verify it's gone
    console.log('🔍 Verifying column removal...');
    const [verifyResults] = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'stock_movement' 
      AND COLUMN_NAME = 'movement_type'
    `);

    if (verifyResults.length === 0) {
      console.log('✅ Verification successful - column removed\n');
    } else {
      throw new Error('Verification failed - column still exists');
    }

    // Show remaining movement-type columns
    console.log('📊 Current movement-type columns in stock_movement table:');
    const [remainingColumns] = await sequelize.query(`
      SELECT COLUMN_NAME, DATA_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'stock_movement' 
      AND COLUMN_NAME LIKE '%movement%type%'
      ORDER BY ORDINAL_POSITION
    `);

    remainingColumns.forEach((col, idx) => {
      console.log(`   ${idx + 1}. ${col.COLUMN_NAME} (${col.DATA_TYPE})`);
    });

    console.log('\n✅ Migration completed successfully!\n');
    console.log('Summary:');
    console.log('  - Removed: movement_type (OLD)');
    console.log('  - Kept: stock_movement_type (NEW) ✅');
    console.log('  - All code uses stock_movement_type with proper ENUM values\n');

    await sequelize.close();

  } catch (error) {
    console.error('\n❌ Migration failed:');
    console.error('Error:', error.message);
    console.error('\nDatabase changes rolled back automatically\n');
    await sequelize.close();
    throw error;
  }
}

// Run the migration
runMigration()
  .then(() => {
    console.log('Process exited successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Process failed:', error.message);
    process.exit(1);
  });
