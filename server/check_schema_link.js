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

async function checkSchema() {
  const pool = new sql.ConnectionPool(dbConfig);
  await pool.connect();

  console.log('\n📋 Stock Movement → Cartons → Goods Movement Items Link:\n');

  const result = await pool.request().query(`
    SELECT TOP 3
      m.movement_id,
      m.reference_type,
      m.reference_no,
      c.carton_id,
      gmi.spare_id,
      gmi.request_id
    FROM stock_movement m
    LEFT JOIN cartons c ON c.movement_id = m.movement_id
    LEFT JOIN goods_movement_items gmi ON gmi.carton_id = c.carton_id
    ORDER BY m.movement_id DESC
  `);

  console.log(JSON.stringify(result.recordset, null, 2));

  await pool.close();
}

try {
  await checkSchema();
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
