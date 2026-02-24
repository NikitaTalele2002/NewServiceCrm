import sql from 'mssql';

async function checkRequestStatus() {
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

    console.log('\n📋 Checking Request Status:\n');
    
    // Check status of request 26
    const statusResult = await pool.request().query(`
      SELECT 
        sr.request_id,
        sr.status_id,
        s.status_name,
        sr.requested_source_id,
        sr.requested_to_id
      FROM spare_requests sr
      LEFT JOIN status s ON sr.status_id = s.status_id
      WHERE sr.request_id = 26
    `);

    if (statusResult.recordset.length === 0) {
      console.log('Request 26 not found');
      process.exit(1);
    }

    const req = statusResult.recordset[0];
    console.log(`Request ID: ${req.request_id}`);
    console.log(`ASC: ${req.requested_source_id}`);
    console.log(`Plant: ${req.requested_to_id}`);
    console.log(`Status ID: ${req.status_id}`);
    console.log(`Status Name: ${req.status_name}`);

    if (req.status_name === 'approved_by_rsm') {
      console.log('\n✅ Request is approved! Can call sync-sap to generate documents');
    } else {
      console.log(`\n❌ Request status is "${req.status_name}", not "approved_by_rsm"`);
      console.log('Need to approve request first');

      // Check what approved status ID is
      const approvedResult = await pool.request().query(`
        SELECT status_id, status_name FROM status 
        WHERE status_name LIKE '%approved%'
      `);

      console.log('\nAvailable approval statuses:');
      approvedResult.recordset.forEach(s => {
        console.log(`  - Status ${s.status_id}: ${s.status_name}`);
      });

      // Try to update to approved status
      const rsm = approvedResult.recordset.find(s => s.status_name === 'approved_by_rsm');
      if (rsm) {
        console.log(`\n💡 To approve request 26, update status_id to ${rsm.status_id}`);
      }
    }

    await pool.close();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkRequestStatus();
