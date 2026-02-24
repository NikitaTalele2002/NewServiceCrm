import sql from 'mssql';

async function checkDocs() {
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

    console.log('\n📋 Checking Logistics Documents:\n');
    
    // Get first few records
    const dataResult = await pool.request().query(`
      SELECT TOP 20 
        id, document_type, document_number, reference_id, reference_type, status, created_at
      FROM logistics_documents 
      ORDER BY id DESC
    `);

    console.log('Latest Logistics Documents:');
    dataResult.recordset.forEach(doc => {
      console.log(`\nID: ${doc.id} | Type: ${doc.document_type} | Number: ${doc.document_number}`);
      console.log(`  Reference: ${doc.reference_type} #${doc.reference_id}`);
      console.log(`  Status: ${doc.status}`);
    });

    // Check for docs related to request 26
    console.log('\n\n--- Docs for Request 26 ---');
    const req26Result = await pool.request().query(`
      SELECT * FROM logistics_documents 
      WHERE reference_id = 26 AND reference_type = 'SPARE_REQUEST'
    `);
    
    if (req26Result.recordset.length === 0) {
      console.log('No logistics documents found for Request 26');
      console.log('\n💡 You need to create a DN (Delivery Note) for Request 26 first');
      console.log('Steps:');
      console.log('1. RSM approves the spare request');
      console.log('2. System generates DN/CHALLAN documents');
      console.log('3. Then ASC receives the delivery using DN document number');
    } else {
      console.log('\nDocuments found for Request 26:');
      req26Result.recordset.forEach(doc => {
        console.log(`\n  Document Type: ${doc.document_type}`);
        console.log(`  Document Number: ${doc.document_number}`);
        console.log(`  Status: ${doc.status}`);
      });
    }

    await pool.close();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkDocs();
