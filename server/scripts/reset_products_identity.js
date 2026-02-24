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

    // Check products table structure
    console.log('📋 products table info:');
    const colResult = await pool.query(`
      SELECT COLUMN_NAME, DATA_TYPE, COLUMNPROPERTY(OBJECT_ID('products'), COLUMN_NAME, 'IsIdentity') as IsIdentity
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'products'
      ORDER BY ORDINAL_POSITION
    `);
    
    if (colResult.recordset.length === 0) {
      console.log('❌ products table not found!');
      process.exit(1);
    }

    let idColumn = null;
    colResult.recordset.forEach(col => {
      const isId = col.IsIdentity === 1 ? ' [IDENTITY]' : '';
      console.log(`  ${col.COLUMN_NAME.padEnd(20)} ${col.DATA_TYPE.padEnd(15)}${isId}`);
      if (col.IsIdentity === 1) {
        idColumn = col.COLUMN_NAME;
      }
    });

    if (!idColumn) {
      console.error('\n❌ No IDENTITY column found in products table!');
      process.exit(1);
    }

    console.log(`\nIdentity column: ${idColumn}`);

    // Check current max value
    const maxResult = await pool.query('SELECT MAX(ID) as MaxID, COUNT(*) as TotalRows FROM products');
    console.log(`Current max ID: ${maxResult.recordset[0].MaxID}`);
    console.log(`Total rows: ${maxResult.recordset[0].TotalRows}`);

    // Clear and reset
    console.log('\n🗑️  Clearing products table...');
    await pool.query('DELETE FROM products');
    console.log('✓ All rows deleted');

    console.log('Resetting identity seed to 0...');
    await pool.query("DBCC CHECKIDENT ('products', RESEED, 0)");
    console.log('✓ Identity reset');

    // Test insert
    console.log('\n🧪 Testing insert...');
    await pool.query("INSERT INTO products (VALUE) VALUES ('TEST-PRODUCT')");

    const testResult = await pool.query('SELECT MAX(ID) as TestID FROM products');
    const testId = testResult.recordset[0].TestID;

    console.log(`✅ First inserted ID: ${testId}`);

    if (testId === 1) {
      console.log('✅ SUCCESS: Products will start from ID 1 on next upload!');
    } else {
      console.log(`⚠️  WARNING: Started from ${testId}, expected 1`);
    }

    // Reset back to 0 for actual upload
    await pool.query('DELETE FROM products');
    await pool.query("DBCC CHECKIDENT ('products', RESEED, 0)");
    console.log('\n✅ Ready for product upload - IDs will start from 1');

    await pool.close();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
