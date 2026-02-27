/**
 * DIAGNOSTIC: Show actual column data from stock_movement and goods_movement_items
 * This will help verify what data was created
 */

import { sequelize } from './db.js';

async function diagnoseDatabaseState() {
  try {
    console.log('\n' + '='.repeat(100));
    console.log('📊 DATABASE STATE DIAGNOSTIC - CALL 33 WORKFLOW');
    console.log('='.repeat(100));
    
    const CALL_ID = 33;
    const SPARE_ID = 2;
    
    // ========================================================================
    // 1. Check stock_movement table structure and data
    // ========================================================================
    console.log('\n📍 STOCK MOVEMENT TABLE:');
    console.log('-'.repeat(100));
    
    try {
      const [columns] = await sequelize.query(`
        SELECT COLUMN_NAME, DATA_TYPE
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'stock_movement'
        ORDER BY ORDINAL_POSITION
      `);
      
      console.log('\n🔍 Columns in stock_movement table:');
      columns.slice(0, 15).forEach(col => {
        console.log(`   - ${col.COLUMN_NAME} (${col.DATA_TYPE})`);
      });
      
      const [data] = await sequelize.query(`
        SELECT TOP 3 * FROM stock_movement
        ORDER BY created_at DESC
      `);
      
      if (data && data.length > 0) {
        console.log('\n📋 Sample stock_movement records:');
        data.forEach((record, idx) => {
          console.log(`\n   Record ${idx + 1}:`);
          Object.entries(record).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
              console.log(`      ${key}: ${value}`);
            }
          });
        });
      }
    } catch(err) {
      console.log(`❌ Error checking stock_movement: ${err.message}`);
    }
    
    // ========================================================================
    // 2. Check call_spare_usage data
    // ========================================================================
    console.log('\n\n📍 CALL_SPARE_USAGE TABLE:');
    console.log('-'.repeat(100));
    
    try {
      const [data] = await sequelize.query(`
        SELECT * FROM call_spare_usage 
        WHERE call_id = ${CALL_ID}
        ORDER BY created_at DESC
      `);
      
      if (data && data.length > 0) {
        console.log(`\n✅ Found ${data.length} record(s) for call ${CALL_ID}:`);
        data.forEach((record, idx) => {
          console.log(`\n   Record ${idx + 1}:`);
          Object.entries(record).forEach(([key, value]) => {
            console.log(`      ${key}: ${value}`);
          });
        });
      } else {
        console.log(`⚠️  No records found for call ${CALL_ID}`);
      }
    } catch(err) {
      console.log(`❌ Error checking call_spare_usage: ${err.message}`);
    }
    
    // ========================================================================
    // 3. Check goods_movement_items table
    // ========================================================================
    console.log('\n\n📍 GOODS_MOVEMENT_ITEMS TABLE:');
    console.log('-'.repeat(100));
    
    try {
      const [columns] = await sequelize.query(`
        SELECT COLUMN_NAME, DATA_TYPE
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'goods_movement_items'
        ORDER BY ORDINAL_POSITION
      `);
      
      console.log('\n🔍 Columns in goods_movement_items table:');
      columns.slice(0, 15).forEach(col => {
        console.log(`   - ${col.COLUMN_NAME} (${col.DATA_TYPE})`);
      });
      
      const [data] = await sequelize.query(`
        SELECT TOP 3 * FROM goods_movement_items
        ORDER BY created_at DESC
      `);
      
      if (data && data.length > 0) {
        console.log('\n📋 Sample goods_movement_items records:');
        data.forEach((record, idx) => {
          console.log(`\n   Record ${idx + 1}:`);
          Object.entries(record).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
              console.log(`      ${key}: ${value}`);
            }
          });
        });
      }
    } catch(err) {
      console.log(`❌ Error checking goods_movement_items: ${err.message}`);
    }
    
    // ========================================================================
    // 4. Check spare_inventory for technician
    // ========================================================================
    console.log('\n\n📍 SPARE_INVENTORY - TECHNICIAN INVENTORY:');
    console.log('-'.repeat(100));
    
    try {
      const [data] = await sequelize.query(`
        SELECT * FROM spare_inventory 
        WHERE location_type = 'technician'
        ORDER BY created_at DESC
      `);
      
      if (data && data.length > 0) {
        console.log(`\n✅ Found ${data.length} technician inventory record(s):`);
        data.slice(0, 2).forEach((record, idx) => {
          console.log(`\n   Record ${idx + 1}:`);
          Object.entries(record).forEach(([key, value]) => {
            console.log(`      ${key}: ${value}`);
          });
        });
      } else {
        console.log(`⚠️  No technician inventory records found`);
      }
    } catch(err) {
      console.log(`❌ Error checking spare_inventory: ${err.message}`);
    }
    
    // ========================================================================
    // 5. Summary
    // ========================================================================
    console.log('\n\n📊 WORKFLOW VERIFICATION SUMMARY:');
    console.log('-'.repeat(100));
    
    try {
      // Check if call is closed
      const [calls] = await sequelize.query(`
        SELECT call_id, assigned_asc_id, assigned_tech_id, closed_by FROM calls WHERE call_id = ${CALL_ID}
      `);
      
      if (calls[0].closed_by) {
        console.log(`✅ Call CLOSED: ${calls[0].closed_by}`);
      } else {
        console.log(`⚠️  Call NOT closed`);
      }
      
      // Check spare requests
      const [reqs] = await sequelize.query(`
        SELECT COUNT(*) as cnt FROM spare_requests WHERE call_id = ${CALL_ID}
      `);
      console.log(`✅ Spare requests created: ${reqs[0].cnt}`);
      
      // Check usage records
      const [usage] = await sequelize.query(`
        SELECT COUNT(*) as cnt FROM call_spare_usage WHERE call_id = ${CALL_ID}
      `);
      console.log(`✅ Usage records created: ${usage[0].cnt}`);
      
      // Check stock movements
      const [movements] = await sequelize.query(`
        SELECT COUNT(*) as cnt FROM stock_movement
      `);
      console.log(`✅ Total stock movement records: ${movements[0].cnt}`);
      
      // Check goods movement items
      const [gmi] = await sequelize.query(`
        SELECT COUNT(*) as cnt FROM goods_movement_items
      `);
      console.log(`✅ Total goods movement items: ${gmi[0].cnt}`);
      
    } catch(err) {
      console.log(`❌ Error in summary: ${err.message}`);
    }
    
    console.log('\n' + '='.repeat(100));
    console.log('✅ DIAGNOSTIC COMPLETE');
    console.log('='.repeat(100) + '\n');
    
  } catch(err) {
    console.error('Fatal error:', err.message);
  } finally {
    process.exit(0);
  }
}

diagnoseDatabaseState();
