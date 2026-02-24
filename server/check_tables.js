import { poolPromise } from './db.js';

(async () => {
  try {
    const pool = await poolPromise;
    const res = await pool.request().query(
      "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME"
    );
    console.log('Available Tables:');
    res.recordset.forEach(r => console.log('  -', r.TABLE_NAME));
    
    // Now check calls table structure
    console.log('\n\nCalls table columns:');
    const callsRes = await pool.request().query("SELECT TOP 0 * FROM calls");
    const callsCols = Object.keys(callsRes.recordset[0] || {});
    callsCols.forEach(col => console.log('  -', col));
    
    // Check if we have sample data
    console.log('\n\nSample call record:');
    const sampleRes = await pool.request().query("SELECT TOP 1 * FROM calls WHERE call_id IS NOT NULL");
    if (sampleRes.recordset && sampleRes.recordset[0]) {
      console.log(JSON.stringify(sampleRes.recordset[0], null, 2));
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
})();
