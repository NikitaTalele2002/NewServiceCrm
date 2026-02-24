import sql from 'mssql';

const dbConfig = {
  server: 'localhost',
  user: 'crm_user',
  password: 'StrongPassword123!',
  database: 'ServiceCrm',
  options: {
    instanceName: 'SQLEXPRESS',
    encrypt: false,
    trustServerCertificate: true,
  }
};

async function test() {
  const pool = new sql.ConnectionPool(dbConfig);
  await pool.connect();

  console.log('\n✅ === TEST REQUEST 31 ===\n');

  // Check what DN documents exist for request 31
  const result = await pool.request().query(`
    SELECT id, reference_id, document_number, status, created_at
    FROM logistics_documents
    WHERE reference_id = 31 AND document_type = 'DN'
    ORDER BY created_at ASC
  `);

  console.log('📋 Logistics Documents for Request 31:\n');
  result.recordset.forEach(r => {
    console.log(`  ID ${r.id}: ${r.document_number} (${r.status})`);
  });

  // Check if there's a stock_movement for request 31 yet
  const moveResult = await pool.request().query(`
    SELECT TOP 5 movement_id, reference_no, status
    FROM stock_movement
    WHERE reference_type = 'spare_request'
    ORDER BY movement_id DESC
  `);

  console.log('\n📋 Recent Stock Movements:\n');
  moveResult.recordset.forEach(m => {
    console.log(`  M${m.movement_id}: ${m.reference_no} (${m.status})`);
  });

  await pool.close();
}

try {
  await test();
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
