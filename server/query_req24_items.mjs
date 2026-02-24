#!/usr/bin/env node
import sql from 'mssql';

const config = {
  server: 'localhost',
  user: 'crm_user',
  password: 'StrongPassword123!',
  database: 'ServiceCrm',
  options: { instanceName: 'SQLEXPRESS', encrypt: false, trustServerCertificate: true }
};

(async () => {
  const pool = new sql.ConnectionPool(config);
  await pool.connect();

  const result = await pool.request().query(`SELECT * FROM spare_request_items WHERE request_id = 24`);

  console.log('\nItems in Request 24:');
  result.recordset.forEach(item => {
    console.log(`  Spare ${item.spare_id}: Requested ${item.requested_qty}, Approved ${item.approved_qty}`);
  });

  await pool.close();
})();
