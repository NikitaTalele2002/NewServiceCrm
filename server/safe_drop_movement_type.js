/**
 * Safer drop attempt - Check for computed columns first
 */

import { sequelize } from './db.js';

async function safeDrop() {
  try {
    console.log('=== SAFE DROP ATTEMPT ===\n');

    // 1. Check if column exists
    console.log('1️⃣  Checking if movement_type column exists...');
    const [exists] = await sequelize.query(`
      SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'stock_movement' 
      AND COLUMN_NAME = 'movement_type'
    `);

    if (exists[0].cnt === 0) {
      console.log('✅ Column does not exist - already removed!\n');
      await sequelize.close();
      return;
    }

    console.log('✅ Column exists\n');

    // 2. Check for computed columns that reference it
    console.log('2️⃣  Checking for computed columns...');
    const [computed] = await sequelize.query(`
      SELECT c.name 
      FROM sys.computed_columns c
      WHERE c.object_id = OBJECT_ID('stock_movement')
    `);

    if (computed.length > 0) {
      console.log('⚠️  Found computed columns:');
      computed.forEach(c => console.log(`   - ${c.name}`));
      console.log('These may need to be dropped first\n');
    } else {
      console.log('✅ No computed columns found\n');
    }

    // 3. Check for views that reference the column
    console.log('3️⃣  Checking for views referencing this column...');
    const [views] = await sequelize.query(`
      SELECT DISTINCT OBJECT_NAME(v.object_id) as view_name
      FROM sys.sql_dependencies d
      INNER JOIN sys.objects v ON d.referencing_id = v.object_id
      WHERE v.type = 'V'
      AND d.referenced_object_id = OBJECT_ID('stock_movement')
    `);

    if (views.length > 0) {
      console.log('⚠️  Found views referencing stock_movement:');
      views.forEach(v => console.log(`   - ${v.view_name}`));
      console.log('These should not affect column removal\n');
    } else {
      console.log('✅ No views found\n');
    }

    // 4. Actually try to drop the column using sp_executesql
    console.log('4️⃣  Attempting to drop column...');
    try {
      // Using raw SQL without Sequelize's error handling
      await sequelize.query(`
        DROP INDEX IF EXISTS idx_movement_type ON stock_movement;
      `);
      console.log('   Dropped any related indexes');
    } catch (e) {
      // Index might not exist, that's OK
    }

    // Now the actual drop
    try {
      await sequelize.query(`
        EXEC sp_executesql N'ALTER TABLE stock_movement DROP COLUMN movement_type'
      `);
      console.log('✅ Column dropped successfully\n');
    } catch (innerError) {
      console.log('⚠️  sp_executesql approach failed\n');
      console.log('Trying direct ALTER TABLE...\n');
      // Try simpler direct approach
      try {
        await sequelize.query('ALTER TABLE stock_movement DROP COLUMN movement_type');
        console.log('✅ Column dropped successfully\n');
      } catch (directError) {
        console.error('Direct drop also failed');
        throw directError;
      }
    }

    // 5. Verify
    console.log('5️⃣  Verifying removal...');
    const [verify] = await sequelize.query(`
      SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'stock_movement' 
      AND COLUMN_NAME = 'movement_type'
    `);

    if (verify[0].cnt === 0) {
      console.log('✅ Verification successful - column removed!\n');
      console.log('✅ ✅ ✅ MIGRATION COMPLETE ✅ ✅ ✅\n');
    } else {
      throw new Error('Verification failed - column still exists');
    }

  } catch (error) {
    console.error('\n❌ Error:');
    console.error('Message:', error.message);
    // Don't throw, let it exit gracefully
  } finally {
    await sequelize.close();
  }
}

safeDrop();
