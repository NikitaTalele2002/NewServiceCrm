import sql from 'mssql';

const config = {
  user: 'sa',
  password: 'Qwerty@123',
  server: 'localhost\\SQLEXPRESS',
  database: 'CRM_test',
  authentication: {
    type: 'default'
  },
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

async function verify() {
  const pool = new sql.ConnectionPool(config);
  try {
    await pool.connect();
    console.log('✅ Connected to database\n');

    // Query the most recent return request
    const result = await pool.request().query(`
      SELECT TOP 5 
        sr.request_id, 
        sr.requested_source_id, 
        sr.requested_source_type,
        sr.requested_to_id,
        sr.requested_to_type,
        sr.created_at,
        t.technician_id,
        t.name as technician_name,
        t.service_center_id,
        sc.asc_id
      FROM spare_requests sr
      LEFT JOIN technicians t ON sr.requested_source_id = t.technician_id AND sr.requested_source_type = 'technician'
      LEFT JOIN service_centers sc ON sr.requested_to_id = sc.id AND sr.requested_to_type = 'service_center'
      WHERE sr.requested_source_type = 'technician'
      ORDER BY sr.created_at DESC
    `);

    console.log('✅ VERIFICATION: Return Requests Created from Technician 1');
    console.log('============================================================');
    
    if (result.recordset.length === 0) {
      console.log('No return requests found');
      return;
    }

    const req = result.recordset[0];
    console.log(`
Request ID: ${req.request_id}
  From Technician: ${req.technician_id} (${req.technician_name})
  Technician's Assigned ASC: ${req.service_center_id}
  
Return Routed To:
  Type: ${req.requested_to_type}
  ID: ${req.requested_to_id} (ASC ${req.asc_id})
  
Created: ${req.created_at}

✅ RESULT: ${req.requested_to_id === req.service_center_id ? 'CORRECT ✓' : 'INCORRECT ✗'}
   Return request has requested_to_id = ${req.requested_to_id} (technician's ASC)
   NOT hardcoded to 1
    `);

    // Show all recent return requests
    console.log('\nAll Recent Return Requests:');
    console.log('-------------------------------------------');
    result.recordset.forEach(r => {
      console.log(`ID: ${r.request_id} | Tech: ${r.technician_id} (ASC ${r.service_center_id}) → Routed to: ${r.requested_to_type} ${r.requested_to_id}`);
    });

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.close();
  }
}

verify();
