import sql from 'mssql';

const poolConfig = {
  user: process.env.DB_USER || 'crm_user',
  password: process.env.DB_PASS || 'StrongPassword123!',
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_NAME || 'crm',
  options: {
    instanceName: process.env.DB_INSTANCE || 'SQLEXPRESS',
    encrypt: false,
    trustServerCertificate: true,
    requestTimeout: 30000,
  },
  pool: { max: 5, min: 0, idleTimeoutMillis: 10000 },
};

(async () => {
  try {
    const pool = await sql.connect(poolConfig);
    const result = await pool.request().query('SELECT Id, BranchName FROM Branches ORDER BY Id');
    console.log('Branches:');
    result.recordset.forEach(b => console.log(`Id: ${b.Id}, Name: ${b.BranchName}`));
    await pool.close();
  } catch (err) {
    console.error('Error:', err);
  }
})();