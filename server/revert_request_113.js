import mssql from 'mssql';

const config = {
  server: 'localhost',
  authentication: {
    type: 'default',
    options: {
      userName: 'crm_user',
      password: 'StrongPassword123!'
    }
  },
  options: {
    trustServerCertificate: true,
    encrypt: false,
    database: 'NewCRM',
    instanceName: 'SQLEXPRESS'
  },
  port: 1433
};

const pool = new mssql.ConnectionPool(config);

async function revertRequest() {
  try {
    await pool.connect();
    console.log('✅ Connected to database');

    // Get Pending status ID
    const statusResult = await pool.request()
      .query("SELECT TOP 1 status_id FROM status WHERE status_name = 'Pending'");
    
    if (!statusResult.recordset.length) {
      console.error('❌ Pending status not found');
      process.exit(1);
    }
    
    const pendingStatusId = statusResult.recordset[0].status_id;
    console.log(`📌 Pending status ID: ${pendingStatusId}`);

    // Update request 113 back to Pending
    const updateResult = await pool.request()
      .input('requestId', mssql.Int, 113)
      .input('statusId', mssql.Int, pendingStatusId)
      .query(`
        UPDATE spare_requests 
        SET status_id = @statusId,
            updated_at = GETDATE()
        WHERE request_id = @requestId
      `);
    
    console.log(`\n✅ Request 113 reverted to Pending status`);
    console.log(`   Rows affected: ${updateResult.rowsAffected}`);
    
    // Verify the change
    const verifyResult = await pool.request()
      .input('requestId', mssql.Int, 113)
      .query(`
        SELECT sr.request_id, st.status_name, sr.updated_at
        FROM spare_requests sr
        LEFT JOIN status st ON sr.status_id = st.status_id
        WHERE sr.request_id = @requestId
      `);
    
    if (verifyResult.recordset.length > 0) {
      const req = verifyResult.recordset[0];
      console.log(`\n📋 Current Status:`);
      console.log(`   Request ID: ${req.request_id}`);
      console.log(`   Status: ${req.status_name}`);
      console.log(`   Updated: ${req.updated_at}`);
    }

    await pool.close();
    console.log(`\n✨ Ready to test! Request 113 is now Pending`);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

revertRequest();
