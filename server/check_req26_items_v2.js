import sql from 'mssql';

async function checkRequestItems() {
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

    console.log('\n📋 Checking spare_request_items columns:\n');
    
    const colResult = await pool.request().query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'spare_request_items'
      ORDER BY ORDINAL_POSITION
    `);

    console.log('Columns:');
    colResult.recordset.forEach(col => {
      console.log(`  - ${col.COLUMN_NAME}`);
    });

    console.log('\n📋 Checking Request 26 Items:\n');
    
    const result = await pool.request().query(`
      SELECT TOP 10 * FROM spare_request_items 
      WHERE spare_request_id = 26
    `);

    if (result.recordset.length === 0) {
      console.log('No items found in request 26');
    } else {
      console.log('Items in Request 26:');
      result.recordset.forEach(item => {
        console.log(`  Spare ID: ${item.spare_id}, Requested: ${item.requested_qty}, Approved: ${item.approved_qty}`);
      });
    }

    await pool.close();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkRequestItems();
