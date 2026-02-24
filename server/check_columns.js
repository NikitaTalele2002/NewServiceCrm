import { poolPromise } from './db.js';

(async () => {
  try {
    const pool = await poolPromise;

    const tables = ['technician_status_requests', 'technicians', 'users', 'ServiceCenters'];

    for (const table of tables) {
      const result = await pool.request().query(`
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = '${table}'
        ORDER BY ORDINAL_POSITION
      `);
      console.log(`${table} columns:`);
      result.recordset.forEach(r => console.log('  - ' + r.COLUMN_NAME));
      console.log('');
    }

   
    process.exit(0);
  } catch(e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
