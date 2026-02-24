import { poolPromise } from './db.js';

(async () => {
  try {
    const pool = await poolPromise;

    const result = await pool.request().query('SELECT TOP 1 * FROM technicians');
    console.log('Technicians columns:', Object.keys(result.recordset[0] || {}));

  } catch(e) {
    console.error('Error:', e.message);
  }
})();