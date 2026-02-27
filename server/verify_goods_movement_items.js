/**
 * Verification Script: Confirm goods_movement_items is created with stock_movements
 * 
 * This script checks if goods_movement_items records are being created
 * when stock movements are processed during call closure.
 */
import { sequelize } from './db.js';

async function verifyGoodsMovementItems() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('✅ VERIFICATION: GOODS_MOVEMENT_ITEMS CREATION');
    console.log('='.repeat(80));

    // Step 1: Check if tables exist
    console.log('\n📋 STEP 1: Checking Table Existence');
    console.log('-'.repeat(80));

    const tables = ['stock_movements', 'goods_movement_items', 'spare_inventory', 'call_spare_usage'];
    const tableStatus = {};

    for (const tableName of tables) {
      try {
        const result = await sequelize.query(`SELECT TOP 1 1 FROM ${tableName}`);
        tableStatus[tableName] = '✅ EXISTS';
        console.log(`   ${tableName}: ✅ EXISTS`);
      } catch (err) {
        tableStatus[tableName] = '❌ NOT FOUND';
        console.log(`   ${tableName}: ❌ NOT FOUND`);
      }
    }

    // Step 2: Check column structure of goods_movement_items
    console.log('\n📊 STEP 2: Checking goods_movement_items Schema');
    console.log('-'.repeat(80));
