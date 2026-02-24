import mssql from 'mssql';

const config = {
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_NAME || 'NewCRM',
  authentication: {
    type: 'default',
    options: {
      userName: process.env.DB_USER || 'sa',
      password: process.env.DB_PASSWORD || 'Ojas@12345'
    }
  },
  options: {
    trustServerCertificate: true,
    enableKeepAlive: true,
    encrypt: false,
    instanceName: 'SQLEXPRESS'
  }
};

async function verifyOrderRequest() {
  const pool = new mssql.ConnectionPool(config);
  
  try {
    await pool.connect();
    console.log('✅ Connected to database');

    // Query the most recent spare request
    const query = `
      SELECT TOP 1
        request_id,
        request_type,
        spare_request_type,
        requested_source_type,
        requested_source_id,
        requested_to_type,
        requested_to_id,
        request_reason,
        created_at
      FROM spare_requests
      ORDER BY request_id DESC
    `;

    const result = await pool.request().query(query);
    
    console.log('\n📊 Most Recent Order Request:');
    console.log('─'.repeat(50));
    
    if (result.recordset.length > 0) {
      const record = result.recordset[0];
      console.log(`Request ID:           ${record.request_id}`);
      console.log(`Request Type (legacy):${record.request_type || '(NULL)'}`);
      console.log(`Request Type (new):   ${record.spare_request_type || '(NULL)'}`);
      console.log(`Source Type:          ${record.requested_source_type}`);
      console.log(`Source ID:            ${record.requested_source_id}`);
      console.log(`Destination Type:     ${record.requested_to_type}`);
      console.log(`Destination ID:       ${record.requested_to_id}`);
      console.log(`Reason:               ${record.request_reason}`);
      console.log(`Created At:           ${record.created_at}`);
      
      console.log('\n' + '─'.repeat(50));
      if (record.spare_request_type) {
        console.log('✅ spare_request_type is properly populated!');
      } else {
        console.log('❌ spare_request_type is still NULL!');
      }
    } else {
      console.log('No order requests found in database');
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await pool.close();
    process.exit(0);
  }
}

verifyOrderRequest();
