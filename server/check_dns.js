import sql from 'mssql';

const pool = new sql.ConnectionPool({
  server: 'localhost', user: 'crm_user', password: 'StrongPassword123!',
  database: 'ServiceCrm', options: {instanceName: 'SQLEXPRESS', encrypt: false, trustServerCertificate: true}
});

await pool.connect();

console.log('\n📋 Logistics Documents for Request 24:\n');
const lgResult = await pool.request().query(
  'SELECT TOP 5 id, reference_id, document_number FROM logistics_documents WHERE reference_id = 24 AND document_type = \'DN\' ORDER BY created_at DESC'
);
lgResult.recordset.forEach(r => console.log(`  ID ${r.id}: ${r.document_number}`));

console.log('\n📋 Logistics Documents for Request 31:\n');
const lg2Result = await pool.request().query(
  'SELECT TOP 5 id, reference_id, document_number FROM logistics_documents WHERE reference_id = 31 AND document_type = \'DN\' ORDER BY created_at DESC'
);
lg2Result.recordset.forEach(r => console.log(`  ID ${r.id}: ${r.document_number}`));

await pool.close();
