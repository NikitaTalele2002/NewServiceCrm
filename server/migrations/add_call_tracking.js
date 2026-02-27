#!/usr/bin/env node

/**
 * Database Migration: Add Call Tracking for Returned Spares
 *
 * This script adds the necessary columns and relationships to track which
 * complaints spares were used in, all the way through the return chain.
 *
 * Changes:
 * 1. Add call_usage_id to spare_request_items
 * 2. Add call tracking columns to stock_movement
 * 3. Create indexes for efficient querying
 *
 * Usage: node server/migrations/add_call_tracking.js
 */

import { sequelize } from '../db.js';
import { QueryTypes } from 'sequelize';

async function runMigration() {
  let transaction;
  try {
    console.log('\n' + '='.repeat(70));
    console.log('🔄 MIGRATION: Add Call Tracking for Returned Spares');
    console.log('='.repeat(70) + '\n');

    transaction = await sequelize.transaction();

    // ===== STEP 1: Add call_usage_id to spare_request_items =====
    console.log('📝 STEP 1: Add call_usage_id to spare_request_items table...\n');

    try {
      const columnExists = await sequelize.query(
        `SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_NAME = 'spare_request_items' AND COLUMN_NAME = 'call_usage_id'`,
        { transaction }
      );

      if (columnExists[0].length === 0) {
        await sequelize.query(
          `ALTER TABLE [spare_request_items] ADD [call_usage_id] INT NULL;`,
          { transaction }
        );
        console.log('   ✅ Added column: call_usage_id');
      } else {
        console.log('   ⏭️  Column call_usage_id already exists');
      }

      // Add foreign key if not exists
      const fkExists = await sequelize.query(
        `SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
         WHERE TABLE_NAME = 'spare_request_items' 
         AND CONSTRAINT_NAME = 'FK_spare_request_items_call_spare_usage'`,
        { transaction }
      );

      if (fkExists[0].length === 0) {
        await sequelize.query(
          `ALTER TABLE [spare_request_items] 
           ADD CONSTRAINT FK_spare_request_items_call_spare_usage 
           FOREIGN KEY ([call_usage_id]) REFERENCES [call_spare_usage]([usage_id]) 
           ON DELETE SET NULL ON UPDATE CASCADE;`,
          { transaction }
        );
        console.log('   ✅ Added foreign key to call_spare_usage');
      } else {
        console.log('   ⏭️  Foreign key already exists');
      }
    } catch (err) {
      console.log(`   ℹ️  Note: ${err.message}`);
    }

    // ===== STEP 2: Add call tracking to stock_movement =====
    console.log('\n📝 STEP 2: Add call tracking columns to stock_movement table...\n');

    const columnsToAdd = [
      { name: 'related_call_id', query: 'ALTER TABLE [stock_movement] ADD [related_call_id] INT NULL;' },
      { name: 'related_usage_id', query: 'ALTER TABLE [stock_movement] ADD [related_usage_id] INT NULL;' },
      { name: 'related_request_id', query: 'ALTER TABLE [stock_movement] ADD [related_request_id] INT NULL;' }
    ];

    for (const col of columnsToAdd) {
      try {
        const exists = await sequelize.query(
          `SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
           WHERE TABLE_NAME = 'stock_movement' AND COLUMN_NAME = '${col.name}'`,
          { transaction }
        );

        if (exists[0].length === 0) {
          await sequelize.query(col.query, { transaction });
          console.log(`   ✅ Added column: ${col.name}`);
        } else {
          console.log(`   ⏭️  Column ${col.name} already exists`);
        }
      } catch (err) {
        console.log(`   ℹ️  Note for ${col.name}: ${err.message}`);
      }
    }

    // ===== STEP 3: Create indexes for efficient querying =====
    console.log('\n🔍 STEP 3: Creating indexes for efficient querying...\n');

    const indexQueries = [
      {
        name: 'IX_spare_request_items_call_usage_id',
        query: `CREATE INDEX [IX_spare_request_items_call_usage_id] 
                ON [spare_request_items]([call_usage_id]);`
      },
      {
        name: 'IX_stock_movement_related_call_id',
        query: `CREATE INDEX [IX_stock_movement_related_call_id] 
                ON [stock_movement]([related_call_id]);`
      },
      {
        name: 'IX_stock_movement_related_usage_id',
        query: `CREATE INDEX [IX_stock_movement_related_usage_id] 
                ON [stock_movement]([related_usage_id]);`
      },
      {
        name: 'IX_stock_movement_reference_call',
        query: `CREATE INDEX [IX_stock_movement_reference_call] 
                ON [stock_movement]([reference_type], [reference_no]) 
                WHERE reference_type = 'call_spare_usage';`
      }
    ];

    for (const idx of indexQueries) {
      try {
        const exists = await sequelize.query(
          `SELECT * FROM INFORMATION_SCHEMA.STATISTICS 
           WHERE TABLE_NAME = 'stock_movement' AND INDEX_NAME = '${idx.name}'`,
          { transaction }
        );

        if (exists[0].length === 0) {
          await sequelize.query(idx.query, { transaction });
          console.log(`   ✅ Created index: ${idx.name}`);
        } else {
          console.log(`   ⏭️  Index ${idx.name} already exists`);
        }
      } catch (err) {
        if (err.message.includes('There is already an object named')) {
          console.log(`   ⏭️  Index ${idx.name} already exists`);
        } else {
          console.log(`   ⚠️  Could not create ${idx.name}: ${err.message}`);
        }
      }
    }

    // ===== STEP 4: Verify migration =====
    console.log('\n✅ STEP 4: Verifying migration...\n');

    const verification = await sequelize.query(
      `SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_NAME IN ('spare_request_items', 'stock_movement')
       AND COLUMN_NAME IN ('call_usage_id', 'related_call_id', 'related_usage_id', 'related_request_id')
       ORDER BY TABLE_NAME, COLUMN_NAME`,
      { transaction }
    );

    console.log('   ✅ Migration Complete! Added columns:');
    verification[0].forEach(col => {
      console.log(`      • ${col.TABLE_NAME}.${col.COLUMN_NAME} (${col.DATA_TYPE})`);
    });

    await transaction.commit();

    console.log('\n' + '='.repeat(70));
    console.log('✨ MIGRATION SUCCESSFUL!');
    console.log('='.repeat(70));
    console.log('\nYou can now:');
    console.log('1. Update models to include the new fields');
    console.log('2. Link call_usage_id when technician creates return requests');
    console.log('3. Preserve call references through the entire return chain');
    console.log('4. Query call details for any returned spare\n');

    process.exit(0);
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error('\n❌ MIGRATION FAILED!');
    console.error(error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

runMigration();
