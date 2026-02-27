import { poolPromise } from './db.js';
import sql from 'mssql';

async function getAvailableTechnicians() {
  try {
    const pool = await poolPromise;
    
    const result = await pool.request()
      .query(`SELECT TOP 10 technician_id, name FROM technicians WHERE status = 'active' ORDER BY technician_id`);
    
    console.log('Available Technicians:');
    result.recordset.forEach(t => {
      console.log(`  - ID: ${t.technician_id}, Name: ${t.name}`);
    });
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

getAvailableTechnicians();
