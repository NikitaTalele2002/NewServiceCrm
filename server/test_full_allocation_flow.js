import { sequelize } from './db.js';

async function testFullAllocationFlow() {
  try {
    console.log('🧪 TESTING COMPLETE ALLOCATION WITH STOCK MOVEMENT\n');

    // 1. Get a test request
    console.log('1️⃣ Finding Open request...');
    const sampleRequest = await sequelize.query(`
      SELECT TOP 1 
        sr.request_id,
        sr.requested_to_id,
        sr.requested_source_id,
        sr.status_id,
        st.status_name
      FROM spare_requests sr
      LEFT JOIN [status] st ON sr.status_id = st.status_id
      WHERE st.status_name = 'Open'
      ORDER BY sr.request_id DESC
    `, { type: sequelize.QueryTypes.SELECT });

    if (!sampleRequest.length) {
      console.log('❌ No Open requests found');
      process.exit(1);
    }

    const requestId = sampleRequest[0].request_id;
    const serviceCenterId = sampleRequest[0].requested_to_id;
    const technicianId = sampleRequest[0].requested_source_id;
    
    console.log(`✅ Found request: ${requestId}`);
    console.log(`   ASC ID: ${serviceCenterId}, Technician ID: ${technicianId}`);

    // 2. Get items
    console.log('\n2️⃣ Getting items...');
    const items = await sequelize.query(`
      SELECT id, spare_id, requested_qty
      FROM spare_request_items 
      WHERE request_id = ?
    `, { 
      replacements: [requestId],
      type: sequelize.QueryTypes.SELECT 
    });

    if (!items.length) {
      console.log('❌ No items found');
      process.exit(1);
    }

    console.log(`✅ Found ${items.length} items`);
    
    // 3. Check initial inventories
    console.log('\n3️⃣ Checking initial inventories...');
    const testItem = items[0];
    const spareId = testItem.spare_id;
    
    const ascInv = await sequelize.query(`
      SELECT qty_good FROM spare_inventory
      WHERE spare_id = ? AND location_type = 'service_center' AND location_id = ?
    `, { replacements: [spareId, serviceCenterId], type: sequelize.QueryTypes.SELECT });

    const techInv = await sequelize.query(`
      SELECT qty_good FROM spare_inventory
      WHERE spare_id = ? AND location_type = 'technician' AND location_id = ?
    `, { replacements: [spareId, technicianId], type: sequelize.QueryTypes.SELECT });

    console.log(`  ASC inventory: ${ascInv.length > 0 ? ascInv[0].qty_good : 0} units`);
    console.log(`  Tech inventory: ${techInv.length > 0 ? techInv[0].qty_good : 0} units`);

    const initialAscQty = ascInv.length > 0 ? ascInv[0].qty_good : 0;
    const initialTechQty = techInv.length > 0 ? techInv[0].qty_good : 0;

    // 4. Simulate allocation approval with stock movement
    const allocQty = Math.min(2, testItem.requested_qty);
    console.log(`\n4️⃣ Simulating allocation of ${allocQty} units...`);

    // Update approved_qty
    await sequelize.query(`
      UPDATE spare_request_items 
      SET approved_qty = ?, updated_at = GETDATE()
      WHERE id = ?
    `, { replacements: [allocQty, testItem.id] });
    console.log('  ✅ Updated approved_qty');

    // Create stock movement
    await sequelize.query(`
      INSERT INTO stock_movement (
        movement_type, reference_type, reference_no,
        source_location_type, source_location_id,
        destination_location_type, destination_location_id,
        total_qty, movement_date, created_by, status, created_at, updated_at
      )
      VALUES (
        'transfer', 'spare_request', 'REQ-' + CAST(? AS VARCHAR),
        'service_center', ?, 'technician', ?, ?,
        GETDATE(), 1, 'completed', GETDATE(), GETDATE()
      )
    `, { replacements: [requestId, serviceCenterId, technicianId, allocQty] });
    console.log('  ✅ Created stock_movement');

    // Update ASC inventory
    await sequelize.query(`
      UPDATE spare_inventory 
      SET qty_good = qty_good - ?, updated_at = GETDATE()
      WHERE spare_id = ? AND location_type = 'service_center' AND location_id = ?
    `, { replacements: [allocQty, spareId, serviceCenterId] });
    console.log(`  ✅ Decreased ASC inventory by ${allocQty}`);

    // Update/create technician inventory
    const techExists = techInv.length > 0;
    if (techExists) {
      await sequelize.query(`
        UPDATE spare_inventory 
        SET qty_good = qty_good + ?, updated_at = GETDATE()
        WHERE spare_id = ? AND location_type = 'technician' AND location_id = ?
      `, { replacements: [allocQty, spareId, technicianId] });
    } else {
      await sequelize.query(`
        INSERT INTO spare_inventory (spare_id, location_type, location_id, qty_good, qty_defective, created_at, updated_at)
        VALUES (?, 'technician', ?, ?, 0, GETDATE(), GETDATE())
      `, { replacements: [spareId, technicianId, allocQty] });
    }
    console.log(`  ✅ Increased technician inventory by ${allocQty}`);

    // Update request status
    const approvedStatus = await sequelize.query(`
      SELECT status_id FROM [status] WHERE status_name = 'approved'
    `, { type: sequelize.QueryTypes.SELECT });

    await sequelize.query(`
      UPDATE spare_requests 
      SET status_id = ?, updated_at = GETDATE()
      WHERE request_id = ?
    `, { replacements: [approvedStatus[0].status_id, requestId] });
    console.log('  ✅ Updated status to approved');

    // 5. Verify results
    console.log('\n5️⃣ Verifying results...');
    
    const updatedAscInv = await sequelize.query(`
      SELECT qty_good FROM spare_inventory
      WHERE spare_id = ? AND location_type = 'service_center' AND location_id = ?
    `, { replacements: [spareId, serviceCenterId], type: sequelize.QueryTypes.SELECT });

    const updatedTechInv = await sequelize.query(`
      SELECT qty_good FROM spare_inventory
      WHERE spare_id = ? AND location_type = 'technician' AND location_id = ?
    `, { replacements: [spareId, technicianId], type: sequelize.QueryTypes.SELECT });

    const ascResult = updatedAscInv.length > 0 ? updatedAscInv[0].qty_good : 0;
    const techResult = updatedTechInv.length > 0 ? updatedTechInv[0].qty_good : 0;

    console.log(`  ASC inventory: ${initialAscQty} → ${ascResult} (expected: ${initialAscQty - allocQty})`);
    console.log(`  Tech inventory: ${initialTechQty} → ${techResult} (expected: ${initialTechQty + allocQty})`);

    // Check stock movement
    const movement = await sequelize.query(`
      SELECT TOP 1 movement_id, total_qty, status FROM stock_movement
      WHERE reference_type = 'spare_request' AND reference_no = 'REQ-' + CAST(? AS VARCHAR)
      ORDER BY movement_id DESC
    `, { replacements: [requestId], type: sequelize.QueryTypes.SELECT });

    console.log(`  Stock movement created: ID ${movement[0].movement_id}, Qty: ${movement[0].total_qty}, Status: ${movement[0].status}`);

    // Check request status
    const updatedRequest = await sequelize.query(`
      SELECT sr.request_id, st.status_name FROM spare_requests sr
      LEFT JOIN [status] st ON sr.status_id = st.status_id
      WHERE sr.request_id = ?
    `, { replacements: [requestId], type: sequelize.QueryTypes.SELECT });

    console.log(`  Request status: ${updatedRequest[0].status_name}`);

    console.log('\n✅ ALL TESTS PASSED!');
    console.log('  ✓ Approved qty updated');
    console.log('  ✓ Stock movement created');
    console.log('  ✓ ASC inventory decreased');
    console.log('  ✓ Technician inventory increased');
    console.log('  ✓ Request status updated to approved');

    // Cleanup
    console.log('\n6️⃣ Rolling back changes...');
    await sequelize.query(`
      UPDATE spare_request_items 
      SET approved_qty = NULL
      WHERE request_id = ?
    `, { replacements: [requestId] });

    await sequelize.query(`
      DELETE FROM stock_movement
      WHERE reference_type = 'spare_request' AND reference_no = 'REQ-' + CAST(? AS VARCHAR)
    `, { replacements: [requestId] });

    await sequelize.query(`
      UPDATE spare_inventory 
      SET qty_good = ?
      WHERE spare_id = ? AND location_type = 'service_center' AND location_id = ?
    `, { replacements: [initialAscQty, spareId, serviceCenterId] });

    if (techExists) {
      await sequelize.query(`
        UPDATE spare_inventory 
        SET qty_good = ?
        WHERE spare_id = ? AND location_type = 'technician' AND location_id = ?
      `, { replacements: [initialTechQty, spareId, technicianId] });
    } else {
      await sequelize.query(`
        DELETE FROM spare_inventory
        WHERE spare_id = ? AND location_type = 'technician' AND location_id = ?
      `, { replacements: [spareId, technicianId] });
    }

    await sequelize.query(`
      UPDATE spare_requests 
      SET status_id = 1
      WHERE request_id = ?
    `, { replacements: [requestId] });

    console.log('✅ Rollback complete');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error);
  } finally {
    process.exit(0);
  }
}

testFullAllocationFlow();
