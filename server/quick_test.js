import { poolPromise } from './db.js';

async function quickTest() {
  try {
    const pool = await poolPromise;
    
    const result = await pool.request()
      .input('callId', 3)
      .query(`
        SELECT 
          csu.usage_id,
          csu.spare_part_id,
          csu.usage_status,
          sp.PART as spare_part_name
        FROM call_spare_usage csu
        LEFT JOIN spare_parts sp ON csu.spare_part_id = sp.Id
        WHERE csu.call_id = @callId
        ORDER BY csu.usage_id DESC
      `);
    
    console.log('✅ QUERY WORKS! Found', result.recordset.length, 'records');
    result.recordset.forEach(r => {
      console.log(`  - ${r.spare_part_name || 'Unknown'} (${r.usage_status})`);
    });
    
  } catch (error) {
    console.log('❌ ERROR:', error.message);
  }
}

quickTest();
