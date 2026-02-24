import sql from 'mssql';

const config = {
  server: 'localhost\\SQLEXPRESS',
  database: 'ServiceCrm',
  authentication: {
    type: 'default',
    options: {
      userName: 'crm_user',
      password: 'StrongPassword123!'
    }
  },
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableKeepAlive: true,
    useUTC: true,
    instanceName: 'SQLEXPRESS'
  }
};

(async () => {
  try {
    const pool = new sql.ConnectionPool(config);
    await pool.connect();
    console.log('✓ Connected\n');

    const tableName = 'ProductMaster';
    
    // Check current state
    const beforeResult = await pool.query(`SELECT MAX(ID) as MaxID, COUNT(*) as TotalRows FROM ${tableName}`);
    console.log(`📋 Before reset:`);
    console.log(`   Max ID: ${beforeResult.recordset[0].MaxID}`);
    console.log(`   Total rows: ${beforeResult.recordset[0].TotalRows}`);

    // Clear table
    console.log(`\n🗑️  Clearing ${tableName}...`);
    await pool.query(`DELETE FROM ${tableName}`);
    console.log('✓ All rows deleted');

    // Reset identity seed to 0
    console.log(`Resetting identity seed to 0...`);
    await pool.query(`DBCC CHECKIDENT ('${tableName}', RESEED, 0)`);
    console.log('✓ Identity reset');

    // Test insert
    console.log(`\n🧪 Testing insert...`);
    await pool.query(`INSERT INTO ${tableName} (VALUE) VALUES ('TEST')`);
    
    const testResult = await pool.query(`SELECT MAX(ID) as TestID FROM ${tableName}`);
    const testId = testResult.recordset[0].TestID;

    console.log(`✅ First inserted ID: ${testId}`);

    if (testId === 1) {
      console.log('✅ SUCCESS: IDs will start from 1');
    } else {
      console.log(`⚠️  Started from ${testId}`);
    }

    // Cleanup
    await pool.query(`DELETE FROM ${tableName}`);
    await pool.query(`DBCC CHECKIDENT ('${tableName}', RESEED, 0)`);

    await pool.close();
    console.log('\n✅ ProductMaster ready for upload!');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
