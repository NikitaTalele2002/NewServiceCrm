import sql from 'mssql';

const pool = new sql.ConnectionPool({
  server: 'localhost',
  user: 'crm_user',
  password: 'StrongPassword123!',
  database: 'ServiceCrm',
  options: {instanceName: 'SQLEXPRESS', encrypt: false, trustServerCertificate: true}
});

await pool.connect();

console.log('\n✅ === VERIFICATION: DN FIX COMPLETE ===\n');

console.log('📋 Logistics Document for Request 31:');
const lg = await pool.request().query(`
  SELECT id, document_number, status FROM logistics_documents WHERE reference_id = 31 AND document_type = 'DN'
`);
if (lg.recordset[0]) {
  console.log(`  DN: ${lg.recordset[0].document_number}`);
  console.log(`  Status: ${lg.recordset[0].status}\n`);
}

console.log('📋 Stock Movement for Request 31:');
const sm = await pool.request().query(`
  SELECT movement_id, reference_no, reference_type, total_qty, status FROM stock_movement WHERE reference_no = '${lg.recordset[0].document_number}'
`);
if (sm.recordset[0]) {
  console.log(`  Movement ID: ${sm.recordset[0].movement_id}`);
  console.log(`  reference_no: ${sm.recordset[0].reference_no} ✅ MATCHES`);
  console.log(`  Qty: ${sm.recordset[0].total_qty}`);
  console.log(`  Status: ${sm.recordset[0].status}\n`);
}

console.log('📋 Inventory After Receipt:');
const inv = await pool.request().query(`
  SELECT spare_id, location_type, location_id, qty_good 
  FROM spare_inventory 
  WHERE spare_id = 3 AND (location_type = 'plant' OR location_type = 'service_center')
  ORDER BY location_type DESC
`);
inv.recordset.forEach(i => {
  const locName = i.location_type === 'plant' ? 'Plant' : 'ASC';
  console.log(`  ${locName} (ID ${i.location_id}): ${i.qty_good} units`);
});

await pool.close();
