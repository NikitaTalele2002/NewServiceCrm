/**
 * Detailed diagnostic to understand the movement_type column issue
 */

import { sequelize } from './db.js';

async function diagnose() {
  try {
    console.log('=== DETAILED DIAGNOSTIC ===\n');

    // 1. Check all columns
    console.log('1️⃣  All columns in stock_movement table:');
    const [allCols] = await sequelize.query(`
      SELECT ORDINAL_POSITION, COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'stock_movement'
      ORDER BY ORDINAL_POSITION
    `);

    allCols.forEach(col => {
      const marker = col.COLUMN_NAME === 'movement_type' ? ' ⚠️ OLD' : 
                     col.COLUMN_NAME === 'stock_movement_type' ? ' ✅ NEW' : '';
      console.log(`   ${col.ORDINAL_POSITION}. ${col.COLUMN_NAME} (${col.DATA_TYPE})${marker}`);
    });

    // 2. Check for constraints on movement_type
    console.log('\n2️⃣  Checking for constraints on movement_type:');
    const [constraints] = await sequelize.query(`
      SELECT 
        c.name AS constraint_name,
        t.name AS constraint_type
      FROM sys.default_constraints c
      INNER JOIN sys.columns col ON c.parent_object_id = col.object_id
      INNER JOIN sys.objects t ON c.type = 'D'
      WHERE c.parent_object_id = OBJECT_ID('stock_movement')
      AND col.name = 'movement_type'
    `);

    if (constraints.length === 0) {
      console.log('   No default constraints found');
    } else {
      constraints.forEach(c => {
        console.log(`   - ${c.constraint_name} (${c.constraint_type})`);
      });
    }

    // 3. Check for indexes
    console.log('\n3️⃣  Checking for indexes on movement_type:');
    const [indexes] = await sequelize.query(`
      SELECT i.name AS index_name
      FROM sys.indexes i
      INNER JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
      INNER JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
      WHERE c.object_id = OBJECT_ID('stock_movement')
      AND c.name = 'movement_type'
      AND i.name IS NOT NULL
    `);

    if (indexes.length === 0) {
      console.log('   No indexes found');
    } else {
      indexes.forEach(i => {
        console.log(`   - ${i.index_name}`);
      });
    }

    // 4. Check row count
    console.log('\n4️⃣  Table statistics:');
    const [stats] = await sequelize.query(`
      SELECT COUNT(*) as row_count FROM stock_movement
    `);
    console.log(`   Total rows: ${stats[0].row_count}`);

    // 5. Check recent data
    console.log('\n5️⃣  Recent stock_movement_type values:');
    const [recent] = await sequelize.query(`
      SELECT TOP 5 movement_id, stock_movement_type, movement_date
      FROM stock_movement
      ORDER BY movement_id DESC
    `);

    recent.forEach(r => {
      console.log(`   ${r.movement_id}: ${r.stock_movement_type} (${r.movement_date})`);
    });

    // 6. Try to check if movement_type has any non-null values
    if (allCols.some(c => c.COLUMN_NAME === 'movement_type')) {
      console.log('\n6️⃣  Checking movement_type data:');
      const [mtData] = await sequelize.query(`
        SELECT 
          COUNT(*) as total_rows,
          SUM(CASE WHEN movement_type IS NOT NULL THEN 1 ELSE 0 END) as non_null_count
        FROM stock_movement
      `);
      console.log(`   Total rows: ${mtData[0].total_rows}`);
      console.log(`   Non-null movement_type values: ${mtData[0].non_null_count}`);
    }

    console.log('\n✅ Diagnostic complete\n');

  } catch (error) {
    console.error('❌ Error during diagnostic:');
    console.error('Message:', error.message);
    console.error('Code:', error.code);
    console.error('Full error:', error);
  } finally {
    await sequelize.close();
  }
}

diagnose();
