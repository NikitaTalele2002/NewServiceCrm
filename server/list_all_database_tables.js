import sql from 'mssql';

const config = {
  user: 'crm_user',
  password: 'StrongPassword123!',
  database: 'NewCRM',
  server: 'localhost',
  instanceName: 'SQLEXPRESS',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

(async () => {
  const pool = new sql.ConnectionPool(config);
  await pool.connect();
  try {
    const result = await pool.request().query(`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'dbo' 
      ORDER BY TABLE_NAME
    `);
    
    console.log('📊 ALL TABLES IN DATABASE:\n');
    result.recordset.forEach((row, idx) => {
      console.log(`${(idx + 1).toString().padStart(3)}. ${row.TABLE_NAME}`);
    });
    
    console.log(`\n📈 Total tables: ${result.recordset.length}`);
  } catch(err) {
    console.error('Error:', err.message);
  }
  await pool.close();
  process.exit(0);
})();
