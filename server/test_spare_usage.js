import { poolPromise } from './db.js';

async function testSpareUsage() {
  console.log('\n=== Testing Spare Usage Endpoint ===\n');
  
  try {
    console.log('1. Testing database connection...');
    const pool = await poolPromise;
    console.log('✅ Database pool connected\n');

    console.log('2. Checking call_spare_usage table structure...');
    try {
      const schemaResult = await pool.request().query(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'call_spare_usage'
        ORDER BY ORDINAL_POSITION
      `);
      console.log('Table columns:');
      schemaResult.recordset.forEach(col => {
        console.log(`  - ${col.COLUMN_NAME} (${col.DATA_TYPE}, nullable: ${col.IS_NULLABLE})`);
      });
    } catch (err) {
      console.log('⚠️  Could not get table schema:', err.message);
    }
    console.log();

    console.log('3. Checking if call_spare_usage table exists...');
    const tableCheckResult = await pool.request().query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'call_spare_usage'
    `);
    if (tableCheckResult.recordset.length > 0) {
      console.log('✅ Table exists\n');
    } else {
      console.log('❌ Table does not exist\n');
      return;
    }

    console.log('4. Counting records in call_spare_usage...');
    const countResult = await pool.request().query('SELECT COUNT(*) as count FROM call_spare_usage');
    const recordCount = countResult.recordset[0].count;
    console.log(`Found ${recordCount} records\n`);

    if (recordCount > 0) {
      console.log('5. Fetching first 5 records from call_spare_usage...');
      const firstRecordsResult = await pool.request().query(`
        SELECT TOP 5 
          usage_id, call_id, spare_part_id, usage_status
        FROM call_spare_usage
        ORDER BY usage_id DESC
      `);
      console.log('Sample records:');
      firstRecordsResult.recordset.forEach(record => {
        console.log(`  - usage_id: ${record.usage_id}, call_id: ${record.call_id}, spare_part_id: ${record.spare_part_id}, status: ${record.usage_status}`);
      });
      console.log();
    }

    console.log('6. Testing spare_parts table...');
    const sparePartCheckResult = await pool.request().query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'spare_parts'
    `);
    if (sparePartCheckResult.recordset.length > 0) {
      console.log('✅ spare_parts table exists');
      const spareCountResult = await pool.request().query('SELECT COUNT(*) as count FROM spare_parts');
      console.log(`Found ${spareCountResult.recordset[0].count} spare parts\n`);
    } else {
      console.log('❌ spare_parts table does not exist\n');
    }

    console.log('7. Testing the actual query for call_id = 3...');
    const testQuery = await pool.request()
      .input('callId', 3)
      .query(`
        SELECT 
          csu.usage_id,
          csu.call_id,
          csu.spare_part_id,
          csu.issued_qty,
          csu.used_qty,
          csu.returned_qty,
          csu.usage_status,
          csu.used_at,
          csu.remarks,
          sp.spare_part_id,
          sp.spare_part_name,
          sp.spare_part_code
        FROM call_spare_usage csu
        LEFT JOIN spare_parts sp ON csu.spare_part_id = sp.spare_part_id
        WHERE csu.call_id = @callId
        ORDER BY csu.usage_id DESC
      `);

    console.log(`Query result for call_id = 3:`);
    if (testQuery.recordset.length === 0) {
      console.log('  ℹ️  No records found (this is okay - means no spare parts for this call)\n');
    } else {
      console.log(`Found ${testQuery.recordset.length} records:`);
      testQuery.recordset.forEach(record => {
        console.log(`  - usage_id: ${record.usage_id}, part_name: ${record.spare_part_name}, status: ${record.usage_status}`);
      });
      console.log();
    }

    console.log('✅ ALL TESTS PASSED - Query is working correctly\n');

  } catch (error) {
    console.error('\n❌ ERROR OCCURRED:');
    console.error('Message:', error.message);
    console.error('Code:', error.code);
    if (error.originalError) {
      console.error('Original Error:', error.originalError.message);
    }
    console.error('\nFull error:', error);
  }
}

testSpareUsage();
