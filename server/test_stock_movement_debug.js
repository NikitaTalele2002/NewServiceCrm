/**
 * Direct Database Test: Verify Stock Movement & Goods Movement Items Creation
 * This test directly inserts test data and checks if stock movement is created
 */

import sql from 'mssql';

const dbConfig = {
  server: 'localhost',
  user: 'crm_user',
  password: 'StrongPassword123!',
  database: 'ServiceCrm',
  options: {
    instanceName: 'SQLEXPRESS',
    encrypt: false,
    trustServerCertificate: true,
    enableKeepAlive: true,
  }
};

async function testStockMovementCreation() {
  const pool = new sql.ConnectionPool(dbConfig);
  
  try {
    await pool.connect();
    console.log('✅ Connected to database\n');

    // STEP 1: Check current state
    console.log('STEP 1: Checking current stock_movement table...');
    console.log('━'.repeat(70));
    
    const smCountResult = await pool.request().query(`
      SELECT COUNT(*) as cnt FROM stock_movement WHERE reference_type = 'return_request'
    `);
    const smCount = smCountResult.recordset[0].cnt;
    console.log(`  Current return_request stock movements: ${smCount}\n`);

    // STEP 2: Check goods_movement_items
    console.log('STEP 2: Checking current goods_movement_items table...');
    console.log('━'.repeat(70));
    
    const gmiCountResult = await pool.request().query(`
      SELECT COUNT(*) as cnt FROM goods_movement_items gmi
      INNER JOIN stock_movement sm ON gmi.movement_id = sm.movement_id
      WHERE sm.reference_type = 'return_request'
    `);
    const gmiCount = gmiCountResult.recordset[0].cnt;
    console.log(`  Current goods_movement_items linked to return requests: ${gmiCount}\n`);

    // STEP 3: Check spare_inventory table
    console.log('STEP 3: Checking spare_inventory table structure...');
    console.log('━'.repeat(70));
    
    const siResult = await pool.request().query(`
      SELECT TOP 3 * FROM spare_inventory
    `);
    console.log(`  Sample spare_inventory records: ${siResult.recordset.length}`);
    if (siResult.recordset.length > 0) {
      const sample = siResult.recordset[0];
      console.log(`  Sample columns: ${Object.keys(sample).join(', ')}\n`);
    }

    // STEP 4: Check if there are any return_request spare_requests
    console.log('STEP 4: Checking spare_requests for return_request type...');
    console.log('━'.repeat(70));
    
    const rrResult = await pool.request().query(`
      SELECT TOP 5 request_id, status_id, requested_source_id, requested_to_id, request_type
      FROM spare_requests
      WHERE request_type = 'return_request' OR request_reason LIKE '%return%'
      ORDER BY request_id DESC
    `);
    console.log(`  Found ${rrResult.recordset.length} potential return requests\n`);
    
    if (rrResult.recordset.length > 0) {
      const rr = rrResult.recordset[0];
      console.log(`  Latest return request ID: ${rr.request_id}`);
      console.log(`  Status ID: ${rr.status_id}`);
      console.log(`  From (source): ${rr.requested_source_id}`);
      console.log(`  To (destination): ${rr.requested_to_id}\n`);
    }

    // STEP 5: Check stock_movement schema
    console.log('STEP 5: Checking stock_movement table schema...');
    console.log('━'.repeat(70));
    
    const smSchemaResult = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'stock_movement'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('  stock_movement columns:');
    for (const col of smSchemaResult.recordset) {
      const nullable = col.IS_NULLABLE === 'YES' ? '(nullable)' : '(required)';
      console.log(`    - ${col.COLUMN_NAME}: ${col.DATA_TYPE} ${nullable}`);
    }
    console.log();

    // STEP 6: Check goods_movement_items schema
    console.log('STEP 6: Checking goods_movement_items table schema...');
    console.log('━'.repeat(70));
    
    const gmiSchemaResult = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'goods_movement_items'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('  goods_movement_items columns:');
    for (const col of gmiSchemaResult.recordset) {
      const nullable = col.IS_NULLABLE === 'YES' ? '(nullable)' : '(required)';
      console.log(`    - ${col.COLUMN_NAME}: ${col.DATA_TYPE} ${nullable}`);
    }
    console.log();

    // STEP 7: Check recent stock_movement records
    console.log('STEP 7: Recent stock_movement records...');
    console.log('━'.repeat(70));
    
    const recentSMResult = await pool.request().query(`
      SELECT TOP 10 
        movement_id, movement_type, reference_type, reference_no,
        source_location_type, source_location_id,
        destination_location_type, destination_location_id,
        total_qty, movement_date, status
      FROM stock_movement
      ORDER BY movement_id DESC
    `);
    
    if (recentSMResult.recordset.length > 0) {
      console.log(`  Found ${recentSMResult.recordset.length} recent movements:\n`);
      for (const sm of recentSMResult.recordset.slice(0, 3)) {
        console.log(`  Movement ID: ${sm.movement_id}`);
        console.log(`    Type: ${sm.movement_type}`);
        console.log(`    Reference: ${sm.reference_type} - ${sm.reference_no}`);
        console.log(`    From: ${sm.source_location_type} (${sm.source_location_id})`);
        console.log(`    To: ${sm.destination_location_type} (${sm.destination_location_id})`);
        console.log(`    Qty: ${sm.total_qty}, Status: ${sm.status}`);
        console.log();
      }
    } else {
      console.log('  ⚠️ No stock_movement records found\n');
    }

    // STEP 8: Check recent goods_movement_items records
    console.log('STEP 8: Recent goods_movement_items records...');
    console.log('━'.repeat(70));
    
    const recentGMIResult = await pool.request().query(`
      SELECT TOP 10 
        movement_item_id, movement_id, spare_part_id, qty, condition, created_at
      FROM goods_movement_items
      ORDER BY movement_item_id DESC
    `);
    
    if (recentGMIResult.recordset.length > 0) {
      console.log(`  Found ${recentGMIResult.recordset.length} recent goods movements:\n`);
      for (const gmi of recentGMIResult.recordset.slice(0, 3)) {
        console.log(`  Item ID: ${gmi.movement_item_id}`);
        console.log(`    Movement ID: ${gmi.movement_id}`);
        console.log(`    Spare ID: ${gmi.spare_part_id}`);
        console.log(`    Qty: ${gmi.qty}, Condition: ${gmi.condition}`);
        console.log();
      }
    } else {
      console.log('  ⚠️ No goods_movement_items records found\n');
    }

    // STEP 9: Diagnosis
    console.log('DIAGNOSIS & RECOMMENDATIONS:');
    console.log('━'.repeat(70));
    
    if (smCount === 0) {
      console.log('❌ ISSUE: No stock_movement records created for return_requests');
      console.log('\n   Possible causes:');
      console.log('   1. verifyReturnRequest() is not creating stock_movement');
      console.log('   2. Transaction is being rolled back');
      console.log('   3. Field mapping is incorrect');
      console.log('   4. Database constraint is preventing insertion');
      console.log('\n   Action: Check spareReturnRequestService.js verifyReturnRequest() function');
      console.log('           and verify the StockMovement.create() call is properly configured');
    } else {
      console.log(`✓ Found ${smCount} stock_movement records for return_requests`);
      
      if (gmiCount === 0) {
        console.log('❌ ISSUE: No goods_movement_items created for these movements');
        console.log('\n   Possible causes:');
        console.log('   1. GoodsMovementItems.create() is not being called');
        console.log('   2. Transaction is rolling back after movement creation');
        console.log('   3. Field mapping between spare_id and spare_part_id is wrong');
      } else {
        console.log(`✓ Found ${gmiCount} goods_movement_items linked to return requests`);
      }
    }

    console.log('\n' + '═'.repeat(70));
    console.log('\n📊 Summary Report:');
    console.log(`   • stock_movement (return_request): ${smCount} records`);
    console.log(`   • goods_movement_items: ${gmiCount} records`);
    console.log(`   • Status: ${smCount > 0 ? '✓ Data is being created' : '❌ Data is NOT being created'}`);

  } catch (error) {
    console.error('❌ Database Error:', error.message);
    console.error('\n   Make sure:');
    console.error('   1. SQL Server is running');
    console.error('   2. Database connection details are correct');
    console.error('   3. Tables exist: stock_movement, goods_movement_items');
  } finally {
    await pool.close();
  }
}

testStockMovementCreation();
