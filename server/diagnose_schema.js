import { sequelize } from './db.js';

async function diagnoseSchema() {
  try {
    console.log('🔍 DETAILED SCHEMA DIAGNOSIS\n');

    // 1. Check status table
    console.log('1️⃣ STATUS TABLE:');
    const statuses = await sequelize.query('SELECT * FROM [status]', { type: sequelize.QueryTypes.SELECT });
    console.log('Rows:', statuses.length);
    if (statuses.length > 0) {
      console.log('Sample:', statuses.slice(0, 3));
    } else {
      console.log('❌ NO DATA IN STATUS TABLE');
    }

    // 2. Check spare_request_items columns
    console.log('\n2️⃣ SPARE_REQUEST_ITEMS COLUMNS:');
    const itemCols = await sequelize.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'spare_request_items'
      ORDER BY ORDINAL_POSITION
    `, { type: sequelize.QueryTypes.SELECT });
    itemCols.forEach(col => {
      console.log(`  ${col.COLUMN_NAME}: ${col.DATA_TYPE} (nullable: ${col.IS_NULLABLE})`);
    });

    // 3. Check spare_requests columns
    console.log('\n3️⃣ SPARE_REQUESTS COLUMNS:');
    const srCols = await sequelize.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'spare_requests'
      ORDER BY ORDINAL_POSITION
    `, { type: sequelize.QueryTypes.SELECT });
    srCols.forEach(col => {
      console.log(`  ${col.COLUMN_NAME}: ${col.DATA_TYPE} (nullable: ${col.IS_NULLABLE})`);
    });

    // 4. Check all tables in database
    console.log('\n4️⃣ ALL TABLES IN DATABASE:');
    const tables = await sequelize.query(`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `, { type: sequelize.QueryTypes.SELECT });
    tables.forEach(t => console.log(`  - ${t.TABLE_NAME}`));

    // 5. Check approvals table details
    console.log('\n5️⃣ APPROVALS TABLE DETAILS:');
    const approvalsCheck = await sequelize.query(`
      SELECT COUNT(*) as record_count FROM approvals
    `, { type: sequelize.QueryTypes.SELECT });
    console.log(`  Records: ${approvalsCheck[0].record_count}`);

    // 6. Test query to understand how to update spare_requests
    console.log('\n6️⃣ SAMPLE SPARE_REQUEST:');
    const sampleReq = await sequelize.query(`
      SELECT TOP 1 * FROM spare_requests ORDER BY request_id DESC
    `, { type: sequelize.QueryTypes.SELECT });
    if (sampleReq.length > 0) {
      console.log('  Request ID:', sampleReq[0].request_id);
      console.log('  Status ID:', sampleReq[0].status_id);
      console.log('  Created At:', sampleReq[0].created_at);
      
      // Check what status_id values exist
      console.log('\n7️⃣ AVAILABLE STATUS IDs IN spare_requests:');
      const statIDs = await sequelize.query(`
        SELECT DISTINCT status_id FROM spare_requests ORDER BY status_id
      `, { type: sequelize.QueryTypes.SELECT });
      statIDs.forEach(s => console.log(`  - Status ID: ${s.status_id}`));
    }

  } catch (error) {
    console.error('❌ ERROR:', error.message);
    console.error(error);
  } finally {
    process.exit(0);
  }
}

diagnoseSchema();
