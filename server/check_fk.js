import { poolPromise } from './db.js';

async function checkFK() {
  try {
    const pool = await poolPromise;
    
    // Check service_centers table
    const sc = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'service_centers' ORDER BY ORDINAL_POSITION
    `);
    console.log('service_centers columns:', sc.recordset.map(c => `${c.COLUMN_NAME}(${c.DATA_TYPE})`).join(', '));
    
    // Check users table 
    const users = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'users' ORDER BY ORDINAL_POSITION
    `);
    console.log('users columns:', users.recordset.map(c => `${c.COLUMN_NAME}(${c.DATA_TYPE})`).join(', '));
    
    // Check if order_requests exists
    const orderReq = await pool.request().query(`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'order_requests'
    `);
    console.log('order_requests exists:', orderReq.recordset.length > 0);
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}
checkFK();
