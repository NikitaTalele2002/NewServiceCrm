const { poolPromise } = require('../db');

async function run() {
  const pool = await poolPromise;
  try {
    const res = await pool.request().query("SELECT TOP 20 Id, Name, MobileNo, City, PinCode, Address, Area FROM Customers ORDER BY Id");
    console.log('Total customers fetched:', res.recordset.length);
    res.recordset.forEach(c => console.log(c));
  } catch (e) {
    console.error('Error querying customers:', e && e.message ? e.message : e);
  }
}

run().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