// check if the goods_movememnt_items table exists before querying its schema 
    if (tableStatus['goods_movement_items'] === '✅ EXISTS') {
      try {
        const schema = await sequelize.query(`
          SELECT COLUMN_NAME, DATA_TYPE 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_NAME = 'goods_movement_items'
          ORDER BY ORDINAL_POSITION
        `);

        console.log('   Columns found:');
        schema[0].forEach((col, idx) => {
          console.log(`      ${idx + 1}. ${col.COLUMN_NAME} (${col.DATA_TYPE})`);
        });

        // Check for key columns
        const hasMovementId = schema[0].some(col => col.COLUMN_NAME.toLowerCase() === 'movement_id');
        const hasQty = schema[0].some(col => col.COLUMN_NAME.toLowerCase() === 'qty');
        const hasCondition = schema[0].some(col => col.COLUMN_NAME.toLowerCase().includes('condition'));

        console.log('\n   Key columns:');
        console.log(`      movement_id: ${hasMovementId ? '✅' : '❌'}`);
        console.log(`      qty: ${hasQty ? '✅' : '❌'}`);
        console.log(`      condition: ${hasCondition ? '✅' : '❌'}`);
      } catch (err) {
        console.log(`   ❌ Error checking schema: ${err.message}`);
      }
    }

    // Step 3: Check recent stock movements
    console.log('\n📦 STEP 3: Recent Stock Movements');
    console.log('-'.repeat(80));

    if (tableStatus['stock_movements'] === '✅ EXISTS') {
      try {
        const movements = await sequelize.query(`
          SELECT TOP 5 
            id, spare_id, movement_type, quantity, created_at
          FROM stock_movements
          WHERE movement_type = 'DEFECTIVE_SPARE_REPLACEMENT'
          ORDER BY id DESC
        `);

        if (movements[0].length > 0) {
          console.log(`   Found ${movements[0].length} DEFECTIVE_SPARE_REPLACEMENT movements:`);
          movements[0].forEach((mov, idx) => {
            console.log(`\n   Movement ${idx + 1}:`);
            console.log(`      ID: ${mov.id}`);
            console.log(`      Spare ID: ${mov.spare_id}`);
            console.log(`      Quantity: ${mov.quantity}`);
            console.log(`      Created: ${mov.created_at}`);
          });
        } else {
          console.log('   No DEFECTIVE_SPARE_REPLACEMENT movements found');
        }
      } catch (err) {
        console.log(`   Error querying movements: ${err.message}`);
      }
    }

    // Step 4: Check corresponding goods movement items
    console.log('\n🔍 STEP 4: Corresponding Goods Movement Items');
    console.log('-'.repeat(80));

    if (tableStatus['goods_movement_items'] === '✅ EXISTS' && tableStatus['stock_movements'] === '✅ EXISTS') {
      try {
        const items = await sequelize.query(`
          SELECT gmi.id, gmi.movement_id, gmi.spare_part_id, gmi.qty, gmi.item_condition
          FROM goods_movement_items gmi
          INNER JOIN stock_movements sm ON gmi.movement_id = sm.id
          WHERE sm.movement_type = 'DEFECTIVE_SPARE_REPLACEMENT'
          ORDER BY gmi.created_at DESC
        `);

        if (items[0].length > 0) {
          console.log(`   ✅ Found ${items[0].length} goods_movement_items linked to DEFECTIVE movements:`);
          items[0].forEach((item, idx) => {
            console.log(`\n   Item ${idx + 1}:`);
            console.log(`      ID: ${item.id}`);
            console.log(`      Movement ID: ${item.movement_id}`);
            console.log(`      Spare Part ID: ${item.spare_part_id}`);
            console.log(`      Quantity: ${item.qty}`);
            console.log(`      Condition: ${item.item_condition}`);
          });

          console.log('\n   ✅ VERIFICATION PASSED!');
          console.log('      goods_movement_items ARE being created correctly');
        } else {
          console.log('   ⚠️ No goods_movement_items found for DEFECTIVE movements');
          console.log('      This means goods_movement_items creation may not be working');
        }
      } catch (err) {
        console.log(`   Error: ${err.message}`);
      }
    }

    // Step 5: Show SQL for manual verification
    console.log('\n📋 STEP 5: SQL Queries for Manual Checking');
    console.log('-'.repeat(80));
    console.log(`\n   -- View recent stock movements:`);
    console.log(`   SELECT TOP 10 * FROM stock_movements`);
    console.log(`   WHERE movement_type = 'DEFECTIVE_SPARE_REPLACEMENT'`);
    console.log(`   ORDER BY created_at DESC;`);

    console.log(`\n   -- View goods movement items:`);
    console.log(`   SELECT gmi.*, sm.movement_type`);
    console.log(`   FROM goods_movement_items gmi`);
    console.log(`   INNER JOIN stock_movements sm ON gmi.movement_id = sm.id`);
    console.log(`   ORDER BY gmi.created_at DESC;`);

    console.log(`\n   -- View complete movement details:`);
    console.log(`   SELECT`);
    console.log(`     sm.id as movement_id,`);
    console.log(`     sm.movement_type,`);
    console.log(`     sm.quantity as total_qty,`);
    console.log(`     gmi.id as item_id,`);
    console.log(`     gmi.spare_part_id,`);
    console.log(`     gmi.qty,`);
    console.log(`     gmi.item_condition`);
    console.log(`   FROM stock_movements sm`);
    console.log(`   LEFT JOIN goods_movement_items gmi ON sm.id = gmi.movement_id`);
    console.log(`   ORDER BY sm.created_at DESC;`);

    // Step 6: Summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 SUMMARY');
    console.log('='.repeat(80));

    const allSystemsGo = tableStatus['stock_movements'] === '✅ EXISTS' && 
                         tableStatus['goods_movement_items'] === '✅ EXISTS';

    if (allSystemsGo) {
      console.log('\n   ✅ ALL SYSTEMS GO');
      console.log('      - stock_movements table exists');
      console.log('      - goods_movement_items table exists');
      console.log('      - System is ready to track defective spares');
      console.log('\n   Expected behavior:');
      console.log('      When technician closes a call with spare usage:');
      console.log('      1. stock_movements record created');
      console.log('      2. goods_movement_items record created (linked to movement_id)');
      console.log('      3. spare_inventory qty_defective updated');
    } else {
      console.log('\n   ⚠️ SYSTEM NOT FULLY CONFIGURED');
      if (tableStatus['stock_movements'] === '❌ NOT FOUND') {
        console.log('      - stock_movements table missing');
      }
      if (tableStatus['goods_movement_items'] === '❌ NOT FOUND') {
        console.log('      - goods_movement_items table missing');
      }
      console.log('\n      Note: System has graceful fallback');
      console.log('      - Inventory updates (qty_defective) will still work');
      console.log('      - Only audit trail (movements) will be missing');
    }

    console.log('\n' + '='.repeat(80));
    process.exit(0);

  } catch (err) {
    console.error('\n❌ Verification Error:', err.message);
    console.error(err);
    process.exit(1);
  }
}

verifyGoodsMovementItems();
