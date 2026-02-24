import { sequelize } from './db.js';

async function verifyTechnicianInventoryUpdate() {
  try {
    console.log('🔍 Verifying Technician Inventory Update Process:');
    console.log('================================================\n');

    // Check REQ-44
    console.log('📋 Request REQ-44 Details:');
    const request = await sequelize.query(`
      SELECT 
        sr.request_id,
        sr.requested_to_id as asc_id,
        sr.requested_source_id as technician_id,
        sr.status_id
      FROM spare_requests sr
      WHERE sr.request_id = 44
    `, { type: sequelize.QueryTypes.SELECT });

    if (request.length === 0) {
      console.log('❌ REQ-44 not found');
      return;
    }

    const req = request[0];
    console.log(`✅ Request ID: REQ-${req.request_id}`);
    console.log(`   Technician ID: ${req.technician_id}`);
    console.log(`   ASC ID: ${req.asc_id}`);

    // Check stock movements
    console.log('\n📦 Stock Movements for REQ-44:');
    const movements = await sequelize.query(`
      SELECT 
        sm.movement_id,
        sm.reference_no,
        sm.source_location_type,
        sm.source_location_id,
        sm.destination_location_type,
        sm.destination_location_id,
        sm.total_qty
      FROM stock_movement sm
      WHERE sm.reference_no = 'REQ-44'
      ORDER BY sm.movement_id
    `, { type: sequelize.QueryTypes.SELECT });

    console.log(`Found ${movements.length} movements`);
    movements.forEach(m => {
      console.log(`  Movement ${m.movement_id}:
    From: ${m.source_location_type} (ID: ${m.source_location_id})
    To: ${m.destination_location_type} (ID: ${m.destination_location_id})
    Qty: ${m.total_qty}`);
    });

    // Check goods_movement_items
    console.log('\n📋 Goods Movement Items for REQ-44:');
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
        WHERE sm.reference_no = 'REQ-44'
      )
      ORDER BY gmi.movement_id
    `, { type: sequelize.QueryTypes.SELECT });

    console.log(`Found ${items.length} items`);
    items.forEach(item => {
      console.log(`  Item: ${item.PART}, Qty: ${item.qty}`);
    });

    // Check ASC inventory (should be decreased)
    console.log('\n📦 ASC Spare Inventory (Should be Decreased):');
    const ascInventory = await sequelize.query(`
      SELECT 
        si.spare_inventory_id,
        si.spare_id,
        sp.PART,
        si.location_type,
        si.location_id,
        si.qty_good,
        si.qty_defective
      FROM spare_inventory si
      LEFT JOIN spare_parts sp ON si.spare_id = sp.Id
      WHERE si.spare_id IN (1, 2)
      AND si.location_type = 'service_center'
      AND si.location_id = ?
      ORDER BY si.spare_id
    `, { replacements: [req.asc_id], type: sequelize.QueryTypes.SELECT });

    console.log(`ASC Inventory (Service Center ${req.asc_id}):`);
    if (ascInventory.length === 0) {
      console.log('  No inventory found');
    } else {
      ascInventory.forEach(inv => {
        console.log(`  ${inv.PART}: Good=${inv.qty_good}, Defective=${inv.qty_defective}`);
      });
    }

    // Check Technician inventory (should be increased)
    console.log('\n🔧 Technician Spare Inventory (Should be Increased):');
    const techInventory = await sequelize.query(`
      SELECT 
        si.spare_inventory_id,
        si.spare_id,
        sp.PART,
        si.location_type,
        si.location_id,
        si.qty_good,
        si.qty_defective
      FROM spare_inventory si
      LEFT JOIN spare_parts sp ON si.spare_id = sp.Id
      WHERE si.spare_id IN (1, 2)
      AND si.location_type = 'technician'
      AND si.location_id = ?
      ORDER BY si.spare_id
    `, { replacements: [req.technician_id], type: sequelize.QueryTypes.SELECT });

    console.log(`Technician Inventory (Technician ${req.technician_id}):`);
    if (techInventory.length === 0) {
      console.log('  ❌ NO INVENTORY FOUND - Issue detected!');
      console.log('  The technician inventory was not created/updated');
    } else {
      techInventory.forEach(inv => {
        console.log(`  ✅ ${inv.PART}: Good=${inv.qty_good}, Defective=${inv.qty_defective}`);
      });
    }

    console.log('\n✅ Verification Complete!');

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

verifyTechnicianInventoryUpdate();
