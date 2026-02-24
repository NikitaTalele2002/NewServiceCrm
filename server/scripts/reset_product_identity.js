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
    console.log('✓ Connected to ServiceCrm\n');

    // Check current identity seed
    console.log('📋 Checking ProductMaster table...');
    
    const maxIdResult = await pool.query('SELECT MAX(Id) as MaxId, COUNT(*) as TotalRows FROM ProductMaster');
    
    console.log(`Max ID in table: ${maxIdResult.recordset[0].MaxId}`);
    console.log(`Total rows: ${maxIdResult.recordset[0].TotalRows}`);

    // Now clean and reset
    console.log('\n🗑️  Clearing ProductMaster table...');
    await pool.query('DELETE FROM ProductMaster');
    console.log('✓ All rows deleted');

    // Reset identity to 0
    console.log('Resetting identity seed to 0...');
    await pool.query("DBCC CHECKIDENT ('ProductMaster', RESEED, 0)");
    console.log('✓ Identity reset');

    // Verify
    const verifyResult = await pool.query('SELECT MAX(Id) as MaxId, COUNT(*) as TotalRows FROM ProductMaster');
    
    console.log(`\n✅ After reset:`);
    console.log(`   Max ID: ${verifyResult.recordset[0].MaxId}`);
    console.log(`   Row count: ${verifyResult.recordset[0].TotalRows}`);

    // Test insert
    console.log('\n🧪 Testing insert...');
    await pool.query("INSERT INTO ProductMaster (VALUE, DESCRIPTION) VALUES ('TEST', 'Test Product')");
    
    const testResult = await pool.query('SELECT MAX(Id) as NewId FROM ProductMaster');
    console.log(`First inserted ID: ${testResult.recordset[0].NewId}`);
    
    if (testResult.recordset[0].NewId === 1) {
      console.log('✅ SUCCESS: Next ID will start from 1!');
    } else {
      console.log(`⚠️  WARNING: ID started from ${testResult.recordset[0].NewId}, expected 1`);
    }

    // Clean up test record
    await pool.query("DELETE FROM ProductMaster WHERE VALUE = 'TEST'");

    await pool.close();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
