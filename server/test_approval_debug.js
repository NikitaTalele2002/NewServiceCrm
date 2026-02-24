import { sequelize } from './db.js';

/**
 * Script to test approving REQ-44 with both spares
 */

async function testApproval() {
  try {
    console.log('🧪 Testing approval for REQ-44 with both spares...\n');

    // Get the request details
    const requestDetails = await sequelize.query(`
      SELECT 
        sr.request_id,
        sri.id as spare_request_item_id,
        sri.spare_id,
        sp.PART,
        sp.DESCRIPTION,
        sri.requested_qty
      FROM spare_requests sr
      LEFT JOIN spare_request_items sri ON sr.request_id = sri.request_id
      LEFT JOIN spare_parts sp ON sri.spare_id = sp.Id
      WHERE sr.request_id = 44
      ORDER BY sri.id
    `, { type: sequelize.QueryTypes.SELECT });

    console.log('📋 Request 44 Items:');
    requestDetails.forEach((item, idx) => {
      console.log(`  [${idx}] Item ID: ${item.spare_request_item_id}, Spare ID: ${item.spare_id}, Part: ${item.PART}, Qty: ${item.requested_qty}`);
    });

    if (requestDetails.length === 0) {
      console.log('❌ REQ-44 not found');
      await sequelize.close();
      process.exit(1);
    }

    // Check current goods_movement_items
    console.log('\n📋 Current goods_movement_items for REQ-44:');
    const currentMovements = await sequelize.query(`
      SELECT 
        gmi.movement_item_id,
        gmi.movement_id,
        gmi.spare_part_id,
        gmi.qty
      FROM goods_movement_items gmi
      WHERE gmi.movement_id IN (
        SELECT sm.movement_id FROM stock_movement sm 
        WHERE sm.reference_no = 'REQ-44'
      )
    `, { type: sequelize.QueryTypes.SELECT });

    console.log(`  Found ${currentMovements.length} entries`);
    currentMovements.forEach(m => {
      console.log(`    Movement ${m.movement_id}: spare_part_id=${m.spare_part_id}, qty=${m.qty}`);
    });

    console.log('\n✅ Test check complete!');

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

testApproval();
