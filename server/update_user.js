import { poolPromise } from './db.js';

(async () => {
  try {
    const pool = await poolPromise;

    // Update user 3 to have CenterId = 2
    await pool.request().query("UPDATE users SET CenterId = 2 WHERE UserID = 3");

    console.log('Updated user 3 CenterId to 2');

  } catch(e) {
    console.error('Error:', e.message);
  }
})(); 
