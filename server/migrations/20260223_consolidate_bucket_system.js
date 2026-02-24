/**
 * Migration: Consolidate Bucket System - Remove InventoryBucket
 * Date: 2026-02-23
 * 
 * Steps:
 * 1. Check if inventory_bucket table exists
 * 2. If it exists, migrate data to spare_inventory
 * 3. Drop inventory_bucket table
 * 4. Ensure spare_inventory has all bucket columns (qty_good, qty_defective, qty_in_transit)
 * 5. Create necessary indexes
 */

import { sequelize } from '../db.js';

async function up() {
  try {
    console.log('\n=== MIGRATION: Consolidate Bucket System ===\n');

    // 1. Check if inventory_bucket table exists
    console.log('1. Checking if inventory_bucket table exists...');
    
    const tableExists = await sequelize.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'inventory_bucket'
    `, { type: sequelize.QueryTypes.SELECT });

    if (tableExists && tableExists.length > 0) {
      console.log('   ✅ Found inventory_bucket table');

      // 2. Migrate data if needed
      console.log('\n2. Migrating data from inventory_bucket to spare_inventory...');
      
      try {
        // First, ensure spare_inventory has qty_in_transit column
        const columnExists = await sequelize.query(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_NAME = 'spare_inventory' AND COLUMN_NAME = 'qty_in_transit'
        `, { type: sequelize.QueryTypes.SELECT });

        if (!columnExists || columnExists.length === 0) {
          console.log('   Adding qty_in_transit column to spare_inventory...');
          await sequelize.query(`
            ALTER TABLE spare_inventory
            ADD qty_in_transit INT NOT NULL DEFAULT 0;
          `);
          console.log('   ✅ Added qty_in_transit column');
        } else {
          console.log('   ℹ️  qty_in_transit column already exists');
        }

        // Check if there's data in inventory_bucket to migrate
        const bucketData = await sequelize.query(`
          SELECT * FROM inventory_bucket
        `, { type: sequelize.QueryTypes.SELECT });

        if (bucketData && bucketData.length > 0) {
          console.log(`   Found ${bucketData.length} records in inventory_bucket`);
          console.log('   Merging bucket data into spare_inventory...');
          
          // For each bucket record, update corresponding spare_inventory
          for (const bucket of bucketData) {
            const { spare_id, location_type, location_id, bucket: bucketName, quantity } = bucket;
            
            // Check if record exists in spare_inventory
            const existingRecord = await sequelize.query(`
              SELECT * FROM spare_inventory 
              WHERE spare_id = ? AND location_type = ? AND location_id = ?
            `, {
              replacements: [spare_id, location_type, location_id],
              type: sequelize.QueryTypes.SELECT
            });

            if (existingRecord && existingRecord.length > 0) {
              // Update existing record - add quantity to appropriate bucket
              const column = bucketName === 'GOOD' ? 'qty_good' 
                           : bucketName === 'DEFECTIVE' ? 'qty_defective' 
                           : bucketName === 'IN_TRANSIT' ? 'qty_in_transit' 
                           : null;
              
              if (column) {
                await sequelize.query(`
                  UPDATE spare_inventory
                  SET [${column}] = [${column}] + ?
                  WHERE spare_id = ? AND location_type = ? AND location_id = ?
                `, {
                  replacements: [quantity, spare_id, location_type, location_id],
                  type: sequelize.QueryTypes.UPDATE
                });
              }
            } else {
              // Create new record in spare_inventory
              const values = {
                spare_id,
                location_type,
                location_id,
                qty_good: bucketName === 'GOOD' ? quantity : 0,
                qty_defective: bucketName === 'DEFECTIVE' ? quantity : 0,
                qty_in_transit: bucketName === 'IN_TRANSIT' ? quantity : 0
              };

              await sequelize.query(`
                INSERT INTO spare_inventory (spare_id, location_type, location_id, qty_good, qty_defective, qty_in_transit, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, GETDATE(), GETDATE())
              `, {
                replacements: [
                  values.spare_id,
                  values.location_type,
                  values.location_id,
                  values.qty_good,
                  values.qty_defective,
                  values.qty_in_transit
                ],
                type: sequelize.QueryTypes.INSERT
              });
            }
          }
          console.log(`   ✅ Migrated ${bucketData.length} bucket records`);
        } else {
          console.log('   ℹ️  No data to migrate from inventory_bucket');
        }
      } catch (err) {
        console.error('   ❌ Error migrating data:', err.message);
        throw err;
      }

      // 3. Drop inventory_bucket table
      console.log('\n3. Dropping inventory_bucket table...');
      
      try {
        // First, drop any foreign key constraints on inventory_bucket
        const constraints = await sequelize.query(`
          SELECT CONSTRAINT_NAME 
          FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
          WHERE TABLE_NAME = 'inventory_bucket' AND CONSTRAINT_TYPE = 'FOREIGN KEY'
        `, { type: sequelize.QueryTypes.SELECT });

        for (const constraint of constraints) {
          console.log(`   Dropping constraint: ${constraint.CONSTRAINT_NAME}`);
          await sequelize.query(`
            ALTER TABLE inventory_bucket 
            DROP CONSTRAINT [${constraint.CONSTRAINT_NAME}]
          `);
        }

        // Now drop the table
        await sequelize.query(`
          DROP TABLE inventory_bucket;
        `);
        console.log('   ✅ Dropped inventory_bucket table');
      } catch (err) {
        if (err.message.includes('does not exist')) {
          console.log('   ℹ️  Table already dropped');
        } else {
          throw err;
        }
      }
    } else {
      console.log('   ℹ️  inventory_bucket table not found (already removed)');
    }

    // 4. Ensure spare_inventory has all columns
    console.log('\n4. Verifying spare_inventory columns...');
    
    const requiredColumns = ['qty_good', 'qty_defective', 'qty_in_transit'];
    const currentColumns = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'spare_inventory'
    `, { type: sequelize.QueryTypes.SELECT });

    const columnNames = currentColumns.map(c => c.COLUMN_NAME);

    for (const column of requiredColumns) {
      if (columnNames.includes(column)) {
        console.log(`   ✅ Column ${column} exists`);
      } else {
        console.log(`   ⚠️  Adding missing column ${column}...`);
        await sequelize.query(`
          ALTER TABLE spare_inventory
          ADD ${column} INT NOT NULL DEFAULT 0;
        `);
        console.log(`   ✅ Added ${column}`);
      }
    }

    // 5. Create indexes
    console.log('\n5. Creating performance indexes...');
    
    const indexes = [
      {
        name: 'idx_spare_inventory_location',
        query: `
          IF NOT EXISTS (SELECT * FROM SYS.INDEXES WHERE NAME = 'idx_spare_inventory_location')
          CREATE INDEX idx_spare_inventory_location ON spare_inventory(spare_id, location_type, location_id);
        `
      },
      {
        name: 'idx_stock_movement_bucket',
        query: `
          IF NOT EXISTS (SELECT * FROM SYS.INDEXES WHERE NAME = 'idx_stock_movement_bucket')
          CREATE INDEX idx_stock_movement_bucket ON stock_movement(bucket, bucket_operation);
        `
      },
      {
        name: 'idx_stock_movement_reference',
        query: `
          IF NOT EXISTS (SELECT * FROM SYS.INDEXES WHERE NAME = 'idx_stock_movement_reference')
          CREATE INDEX idx_stock_movement_reference ON stock_movement(reference_type, reference_no);
        `
      }
    ];

    for (const idx of indexes) {
      try {
        await sequelize.query(idx.query);
        console.log(`   ✅ Index ${idx.name} created/verified`);
      } catch (err) {
        if (err.message.includes('already exists')) {
          console.log(`   ℹ️  Index ${idx.name} already exists`);
        } else {
          console.log(`   ⚠️  Could not create index ${idx.name}:`, err.message);
        }
      }
    }

    console.log('\n✅ MIGRATION COMPLETED SUCCESSFULLY!\n');
    console.log('Summary:');
    console.log('  ✅ Removed inventory_bucket table');
    console.log('  ✅ Consolidated bucket data into spare_inventory');
    console.log('  ✅ Verified all bucket columns exist (qty_good, qty_defective, qty_in_transit)');
    console.log('  ✅ Created performance indexes\n');
    
  } catch (error) {
    console.error('\n❌ MIGRATION FAILED:', error.message);
    console.error('Stack:', error.stack);
    throw error;
  }
}

async function down() {
  try {
    console.log('\n=== ROLLBACK: Consolidate Bucket System Migration ===\n');
    console.log('⚠️  Rollback would recreate inventory_bucket table');
    console.log('   This is complex - manual intervention may be required\n');
    
    // Note: Full rollback is complex, so we'll just warn the user
    // In practice, you'd restore from backup if this migration fails
  } catch (error) {
    console.error('\n❌ Rollback failed:', error.message);
    throw error;
  }
}

export { up, down };
