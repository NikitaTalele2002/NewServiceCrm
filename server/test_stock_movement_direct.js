/**
 * Direct Database Test: Check stock_movement table
 * Tests the stock_movement table directly without needing model initialization
 */

import { sequelize } from './db.js';
import { poolPromise } from './db.js';

async function testStockMovementTable() {
  console.log('\n🔧 === STOCK MOVEMENT TABLE TEST ===\n');

  try {
    // Test 1: Check if stock_movement table exists
    console.log('📝 Step 1: Checking if stock_movement table exists...\n');
    const tableCheck = await sequelize.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'stock_movement'
    `, { type: sequelize.QueryTypes.SELECT });

    if (tableCheck.length > 0) {
      console.log('✅ stock_movement table exists\n');
    } else {
      console.log('❌ stock_movement table does NOT exist\n');
      return;
    }

    // Test 2: Check table structure
    console.log('📝 Step 2: Checking table structure...\n');
    const columns = await sequelize.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'stock_movement'
      ORDER BY ORDINAL_POSITION
    `, { type: sequelize.QueryTypes.SELECT });

    console.log(`Found ${columns.length} columns:\n`);
    columns.forEach(col => {
      console.log(`  ✓ ${col.COLUMN_NAME}`);
      console.log(`    Type: ${col.DATA_TYPE}`);
      console.log(`    Nullable: ${col.IS_NULLABLE}`);
      console.log(`    Default: ${col.COLUMN_DEFAULT}\n`);
    });

    // Test 3: Check if status column exists
    const hasStatus = columns.some(col => col.COLUMN_NAME === 'status');
    console.log(hasStatus ? '✅ status column EXISTS' : '❌ status column MISSING');
    console.log('\n');

    // Test 4: Count records in stock_movement
    console.log('📝 Step 3: Checking current records in stock_movement...\n');
    const countResult = await sequelize.query(`
      SELECT COUNT(*) as row_count FROM stock_movement
    `, { type: sequelize.QueryTypes.SELECT });

    const recordCount = countResult[0]?.row_count || 0;
    console.log(`Total records: ${recordCount}\n`);

    // Test 5: Get recent records
    if (recordCount > 0) {
      console.log('📝 Step 4: Fetching recent stock_movement records...\n');
      const recentRecords = await sequelize.query(`
        SELECT TOP 5
          movement_id,
          movement_type,
          reference_no,
          source_location_id,
          destination_location_id,
          total_qty,
          status,
          created_at
        FROM stock_movement
        ORDER BY created_at DESC
      `, { type: sequelize.QueryTypes.SELECT });

      recentRecords.forEach((record, idx) => {
        console.log(`${idx + 1}. Movement ID: ${record.movement_id}`);
        console.log(`   Type: ${record.movement_type}`);
        console.log(`   Reference: ${record.reference_no}`);
        console.log(`   Status: ${record.status || 'NULL'}`);
        console.log(`   Total Qty: ${record.total_qty}`);
        console.log(`   Created: ${record.created_at}\n`);
      });
    }

    // Test 6: Check goods_movement_items
    console.log('📝 Step 5: Checking goods_movement_items table...\n');
    const goodsCountResult = await sequelize.query(`
      SELECT COUNT(*) as row_count FROM goods_movement_items
    `, { type: sequelize.QueryTypes.SELECT });

    const goodsCount = goodsCountResult[0]?.row_count || 0;
    console.log(`Total goods_movement_items records: ${goodsCount}\n`);

    // Test 7: Check cartons
    console.log('📝 Step 6: Checking cartons table...\n');
    const cartonsCountResult = await sequelize.query(`
      SELECT COUNT(*) as row_count FROM cartons
    `, { type: sequelize.QueryTypes.SELECT });

    const cartonsCount = cartonsCountResult[0]?.row_count || 0;
    console.log(`Total cartons records: ${cartonsCount}\n`);

    // Test 8: Summary
    console.log('📊 === RESULTS ===\n');
    if (hasStatus) {
      console.log('✅ status column properly defined');
    } else {
      console.log('❌ status column missing - migration needs to run');
    }

    if (recordCount > 0) {
      console.log(`✅ stock_movement table has ${recordCount} records - DATA IS BEING INSERTED`);
    } else {
      console.log('❌ stock_movement table is EMPTY - NO DATA BEING INSERTED');
    }

    console.log('\n📝 Next Steps:');
    console.log('1. Make sure the receive-delivery endpoint is being called');
    console.log('2. Run test_receive_delivery_complete.js to test the API flow');
    console.log('3. Check server logs for any errors during insertion');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

// Run the test
testStockMovementTable();
