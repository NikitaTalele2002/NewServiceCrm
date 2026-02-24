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

    // Find tables that have VALUE column
    console.log('🔍 Searching for tables with VALUE column...\n');
    const result = await pool.query(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE COLUMN_NAME = 'VALUE'
      GROUP BY TABLE_NAME
    `);

    for (const row of result.recordset) {
      const tableName = row.TABLE_NAME;
      console.log(`\n📋 Table: ${tableName}`);
      
      const colResult = await pool.query(`
        SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMNPROPERTY(OBJECT_ID('${tableName}'), COLUMN_NAME, 'IsIdentity') as IsIdentity
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = '${tableName}'
        ORDER BY ORDINAL_POSITION
      `);

      colResult.recordset.forEach(col => {
        const isId = col.IsIdentity === 1 ? ' [IDENTITY]' : '';
        console.log(`  ${col.COLUMN_NAME.padEnd(20)} ${col.DATA_TYPE.padEnd(15)} ${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'}${isId}`);
      });

      // Check row count
      const countResult = await pool.query(`SELECT COUNT(*) as TotalRows FROM ${tableName}`);
      console.log(`  Row count: ${countResult.recordset[0].TotalRows}`);
    }

    await pool.close();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
