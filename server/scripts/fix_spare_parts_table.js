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

    // Add DESCRIPTION column to spare_parts if it doesn't exist
    console.log('Adding DESCRIPTION column to spare_parts...');
    try {
      await pool.query(`ALTER TABLE [spare_parts] ADD [DESCRIPTION] VARCHAR(255) NULL`);
      console.log('✓ Added DESCRIPTION column to spare_parts');
    } catch (err) {
      if (err.message.includes('already exists')) {
        console.log('✓ DESCRIPTION column already exists in spare_parts');
      } else {
        console.error('Error:', err.message);
      }
    }

    // Verify spare_parts table structure
    console.log('\n📋 spare_parts table columns:');
    const result = await pool.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'spare_parts' 
      ORDER BY ORDINAL_POSITION
    `);
    
    result.recordset.forEach(col => {
      console.log(`  - ${col.COLUMN_NAME.padEnd(25)} ${col.DATA_TYPE.padEnd(20)} NULL=${col.IS_NULLABLE}`);
    });

    // Clear the SpareParts table (wrong data)
    console.log('\n🗑️  Clearing SpareParts table (has incorrect data)...');
    const deleteResult = await pool.query(`DELETE FROM [SpareParts]; SELECT @@ROWCOUNT AS AFFECTED;`);
    const affected = deleteResult.recordset[0].AFFECTED;
    console.log(`✓ Deleted ${affected} rows from SpareParts`);

    // Reset identity seed
    console.log('Resetting identity seed for spare_parts...');
    await pool.query(`DBCC CHECKIDENT ('[spare_parts]', RESEED, 0)`);
    console.log('✓ Identity seed reset');

    await pool.close();
    console.log('\n✓ Database fixes complete! Ready for re-upload.');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
