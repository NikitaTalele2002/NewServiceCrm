import { sequelize } from './db.js';

async function testAllocationFlow() {
  try {
    console.log('🧪 Testing allocation flow...\n');

    // Check if approvals table exists
    console.log('1️⃣ Checking approvals table structure...');
    const tableInfo = await sequelize.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'approvals'
      ORDER BY ORDINAL_POSITION
    `);
    
    console.log('Approvals table columns:');
    tableInfo[0].forEach(col => {
      console.log(`  - ${col.COLUMN_NAME}: ${col.DATA_TYPE} (nullable: ${col.IS_NULLABLE})`);
    });

    // Check if status table has 'approved'
    console.log('\n2️⃣ Checking status table...');
    const statusCheck = await sequelize.query(`
      SELECT status_id, status_name FROM [status] WHERE status_name IN ('approved', 'rejected', 'pending')
    `, { type: sequelize.QueryTypes.SELECT });
    
    console.log('Available statuses:');
    statusCheck.forEach(status => {
      console.log(`  - ID: ${status.status_id}, Name: ${status.status_name}`);
    });

    // Check sample request
    console.log('\n3️⃣ Checking sample spare request...');
    const sampleRequest = await sequelize.query(`
      SELECT TOP 1 
        sr.request_id,
        sr.requested_to_id,
        sr.status_id,
        st.status_name
      FROM spare_requests sr
      LEFT JOIN [status] st ON sr.status_id = st.status_id
      ORDER BY sr.created_at DESC
    `, { type: sequelize.QueryTypes.SELECT });
    
    if (sampleRequest.length > 0) {
      console.log('Sample request:');
      console.log(`  - Request ID: ${sampleRequest[0].request_id}`);
      console.log(`  - Service Center ID: ${sampleRequest[0].requested_to_id}`);
      console.log(`  - Current Status: ${sampleRequest[0].status_name}`);

      // Check items for this request
      console.log('\n4️⃣ Checking request items...');
      const items = await sequelize.query(`
        SELECT 
          sri.id,
          sri.request_id,
          sri.spare_id,
          sri.requested_qty,
          sp.PART,
          sp.DESCRIPTION
        FROM spare_request_items sri
        LEFT JOIN spare_parts sp ON sri.spare_id = sp.Id
        WHERE sri.request_id = ?
      `, { replacements: [sampleRequest[0].request_id], type: sequelize.QueryTypes.SELECT });
      
      console.log(`Found ${items.length} items:`);
      items.forEach(item => {
        console.log(`  - Item ${item.id}: ${item.PART} (Qty: ${item.requested_qty})`);
      });
    } else {
      console.log('No spare requests found');
    }

    // Try a test insert into approvals
    console.log('\n5️⃣ Testing approval record insert...');
    try {
      await sequelize.query(`
        INSERT INTO approvals (spare_request_item_id, approver_id, approval_status, remarks, approved_at)
        VALUES (99999, 1, 'approved', 'Test', GETDATE())
      `);
      console.log('✅ Insert succeeded (test record)');
      
      // Clean up
      await sequelize.query(`DELETE FROM approvals WHERE spare_request_item_id = 99999`);
    } catch (err) {
      console.log('❌ Insert failed:', err.message);
    }

    console.log('\n✅ Test complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    process.exit(0);
  }
}

testAllocationFlow();
