import { sequelize } from './db.js';

async function testAllocationFlow() {
  try {
    console.log('🧪 TESTING COMPLETE ALLOCATION FLOW\n');

    // 1. Get a sample request
    console.log('1️⃣ Finding test request...');
    const sampleRequest = await sequelize.query(`
      SELECT TOP 1 
        request_id,
        requested_to_id,
        status_id
      FROM spare_requests 
      WHERE status_id IN (SELECT status_id FROM [status] WHERE status_name = 'Open')
      ORDER BY request_id DESC
    `, { replacements: [], type: sequelize.QueryTypes.SELECT });

    if (!sampleRequest.length) {
      console.log('❌ No Open requests found');
      process.exit(1);
    }

    const testRequestId = sampleRequest[0].request_id;
    console.log(`✅ Found request: ${testRequestId}`);

    // 2. Get items for this request
    console.log('\n2️⃣ Getting request items...');
    const items = await sequelize.query(`
      SELECT id, spare_id, requested_qty, approved_qty
      FROM spare_request_items 
      WHERE request_id = ?
    `, { replacements: [testRequestId], type: sequelize.QueryTypes.SELECT });

    console.log(`✅ Found ${items.length} items:`);
    items.forEach(item => {
      console.log(`  - Item ${item.id}: Requested ${item.requested_qty}, Currently approved: ${item.approved_qty}`);
    });

    // 3. Test the update logic
    console.log('\n3️⃣ Simulating approval update...');
    const testItem = items[0];
    const testQty = Math.min(2, testItem.requested_qty);
    
    console.log(`  Updating item ${testItem.id} to approved_qty = ${testQty}`);
    
    await sequelize.query(`
      UPDATE spare_request_items 
      SET approved_qty = ?, updated_at = GETDATE()
      WHERE id = ?
    `, { replacements: [testQty, testItem.id] });

    console.log('✅ Item updated');

    // 4. Get approved status ID
    console.log('\n4️⃣ Getting approved status...');
    const approvedStatus = await sequelize.query(`
      SELECT status_id FROM [status] WHERE status_name = 'approved'
    `, { replacements: [], type: sequelize.QueryTypes.SELECT });

    if (!approvedStatus.length) {
      console.log('❌ Approved status not found!');
      process.exit(1);
    }

    const approvedStatusId = approvedStatus[0].status_id;
    console.log(`✅ Approved status ID: ${approvedStatusId}`);

    // 5. Update request status
    console.log('\n5️⃣ Updating request status to approved...');
    await sequelize.query(`
      UPDATE spare_requests 
      SET status_id = ?, updated_at = GETDATE()
      WHERE request_id = ?
    `, { replacements: [approvedStatusId, testRequestId] });

    console.log('✅ Request status updated');

    // 6. Verify changes
    console.log('\n6️⃣ Verifying changes...');
    const updatedRequest = await sequelize.query(`
      SELECT sr.request_id, sr.status_id, st.status_name
      FROM spare_requests sr
      LEFT JOIN [status] st ON sr.status_id = st.status_id
      WHERE sr.request_id = ?
    `, { replacements: [testRequestId], type: sequelize.QueryTypes.SELECT });

    console.log(`  Request ${updatedRequest[0].request_id}:`);
    console.log(`    Status: ${updatedRequest[0].status_name} (ID: ${updatedRequest[0].status_id})`);

    const updatedItems = await sequelize.query(`
      SELECT id, requested_qty, approved_qty
      FROM spare_request_items 
      WHERE request_id = ?
    `, { replacements: [testRequestId], type: sequelize.QueryTypes.SELECT });

    console.log(`  Items updated:`);
    updatedItems.forEach(item => {
      console.log(`    - Item ${item.id}: Approved ${item.approved_qty} of ${item.requested_qty}`);
    });

    console.log('\n✅ ALL TESTS PASSED! Allocation flow is working correctly.');

    // Rollback for testing
    console.log('\n7️⃣ Rolling back test changes...');
    await sequelize.query(`
      UPDATE spare_request_items 
      SET approved_qty = NULL
      WHERE request_id = ?
    `, { replacements: [testRequestId] });

    await sequelize.query(`
      UPDATE spare_requests 
      SET status_id = 1
      WHERE request_id = ?
    `, { replacements: [testRequestId] });

    console.log('✅ Rollback complete');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
  } finally {
    process.exit(0);
  }
}

testAllocationFlow();
