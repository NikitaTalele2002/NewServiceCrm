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

    console.log('\n📋 Latest Spare Requests:\n');
    
    const result = await pool.request().query(`
      SELECT TOP 10 
        sr.id,
        sr.requested_source_id AS asc_id,
        sr.requested_to_id AS plant_id,
        sr.status_id,
        COUNT(sri.id) AS item_count
      FROM spare_requests sr
      LEFT JOIN spare_request_items sri ON sr.id = sri.spare_request_id
      GROUP BY sr.id, sr.requested_source_id, sr.requested_to_id, sr.status_id
      ORDER BY sr.id DESC
    `);

    result.recordset.forEach(req => {
      console.log(`Request ID: ${req.id} | ASC: ${req.asc_id} | Plant: ${req.plant_id} | Items: ${req.item_count}`);
    });

    if (result.recordset.length > 0) {
      const latest = result.recordset[0];
      console.log(`\n✅ Use Request ID ${latest.id} for testing (ASC ${latest.asc_id} requesting from Plant ${latest.plant_id})`);
    }

    await pool.close();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkRequests();
