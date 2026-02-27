import { poolPromise } from './db.js';

async function checkSparePartsColumns() {
  try {
    const pool = await poolPromise;
    
    console.log('\n=== Checking spare_parts table columns ===\n');
    
    const result = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'spare_parts'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('Columns in spare_parts table:');
    result.recordset.forEach(col => {
      console.log(`  - ${col.COLUMN_NAME} (${col.DATA_TYPE})`);
    });
    
    console.log('\n=== Testing corrected query ===\n');
    
    // Now test with correct columns
    const testResult = await pool.request()
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
          sp.Id,
          sp.PART as spare_part_name,
          sp.DESCRIPTION
        FROM call_spare_usage csu
        LEFT JOIN spare_parts sp ON csu.spare_part_id = sp.Id
        WHERE csu.call_id = @callId
        ORDER BY csu.usage_id DESC
      `);
    
    console.log('✅ Corrected query works!');
    console.log(`Result for call_id = 3: ${testResult.recordset.length} records`);
    if (testResult.recordset.length > 0) {
      testResult.recordset.forEach(record => {
        console.log(`  - Part: ${record.spare_part_name}, Status: ${record.usage_status}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkSparePartsColumns();
