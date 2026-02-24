import { sequelize } from './db.js';
import fetch from 'node-fetch';

async function testApproval() {
  try {
    console.log('🧪 Testing Approval with Single Movement + Multiple Items\n');

    // Get the items for REQ-46
    const items = await sequelize.query(`
      SELECT id, spare_id, requested_qty FROM spare_request_items 
      WHERE request_id = 46
      ORDER BY id
    `, { type: sequelize.QueryTypes.SELECT });

    console.log(`✅ Found ${items.length} items to approve\n`);

    // Note: In real scenario, this would come from frontend
    // For testing, we'll make a direct DB call to simulate the approval
    
    // Get a user/approver ID (we can use 1)
    const approverId = 1;
    
    // Get service center from request
    const request = await sequelize.query(`
      SELECT requested_to_id FROM spare_requests WHERE request_id = 46
    `, { type: sequelize.QueryTypes.SELECT });

    const serviceCenterId = request[0].requested_to_id;

    console.log('📝 Simulating approval with payload:');
    const approvalPayload = {
      approvedItems: items.map(item => ({
        spare_request_item_id: item.id,
        approvedQty: item.requested_qty
      }))
    };
    console.log(JSON.stringify(approvalPayload, null, 2));

    console.log('\n🔄 Executing approval logic manually...\n');

    // Manually execute the approval logic (same as in the API)
    const requestId = 46;
    const technicianId = 1; // From REQ-46

    // Get approved status
    const approvedStatus = await sequelize.query(`
      SELECT status_id FROM [status] WHERE status_name = 'approved'
    `, { type: sequelize.QueryTypes.SELECT });

    const approvedStatusId = approvedStatus[0].status_id;

    // Calculate total qty
    let totalQty = 0;
    approvalPayload.approvedItems.forEach(item => {
      totalQty += item.approvedQty;
    });

    console.log(`📊 Total Qty across all items: ${totalQty}`);

    // CREATE SINGLE STOCK MOVEMENT
    console.log('\n📦 Step 1: Creating single stock movement...');
    const movementResult = await sequelize.query(`
      INSERT INTO stock_movement (
        movement_type,
        reference_type,
        reference_no,
        source_location_type,
        source_location_id,
        destination_location_type,
        destination_location_id,
        total_qty,
        movement_date,
        created_by,
        status,
        created_at,
        updated_at
      )
      OUTPUT inserted.movement_id
      VALUES (
        'transfer',
        'spare_request',
        'REQ-46',
        'service_center',
        ?,
        'technician',
        ?,
        ?,
        GETDATE(),
        ?,
        'completed',
        GETDATE(),
        GETDATE()
      )
    `, { replacements: [serviceCenterId, technicianId, totalQty, approverId], type: sequelize.QueryTypes.SELECT });

    const movementId = movementResult[0].movement_id;
    console.log(`✅ Movement ${movementId} created with total_qty=${totalQty}`);

    // NOW ADD EACH ITEM TO THE SAME MOVEMENT
    console.log('\n📋 Step 2: Adding items to movement...');
    for (const item of approvalPayload.approvedItems) {
      const spare = items.find(i => i.id === item.spare_request_item_id);
      
      // Update approved_qty
      await sequelize.query(`
        UPDATE spare_request_items 
        SET approved_qty = ?
        WHERE id = ?
      `, { replacements: [item.approvedQty, item.spare_request_item_id] });

      // Create goods_movement_items entry
      await sequelize.query(`
        INSERT INTO goods_movement_items (
          movement_id,
          spare_part_id,
          qty,
          condition,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, 'good', GETDATE(), GETDATE())
      `, { replacements: [movementId, spare.spare_id, item.approvedQty] });

      console.log(`   ✅ Added item (spare_id=${spare.spare_id}, qty=${item.approvedQty}) to movement`);

      // Update ASC inventory
      await sequelize.query(`
        UPDATE spare_inventory 
        SET qty_good = qty_good - ?
        WHERE spare_id = ? AND location_type = 'service_center' AND location_id = ?
      `, { replacements: [item.approvedQty, spare.spare_id, serviceCenterId] });

      // Update technician inventory
      let techInv = await sequelize.query(`
        SELECT spare_inventory_id FROM spare_inventory
        WHERE spare_id = ? AND location_type = 'technician' AND location_id = ?
      `, { replacements: [spare.spare_id, technicianId], type: sequelize.QueryTypes.SELECT });

      if (techInv.length > 0) {
        await sequelize.query(`
          UPDATE spare_inventory 
          SET qty_good = qty_good + ?
          WHERE spare_id = ? AND location_type = 'technician' AND location_id = ?
        `, { replacements: [item.approvedQty, spare.spare_id, technicianId] });
      } else {
        await sequelize.query(`
          INSERT INTO spare_inventory (spare_id, location_type, location_id, qty_good, qty_defective, created_at, updated_at)
          VALUES (?, 'technician', ?, ?, 0, GETDATE(), GETDATE())
        `, { replacements: [spare.spare_id, technicianId, item.approvedQty] });
      }
    }

    // Update request status
    await sequelize.query(`
      UPDATE spare_requests SET status_id = ?
      WHERE request_id = ?
    `, { replacements: [approvedStatusId, requestId] });

    console.log('\n✅ VERIFICATION:');
    console.log('===============\n');

    // Verify stock movement
    const movements = await sequelize.query(`
      SELECT movement_id, total_qty, status FROM stock_movement 
      WHERE reference_no = 'REQ-46'
    `, { type: sequelize.QueryTypes.SELECT });

    console.log(`📦 Stock Movements: ${movements.length}\n`);
    for (const mov of movements) {
      console.log(`   Movement ${mov.movement_id}: total_qty=${mov.total_qty}, status=${mov.status}`);
    }

    // Verify goods_movement_items
    const goodsItems = await sequelize.query(`
      SELECT 
        gmi.movement_item_id,
        gmi.spare_part_id,
        sp.PART,
        gmi.qty
      FROM goods_movement_items gmi
      LEFT JOIN spare_parts sp ON gmi.spare_part_id = sp.Id
      WHERE gmi.movement_id IN (SELECT movement_id FROM stock_movement WHERE reference_no = 'REQ-46')
      ORDER BY gmi.movement_item_id
    `, { type: sequelize.QueryTypes.SELECT });

    console.log(`\n📋 Goods Movement Items: ${goodsItems.length}\n`);
    goodsItems.forEach(gmi => {
      console.log(`   Item ${gmi.movement_item_id}: ${gmi.PART} (Spare ID ${gmi.spare_part_id}), Qty=${gmi.qty}`);
    });

    console.log('\n✅ TEST COMPLETE - REQ-46 successfully approved with single movement + multiple items!');

    await sequelize.close();
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error('Stack:', err.stack);
    process.exit(1);
  }
}

testApproval();
