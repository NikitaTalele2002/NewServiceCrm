import sql from 'mssql';

const pool = new sql.ConnectionPool({
  server: 'localhost',
  user: 'crm_user',
  password: 'StrongPassword123!',
  database: 'ServiceCrm',
  options: {instanceName: 'SQLEXPRESS', encrypt: false, trustServerCertificate: true}
});

await pool.connect();

console.log('\n📋 Stock Movement Details:\n');

const result = await pool.request().query(`
  SELECT TOP 3
    movement_id,
    reference_no,
    reference_type,
    status,
    total_qty,
    source_location_type,
    source_location_id,
    destination_location_type,
    destination_location_id,
    created_at,
    updated_at
  FROM stock_movement
  ORDER BY movement_id DESC
`);

result.recordset.forEach(m => {
  console.log(`Movement ${m.movement_id}:`);
  console.log(`  DN: ${m.reference_no}`);
  console.log(`  Status: ${m.status}`);
  console.log(`  Qty: ${m.total_qty}`);
  console.log(`  Type: ${m.source_location_type}-${m.source_location_id} → ${m.destination_location_type}-${m.destination_location_id}`);
  console.log(`  Created: ${m.created_at}`);
  console.log(`  Updated: ${m.updated_at}`);
  console.log();
});

await pool.close();
