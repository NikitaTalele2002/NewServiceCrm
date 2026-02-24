/**
 * Migration: Add status column to stock_movement table if it doesn't exist
 * Run this script to ensure the database table matches the model
 */

import { sequelize } from './db.js';

async function migrateStockMovement() {
  console.log('🔧 === STOCK MOVEMENT TABLE MIGRATION ===\n');

  try {
    console.log('📝 Checking stock_movement table structure...\n');

    // Get current columns
    const [columns] = await sequelize.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'stock_movement'
      ORDER BY ORDINAL_POSITION
    `);

    console.log('Current columns:');
    columns.forEach(col => {
      console.log(`  ✓ ${col.COLUMN_NAME}: ${col.DATA_TYPE} (nullable: ${col.IS_NULLABLE})`);
    });

    // Check if status column exists
    const hasStatus = columns.some(col => col.COLUMN_NAME === 'status');

    if (!hasStatus) {
      console.log('\n⚠️  status column NOT FOUND - Adding it...\n');

      // Add status column (SQL Server syntax - VARCHAR with CHECK constraint)
      await sequelize.query(`
        ALTER TABLE stock_movement
        ADD status VARCHAR(50) NOT NULL DEFAULT 'pending'
        CONSTRAINT chk_status_values CHECK (status IN ('pending', 'in_transit', 'completed', 'cancelled'))
      `);

      console.log('✅ status column added successfully!\n');

      // Verify
      const [updatedColumns] = await sequelize.query(`
        SELECT COLUMN_NAME, DATA_TYPE, COLUMN_DEFAULT
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'stock_movement' AND COLUMN_NAME = 'status'
      `);

      if (updatedColumns.length > 0) {
        const col = updatedColumns[0];
        console.log('✅ Verification:');
        console.log(`   Column Name: ${col.COLUMN_NAME}`);
        console.log(`   Data Type: ${col.DATA_TYPE}`);
        console.log(`   Default: ${col.COLUMN_DEFAULT}`);
      }

    } else {
      console.log('\n✅ status column already exists\n');
      const statusCol = columns.find(col => col.COLUMN_NAME === 'status');
      console.log(`   Data Type: ${statusCol.DATA_TYPE}`);
      console.log(`   Nullable: ${statusCol.IS_NULLABLE}`);
    }

    // Check if received_date column exists (for logistics document)
    const hasReceivedDate = columns.some(col => col.COLUMN_NAME === 'received_date');
    if (!hasReceivedDate) {
      console.log('\n⚠️  received_date column NOT FOUND - Adding it...\n');
      await sequelize.query(`
        ALTER TABLE stock_movement
        ADD received_date DATETIMEOFFSET NULL
      `);
      console.log('✅ received_date column added successfully!\n');
    } else {
      console.log('✅ received_date column already exists\n');
    }

    console.log('🎉 Migration completed successfully!');
    console.log('\nYou can now use the stock movement tracking system.');

  } catch (error) {
    console.error('❌ Migration error:', error.message);
    console.error('\nTroubleshooting:');
    console.error('1. Ensure the database is running');
    console.error('2. Check your database connection in db.js');
    console.error('3. Verify you have permission to alter the table');
    process.exit(1);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

migrateStockMovement();
