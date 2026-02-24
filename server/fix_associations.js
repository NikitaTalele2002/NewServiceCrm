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

    // Insert Bengaluru branch
    await pool.request().query("INSERT INTO Branches (BranchName, Location, CreatedAt) VALUES ('Bengaluru Branch', 'Bengaluru', GETDATE())");

    // Get the new branch ID
    const branchResult = await pool.request().query('SELECT Id FROM Branches WHERE BranchName = \'Bengaluru Branch\'');
    const branchId = branchResult.recordset[0].Id;

    // Update SC 3 to use this branch
    await pool.request()
      .input('branchId', sql.Int, branchId)
      .query('UPDATE ServiceCenters SET BranchId = @branchId WHERE Id = 3');

    // Update Branch1 user to have a branch (let's assign to Pune branch)
    await pool.request()
      .input('branchId', sql.Int, 4)
      .query('UPDATE Users SET BranchId = @branchId WHERE UserID = 4');

    console.log('Database updated successfully');
    await pool.close();
  } catch (err) {
    console.error('Error:', err);
  }
})();