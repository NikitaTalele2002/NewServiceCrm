/**
 * Migration: Add Bucket System to SpareInventory
 * Date: 2026-02-23
 * 
 * Adds qty_in_transit column to spare_inventory table
 * This consolidates bucket tracking into the existing SpareInventory table:
 * - qty_good: GOOD bucket (saleable stock)
 * - qty_defective: DEFECTIVE bucket (IW defective)
 * - qty_in_transit: IN_TRANSIT bucket (stock moving between locations)
 */

import { sequelize } from '../db.js';

async function up() {
  try {
    console.log('\n=== MIGRATION: Add Bucket System to SpareInventory ===\n');

    // 1. Add qty_in_transit column to spare_inventory
    console.log('1. Adding qty_in_transit column to spare_inventory...');
    
    try {
      await sequelize.query(`
        ALTER TABLE spare_inventory
        ADD qty_in_transit INT NOT NULL DEFAULT 0;
      `);
      console.log('   ✅ Added qty_in_transit column');
    } catch (err) {
      if (err.message.includes('already exists') || err.message.includes('already in use')) {
        console.log('   ℹ️  qty_in_transit column already exists');
      } else {
        throw err;
      }
    }

    // 2. Add bucket and bucket_operation columns to stock_movement
    console.log('\n2. Adding bucket tracking columns to stock_movement...');
    
    try {
      await sequelize.query(`
        ALTER TABLE stock_movement
        ADD bucket NVARCHAR(50);
      `);
      console.log('   ✅ Added bucket column');
    } catch (err) {
      if (err.message.includes('already exists') || err.message.includes('already in use')) {
        console.log('   ℹ️  bucket column already exists');
      } else {
        throw err;
      }
    }

    try {
      await sequelize.query(`
        ALTER TABLE stock_movement
        ADD bucket_operation NVARCHAR(50);
      `);
      console.log('   ✅ Added bucket_operation column');
    } catch (err) {
      if (err.message.includes('already exists') || err.message.includes('already in use')) {
        console.log('   ℹ️  bucket_operation column already exists');
      } else {
        throw err;
      }
    }

    // 3. Create indexes for performance
    console.log('\n3. Creating performance indexes...');
    
    try {
      await sequelize.query(`
        IF NOT EXISTS (SELECT * FROM SYS.INDEXES WHERE NAME = 'idx_spare_inventory_location')
        CREATE INDEX idx_spare_inventory_location ON spare_inventory(spare_id, location_type, location_id);
      `);
      console.log('   ✅ Index idx_spare_inventory_location created');
    } catch (err) {
      console.log('   ℹ️  Index may already exist');
    }

    try {
      await sequelize.query(`
        IF NOT EXISTS (SELECT * FROM SYS.INDEXES WHERE NAME = 'idx_stock_movement_bucket')
        CREATE INDEX idx_stock_movement_bucket ON stock_movement(bucket, bucket_operation);
      `);
      console.log('   ✅ Index idx_stock_movement_bucket created');
    } catch (err) {
      console.log('   ℹ️  Index may already exist');
    }

    console.log('\n✅ Bucket system migration completed!\n');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    throw error;
  }
}

async function down() {
  try {
    console.log('\n=== ROLLBACK: Bucket System from SpareInventory ===\n');

    // 1. Drop qty_in_transit column
    console.log('1. Removing qty_in_transit column...');
    try {
      await sequelize.query('ALTER TABLE spare_inventory DROP COLUMN qty_in_transit');
      console.log('   ✅ Dropped qty_in_transit column');
    } catch (err) {
      console.log('   ℹ️  qty_in_transit column not found');
    }

    // 2. Remove bucket columns from stock_movement
    console.log('\n2. Removing bucket tracking columns...');
    
    try {
      await sequelize.query('ALTER TABLE stock_movement DROP COLUMN bucket');
      console.log('   ✅ Dropped bucket column');
    } catch (err) {
      console.log('   ℹ️  bucket column not found');
    }

    try {
      await sequelize.query('ALTER TABLE stock_movement DROP COLUMN bucket_operation');
      console.log('   ✅ Dropped bucket_operation column');
    } catch (err) {
      console.log('   ℹ️  bucket_operation column not found');
    }

    console.log('\n✅ Rollback completed!\n');
    
  } catch (error) {
    console.error('\n❌ Rollback failed:', error.message);
    throw error;
  }
}

export { up, down };
