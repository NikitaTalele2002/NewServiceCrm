const { poolPromise } = require('../db');

(async () => {
  try {
    const pool = await poolPromise;
    console.log('\n=== Checking Table Schemas ===\n');

    // Get Customers columns
    console.log('--- Customers columns ---');
    const custColsRes = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'Customers' ORDER BY ORDINAL_POSITION
    `);
    console.log('Columns:', custColsRes.recordset.map(r => `${r.COLUMN_NAME} (${r.DATA_TYPE})`).join(', '));

    // Get Products columns
    console.log('\n--- Products columns ---');
    const prodColsRes = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'Products' ORDER BY ORDINAL_POSITION
    `);
    console.log('Columns:', prodColsRes.recordset.map(r => `${r.COLUMN_NAME} (${r.DATA_TYPE})`).join(', '));

    // Get ComplaintRegistration columns
    console.log('\n--- ComplaintRegistration columns ---');
    const complColsRes = await pool.request().query(`
      SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'ComplaintRegistration' ORDER BY ORDINAL_POSITION
    `);
    console.log('Columns:', complColsRes.recordset.map(r => `${r.COLUMN_NAME} (${r.DATA_TYPE})`).join(', '));

    console.log('\n✓ Done');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err && err.message ? err.message : err);
    if (err.stack) console.error(err.stack);
    process.exit(1);
  }
})();
