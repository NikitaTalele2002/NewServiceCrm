import sql from 'mssql';

async function checkRequests() {
  try {
    const config = {
      server: 'localhost',
      user: 'crm_user',
      password: 'StrongPassword123!',
      database: 'ServiceCrm',
      options: {
        instanceName: 'SQLEXPRESS',
        encrypt: false,
        trustServerCertificate: true,
        enableKeepAlive: true,
      }
    };

    const pool = new sql.ConnectionPool(config);
    await pool.connect();

    console.log('\n📋 Spare Requests Table Info:\n');
    
    // Get table structure
    const structResult = await pool.request().query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'spare_requests'
      ORDER BY ORDINAL_POSITION
    `);

    console.log('Columns in spare_requests:');
    structResult.recordset.forEach(col => {
      console.log(`  - ${col.COLUMN_NAME}`);
    });

    // Get first few records
    const dataResult = await pool.request().query(`
      SELECT TOP 10 * FROM spare_requests ORDER BY request_id DESC
    `);

    console.log('\n\n Latest Requests:');
    dataResult.recordset.forEach(req => {
      console.log(`\nRequest ID: ${req.request_id}`);
      if (req.requested_source_id) console.log(`  ASC: ${req.requested_source_id}`);
      if (req.requested_to_id) console.log(`  Plant: ${req.requested_to_id}`);
    });

    if (dataResult.recordset.length > 0) {
      const latest = dataResult.recordset[0];
      console.log(`\n✅ Use Request ID ${latest.request_id} for testing`);
    }

    await pool.close();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkRequests();
