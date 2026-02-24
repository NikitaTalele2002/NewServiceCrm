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

    console.log('\n📋 Checking Request 26 Items:\n');
    
    const result = await pool.request().query(`
      SELECT 
        sri.spare_request_item_id,
        sri.spare_id,
        sri.requested_qty,
        sri.approved_qty,
        sp.PART,
        sp.BRAND
      FROM spare_request_items sri
      LEFT JOIN spare_parts sp ON sri.spare_id = sp.id
      WHERE sri.spare_request_id = 26
    `);

    if (result.recordset.length === 0) {
      console.log('No items found in request 26');
    } else {
      console.log('Items in Request 26:');
      result.recordset.forEach(item => {
        console.log(`  Spare ${item.spare_id}: ${item.PART || 'Unknown'} - ${item.requested_qty} requested, ${item.approved_qty} approved`);
      });
    }

    await pool.close();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkRequestItems();
