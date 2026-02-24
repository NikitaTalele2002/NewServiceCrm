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

    // Put database in single-user mode to handle any locks
    console.log('Clearing spare_parts table...');
    await pool.query('DELETE FROM [spare_parts]');
    console.log('✓ All rows deleted');

    // Reset identity
    console.log('Resetting identity seed...');
    await pool.query(`DBCC CHECKIDENT ('[spare_parts]', RESEED, 0)`);
    console.log('✓ Identity reset to 0');

    // Check current row count
    const countResult = await pool.query('SELECT COUNT(*) as TOTAL FROM [spare_parts]');
    console.log(`✓ spare_parts now has ${countResult.recordset[0].TOTAL} rows`);

    // Drop any FK constraint on ModelID if it exists
    console.log('\nChecking for FK constraints on ModelID...');
    try {
      const constraints = await pool.query(`
        SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
        WHERE TABLE_NAME = 'spare_parts' AND COLUMN_NAME = 'ModelID'
      `);
      
      for (const constraint of constraints.recordset) {
        console.log(`Dropping constraint: ${constraint.CONSTRAINT_NAME}`);
        await pool.query(`ALTER TABLE [spare_parts] DROP CONSTRAINT [${constraint.CONSTRAINT_NAME}]`);
      }
      
      if (constraints.recordset.length === 0) {
        console.log('✓ No FK constraints on ModelID');
      } else {
        console.log(`✓ Dropped ${constraints.recordset.length} constraint(s)`);
      }
    } catch (err) {
      console.log('ℹ Could not drop constraints:', err.message.substring(0, 60));
    }

    await pool.close();
    console.log('\n✓ Database cleaned and ready for fresh upload!');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
