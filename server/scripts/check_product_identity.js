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

    // Check ProductMaster columns
    console.log('📋 ProductMaster columns:');
    const pmResult = await pool.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMNPROPERTY(OBJECT_ID('ProductMaster'), COLUMN_NAME, 'IsIdentity') as IsIdentity
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'ProductMaster'
      ORDER BY ORDINAL_POSITION
    `);
    
    pmResult.recordset.forEach(col => {
      const isId = col.IsIdentity === 1 ? ' [IDENTITY]' : '';
      console.log(`  ${col.COLUMN_NAME.padEnd(20)} ${col.DATA_TYPE.padEnd(15)} ${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'}${isId}`);
    });

    // Clear table
    console.log('\nClearing ProductMaster...');
    await pool.query('DELETE FROM ProductMaster');
    
    // Reset to -1 so next insert starts from 1
    console.log('Resetting identity to -1...');
    await pool.query("DBCC CHECKIDENT ('ProductMaster', RESEED, -1)");
    
    // Test insert
    console.log('\nTesting insert...');
    await pool.query("INSERT INTO ProductMaster (VALUE) VALUES ('TEST')");
    
    const result = await pool.query('SELECT MAX(ID) as LastId FROM ProductMaster');
    const lastId = result.recordset[0].LastId;
    
    console.log(`✅ First inserted ID: ${lastId}`);
    
    if (lastId === 1) {
      console.log('SUCCESS: Will start from ID 1 on next upload!');
    } else {
      console.log(`WARNING: Started from ${lastId}, expected 1`);
    }

    // Clean up
    await pool.query("DELETE FROM ProductMaster WHERE VALUE = 'TEST'");
    
    // Reset again to -1 for actual upload
    console.log('\nResetting identity to -1 for next upload...');
    await pool.query("DBCC CHECKIDENT ('ProductMaster', RESEED, -1)");

    await pool.close();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
