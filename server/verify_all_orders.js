import mssql from 'mssql';

const config = {
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_NAME || 'NewCRM',
  authentication: {
    type: 'default',
    options: {
      userName: process.env.DB_USER || 'crm_user',
      password: process.env.DB_PASSWORD || 'StrongPassword123!'
    }
  },
  options: {
    trustServerCertificate: true,
    enableKeepAlive: true,
    encrypt: false,
    instanceName: 'SQLEXPRESS'
  }
};

async function verifyAllOrderRequests() {
  const pool = new mssql.ConnectionPool(config);
  
  try {
    await pool.connect();
    console.log('✅ Connected to database\n');

    // Query all new order requests (after the fix)
    const query = `
      SELECT 
        request_id,
        request_type,
        spare_request_type,
        requested_source_type,
        request_reason,
        created_at
      FROM spare_requests
      WHERE request_id >= 8
      ORDER BY request_id DESC
    `;

    const result = await pool.request().query(query);
    
    console.log('📊 Recent Order Requests (After Fix):\n');
    console.log('ID | Legacy Type        | New Type | Reason | Source');
    console.log('─'.repeat(70));
    
    if (result.recordset.length > 0) {
      let allPopulated = true;
      result.recordset.forEach((record) => {
        const legacyFilled = record.request_type ? '✅' : '❌';
        const newFilled = record.spare_request_type ? '✅' : '❌';
        
        if (!record.request_type || !record.spare_request_type) {
          allPopulated = false;
        }
        
        console.log(
          `${record.request_id.toString().padEnd(2)} | ${legacyFilled} ${(record.request_type || 'NULL').padEnd(16)} | ${newFilled} ${(record.spare_request_type || 'NULL').padEnd(6)} | ${record.request_reason.padEnd(6)} | ${record.requested_source_type}`
        );
      });
      
      console.log('\n' + '─'.repeat(70));
      if (allPopulated) {
        console.log('✅ ALL RECORDS: Both request_type and spare_request_type are populated!');
      } else {
        console.log('❌ SOME RECORDS: Missing data in one or both fields');
      }
    } else {
      console.log('No recent orders found');
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.close();
    process.exit(0);
  }
}

verifyAllOrderRequests();
