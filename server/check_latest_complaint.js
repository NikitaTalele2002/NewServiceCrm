const { poolPromise } = require('./db');

(async () => {
  try {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT TOP 1 * 
      FROM ComplaintRegistration 
      ORDER BY Id DESC
    `);
    if (result.recordset.length > 0) {
      console.log('Latest Complaint:');
      console.log(JSON.stringify(result.recordset[0], null, 2));
    } else {
      console.log('No complaints found');
    }
    process.exit(0);
  } catch(e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
