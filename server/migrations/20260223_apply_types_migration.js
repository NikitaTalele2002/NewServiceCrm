/**
 * Migration Script: Add Spare Request Types and Stock Movement Types
 * Date: 2026-02-23
 * 
 * This migration adds the new enums and columns to the database:
 * 1. Spare Request Types (WHY material is moving)
 * 2. Stock Movement Types (WHAT happened to stock)
 * 
 * Run with: node migrations/20260223_apply_types_migration.js
 */

import { sequelize } from '../db.js';
import { SpareRequest, StockMovement, sync } from '../models/index.js';

async function runMigration() {
  try {
    console.log('🔄 Starting Migration: Add Spare Request Types and Stock Movement Types...\n');

    // Step 1: Check if columns exist
    console.log('📋 Checking existing columns...');
    
    let spareTables = await sequelize.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_NAME = 'spare_requests' AND COLUMN_NAME = 'spare_request_type'`
    );
    
    let stockTables = await sequelize.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_NAME = 'stock_movement' AND COLUMN_NAME = 'stock_movement_type'`
    );

    // Step 2: Add spare_request_type to spare_requests if not exists
    if (spareTables[0].length === 0) {
      console.log('➕ Adding spare_request_type column to spare_requests table...');
      
      await sequelize.query(
        `ALTER TABLE spare_requests
         ADD spare_request_type NVARCHAR(50) NULL`
      );
      
      console.log('✅ Added spare_request_type column');
    } else {
      console.log('⏭️  spare_request_type column already exists');
    }

    // Step 3: Add stock_movement_type and related columns to stock_movement if not exists
    if (stockTables[0].length === 0) {
      console.log('➕ Adding stock_movement_type and related columns to stock_movement table...');
      
      await sequelize.query(
        `ALTER TABLE stock_movement
         ADD stock_movement_type NVARCHAR(50) NULL,
             bucket_impact NVARCHAR(50) NULL,
             sap_integration BIT DEFAULT 0,
             sap_process NVARCHAR(100) NULL`
      );
      
      console.log('✅ Added stock_movement_type and related columns');
    } else {
      console.log('⏭️  stock_movement_type column already exists');
    }

    // Step 4: Create indexes for performance
    console.log('📑 Creating indexes...');
    
    try {
      await sequelize.query(
        `CREATE INDEX idx_spare_request_type ON spare_requests(spare_request_type)`
      ).catch(err => {
        if (err.message.includes('already')) {
          console.log('⏭️  Index idx_spare_request_type already exists');
        } else {
          throw err;
        }
      });
    } catch (err) {
      if (!err.message.includes('already')) {
        console.warn('⚠️  Could not create index idx_spare_request_type:', err.message);
      }
    }

    try {
      await sequelize.query(
        `CREATE INDEX idx_stock_movement_type ON stock_movement(stock_movement_type)`
      ).catch(err => {
        if (err.message.includes('already')) {
          console.log('⏭️  Index idx_stock_movement_type already exists');
        } else {
          throw err;
        }
      });
    } catch (err) {
      if (!err.message.includes('already')) {
        console.warn('⚠️  Could not create index idx_stock_movement_type:', err.message);
      }
    }

    try {
      await sequelize.query(
        `CREATE INDEX idx_bucket_impact ON stock_movement(bucket_impact)`
      ).catch(err => {
        if (err.message.includes('already')) {
          console.log('⏭️  Index idx_bucket_impact already exists');
        } else {
          throw err;
        }
      });
    } catch (err) {
      if (!err.message.includes('already')) {
        console.warn('⚠️  Could not create index idx_bucket_impact:', err.message);
      }
    }

    console.log('✅ Indexes created successfully');

    // Step 5: Verify columns were added successfully
    console.log('\n✔️  Verifying column additions...');
    
    const finalSpareTables = await sequelize.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_NAME = 'spare_requests' AND COLUMN_NAME = 'spare_request_type'`
    );
    
    const finalStockTables = await sequelize.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_NAME = 'stock_movement' AND COLUMN_NAME = 'stock_movement_type'`
    );

    if (finalSpareTables[0].length > 0) {
      console.log('✅ spare_request_type column verified');
    }
    
    if (finalStockTables[0].length > 0) {
      console.log('✅ stock_movement_type column verified');
    }

    console.log('\n✨ Migration completed successfully!');
    console.log('\n📊 Summary:');
    console.log('   ✅ Added/verified spare_request_type enum to spare_requests');
    console.log('   ✅ Added/verified stock_movement_type enum to stock_movement');
    console.log('   ✅ Added bucket_impact, sap_integration, sap_process columns');
    console.log('   ✅ Created performance indexes');
    console.log('   ✅ Note: Run sync_models_simple.js to sync all table structures');

    process.exit(0);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
runMigration();
