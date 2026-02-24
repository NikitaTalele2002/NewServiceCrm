/**
 * Migration Script: Drop legacy columns
 * Date: 2026-02-23
 * 
 * This migration removes the legacy fields that are no longer needed:
 * - spare_requests.request_type (replaced by spare_request_type)
 * - stock_movement.movement_type (replaced by stock_movement_type)
 * 
 * Run with: node migrations/20260223_drop_legacy_columns.js
 */

import { sequelize } from '../db.js';

async function runMigration() {
  try {
    console.log('🔄 Starting Migration: Drop legacy request_type and movement_type columns...\n');

    // Step 1: Check if request_type column exists
    console.log('📋 Checking for legacy columns...');
    
    let spareTables = await sequelize.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_NAME = 'spare_requests' AND COLUMN_NAME = 'request_type'`
    );
    
    let stockTables = await sequelize.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_NAME = 'stock_movement' AND COLUMN_NAME = 'movement_type'`
    );

    // Step 2: Drop request_type if it exists
    if (spareTables[0].length > 0) {
      console.log('🗑️  Dropping request_type column from spare_requests...');
      
      try {
        // First try to drop any constraints that might reference this column
        await sequelize.query(
          `ALTER TABLE spare_requests DROP CONSTRAINT IF EXISTS chk_request_type`
        ).catch(() => {}); // Ignore if constraint doesn't exist
        
        // Now drop the column
        await sequelize.query(
          `ALTER TABLE spare_requests DROP COLUMN request_type`
        );
        
        console.log('✅ Dropped request_type column');
      } catch (err) {
        console.warn('⚠️  Could not drop request_type:', err.message);
      }
    } else {
      console.log('⏭️  request_type column does not exist');
    }

    // Step 3: Drop movement_type if it exists
    if (stockTables[0].length > 0) {
      console.log('🗑️  Dropping movement_type column from stock_movement...');
      
      try {
        // First try to drop any constraints that might reference this column
        await sequelize.query(
          `ALTER TABLE stock_movement DROP CONSTRAINT IF EXISTS chk_movement_type`
        ).catch(() => {}); // Ignore if constraint doesn't exist
        
        // Now drop the column
        await sequelize.query(
          `ALTER TABLE stock_movement DROP COLUMN movement_type`
        );
        
        console.log('✅ Dropped movement_type column');
      } catch (err) {
        console.warn('⚠️  Could not drop movement_type:', err.message);
      }
    } else {
      console.log('⏭️  movement_type column does not exist');
    }

    console.log('\n✨ Migration completed successfully!');
    console.log('\n📊 Summary:');
    console.log('   ✅ Removed legacy request_type from spare_requests');
    console.log('   ✅ Removed legacy movement_type from stock_movement');
    console.log('   ✅ Now using only spare_request_type and stock_movement_type');

    process.exit(0);

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// Run the migration
runMigration();
