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
    enableKeepAlive: true,
  }
};

(async () => {
  const pool = new sql.ConnectionPool(dbConfig);
  await pool.connect();

  console.log('\n📊 Checking spare_inventory location types and distribution:\n');
  
  const result = await pool.request().query(`
    SELECT DISTINCT location_type, location_id, COUNT(*) as count
    FROM spare_inventory
    GROUP BY location_type, location_id
    ORDER BY location_type, location_id
  `);

  result.recordset.forEach(row => {
    console.log(`  ${row.location_type}-${row.location_id}: ${row.count} spares`);
  });

  console.log('\n\n📋 Spare 0 inventory across all locations:\n');
  
  const spare0 = await pool.request().query(`
    SELECT location_type, location_id, qty_good, qty_defective
    FROM spare_inventory
    WHERE spare_id = 0
  `);

  spare0.recordset.forEach(row => {
    console.log(`  ${row.location_type}-${row.location_id}: good=${row.qty_good}, defective=${row.qty_defective}`);
  });

  await pool.close();
})();
