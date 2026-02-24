const { poolPromise } = require('../db');

async function run() {
  const pool = await poolPromise;
  try {
    const res = await pool.request().query(`
      SELECT ISNULL(AssignedCenterId, -1) AS AssignedCenterId, COUNT(*) AS Cnt
      FROM ComplaintRegistration
      GROUP BY ISNULL(AssignedCenterId, -1)
      ORDER BY Cnt DESC
    `);
    console.log('Complaint counts by AssignedCenterId:');
    res.recordset.forEach(r => console.log(r));
  } catch (e) {
    console.error('Error querying ComplaintRegistration counts:', e && e.message ? e.message : e);
  }
}

run().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
