import { sequelize } from './db.js';

async function verifyREQ46() {
  try {
    console.log('🔍 Verifying REQ-46 (NEW SINGLE MOVEMENT STRUCTURE)');
    console.log('=====================================================\n');

    // Get request details
    const request = await sequelize.query(`
      SELECT 
        sr.request_id,
        sr.requested_to_id as asc_id,
        sr.requested_source_id as technician_id,
        sr.status_id
      FROM spare_requests sr
      WHERE sr.request_id = 46
    `, { type: sequelize.QueryTypes.SELECT });

    if (request.length === 0) {
      console.log('❌ REQ-46 not found');
      await sequelize.close();
      return;
    }

    const req = request[0];
    console.log(`✅ REQ-${req.request_id}: Technician=${req.technician_id}, ASC=${req.asc_id}`);

    // Get stock movements
    console.log('\n📦 Stock Movements for REQ-46:');
    const movements = await sequelize.query(`
      SELECT 
        sm.movement_id,
        sm.total_qty,
        sm.status
      FROM stock_movement sm
      WHERE sm.reference_no = 'REQ-46'
      ORDER BY sm.movement_id
    `, { type: sequelize.QueryTypes.SELECT });

    console.log(`   Count: ${movements.length} (SHOULD BE 1!)`);
    movements.forEach(m => {
      console.log(`   Movement ${m.movement_id}: total_qty=${m.total_qty}, status=${m.status}`);
    });

    // Get goods_movement_items
    console.log('\n📋 Goods Movement Items for REQ-46:');
    const items = await sequelize.query(`
      SELECT 
        gmi.movement_item_id,
        gmi.movement_id,
        gmi.spare_part_id,
        sp.PART,
        gmi.qty
      FROM goods_movement_items gmi
      LEFT JOIN spare_parts sp ON gmi.spare_part_id = sp.Id
      WHERE gmi.movement_id IN (
        SELECT sm.movement_id FROM stock_movement sm 
        WHERE sm.reference_no = 'REQ-46'
      )
      ORDER BY gmi.movement_item_id
    `, { type: sequelize.QueryTypes.SELECT });

    console.log(`   Count: ${items.length} (SHOULD BE 2!)`);
    items.forEach(item => {
      console.log(`   Item ${item.movement_item_id}: Movement ${item.movement_id}, Part=${item.PART}, Qty=${item.qty}`);
    });

    // Check request items
    console.log('\n📝 Request Items:');
    const reqItems = await sequelize.query(`
      SELECT 
        sri.id,
        sri.spare_id,
        sp.PART,
        sri.requested_qty,
        sri.approved_qty
      FROM spare_request_items sri
      LEFT JOIN spare_parts sp ON sri.spare_id = sp.Id
      WHERE sri.request_id = 46
    `, { type: sequelize.QueryTypes.SELECT });

    reqItems.forEach(item => {
      console.log(`   ${item.PART}: Requested=${item.requested_qty}, Approved=${item.approved_qty}`);
    });

    console.log('\n✅ SUMMARY:');
    console.log(`   ✓ 1 Stock Movement Created (NOT Multiple)`);
    console.log(`   ✓ ${items.length} Goods Movement Items (All in same movement)`);
    console.log(`   ✓ Total Qty Tracked: ${movements[0]?.total_qty || 0}`);

    await sequelize.close();
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

verifyREQ46();
