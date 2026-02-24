import sql from 'mssql';

const pool = new sql.ConnectionPool({
  server: 'localhost', user: 'crm_user', password: 'StrongPassword123!',
  database: 'ServiceCrm', options: {instanceName: 'SQLEXPRESS', encrypt: false, trustServerCertificate: true}
});
await pool.connect();
const result = await pool.request().query(`
  SELECT TOP 10 movement_id, reference_type, reference_no FROM stock_movement ORDER BY movement_id DESC
`);
console.log('\n📋 Stock Movement DNs:\n');
result.recordset.forEach(r => console.log(`  Movement ${r.movement_id}: ${r.reference_no}`));
console.log();
await pool.close();
