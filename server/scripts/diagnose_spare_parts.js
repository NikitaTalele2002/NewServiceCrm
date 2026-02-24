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
    console.log('✓ Connected to ServiceCrm database\n');

    // Check for FK constraints on spare_parts
    console.log('📋 Checking constraints on spare_parts table:');
    try {
      const fkResult = await pool.query(`
        SELECT 'FK' as TYPE, CONSTRAINT_NAME, COLUMN_NAME
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
        WHERE TABLE_NAME = 'spare_parts' AND REFERENCED_TABLE_NAME IS NOT NULL
        UNION ALL
        SELECT 'CHECK', CONSTRAINT_NAME, NULL
        FROM INFORMATION_SCHEMA.CHECK_CONSTRAINTS
        WHERE TABLE_NAME = 'spare_parts'
      `);
      
      if (fkResult.recordset.length === 0) {
        console.log('  ✓ No FK or CHECK constraints found');
      } else {
        console.log(`  Found ${fkResult.recordset.length} constraints`);
        fkResult.recordset.forEach(c => {
          console.log(`    - ${c.CONSTRAINT_NAME} (${c.TYPE})`);
        });
      }
    } catch (err) {
      console.log('  ℹ Could not query constraints:', err.message.substring(0, 50));
    }

    // Check column constraints
    console.log('\n📋 Column constraints on spare_parts:');
    const colResult = await pool.query(`
      SELECT 
        COLUMN_NAME,
        IS_NULLABLE,
        DATA_TYPE,
        CHARACTER_MAXIMUM_LENGTH,
        NUMERIC_PRECISION,
        NUMERIC_SCALE,
        COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'spare_parts'
      ORDER BY ORDINAL_POSITION
    `);

    colResult.recordset.forEach(col => {
      let typeInfo = col.DATA_TYPE;
      if (col.CHARACTER_MAXIMUM_LENGTH) {
        typeInfo += `(${col.CHARACTER_MAXIMUM_LENGTH})`;
      } else if (col.NUMERIC_PRECISION) {
        typeInfo += `(${col.NUMERIC_PRECISION},${col.NUMERIC_SCALE})`;
      }
      const nullable = col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL';
      const defaultVal = col.COLUMN_DEFAULT ? ` DEFAULT ${col.COLUMN_DEFAULT}` : '';
      console.log(`  ${col.COLUMN_NAME.padEnd(25)} ${typeInfo.padEnd(15)} ${nullable}${defaultVal}`);
    });

    // Test inserting a sample row
    console.log('\n🧪 Testing sample insert:');
    try {
      const testResult = await pool.query(`
        INSERT INTO [spare_parts] ([BRAND], [PART], [DESCRIPTION], [SERVICE_LEVEL], [STATUS], [MAX_USED_QTY])
        VALUES ('TEST_BRAND', 'TEST_PART', 'Test Description', 'TEST', 'Active', 1)
      `);
      console.log('  ✓ Sample insert successful');
      
      // Count total rows now
      const countResult = await pool.query('SELECT COUNT(*) as TOTAL FROM [spare_parts]');
      console.log(`  Total rows in spare_parts: ${countResult.recordset[0].TOTAL}`);
      
      // Delete the test row
      await pool.query(`DELETE FROM [spare_parts] WHERE BRAND = 'TEST_BRAND'`);
      console.log('  ✓ Test row deleted');
    } catch (insertErr) {
      console.error(`  ✗ Insert failed: ${insertErr.message}`);
    }

    await pool.close();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
