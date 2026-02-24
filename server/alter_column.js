import { poolPromise } from './db.js';

(async () => {
  try {
    const pool = await poolPromise;

    await pool.request().query("EXEC sp_rename 'technicians.ServiceCentreId', 'ServiceCenterId', 'COLUMN'");
    console.log('Column renamed from ServiceCentreId to ServiceCenterId');

  } catch(e) {
    console.error('Error:', e.message);
  }
})();
