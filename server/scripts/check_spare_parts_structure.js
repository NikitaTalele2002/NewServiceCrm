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

    // Check both possible table names
    const tables = ['spare_parts', 'SpareParts', 'SparePart'];
    
    for (const tableName of tables) {
      try {
        const result = await pool.query(`
          SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_NAME = '${tableName}' 
          ORDER BY ORDINAL_POSITION
        `);
        
        if (result.recordset.length > 0) {
          console.log(`✓ Found table: ${tableName}`);
          console.log(`  Columns (${result.recordset.length}):`);
          result.recordset.forEach(col => {
            console.log(`    - ${col.COLUMN_NAME.padEnd(25)} ${col.DATA_TYPE.padEnd(20)} NULL=${col.IS_NULLABLE}`);
          });
          
          // Show first 3 rows
          console.log(`\n  Sample data (first 3 rows):`);
          const sampleResult = await pool.query(`SELECT TOP 3 * FROM [${tableName}]`);
          if (sampleResult.recordset.length > 0) {
            console.log(`    Columns in result: ${Object.keys(sampleResult.recordset[0]).join(', ')}`);
            sampleResult.recordset.forEach((row, idx) => {
              console.log(`    Row ${idx + 1}:`);
              Object.entries(row).forEach(([key, value]) => {
                console.log(`      ${key}: ${value}`);
              });
            });
          }
          console.log('');
        }
      } catch (err) {
        // Table doesn't exist
      }
    }

    await pool.close();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
