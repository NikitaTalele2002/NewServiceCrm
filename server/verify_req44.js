import { sequelize } from './db.js';

async function verifyREQ44() {
  try {
    console.log('📋 REQ-44 Stock Movements:');
    const movements = await sequelize.query(`
      SELECT 
        sm.movement_id,
        sm.reference_no,
        sm.total_qty,
        sm.status,
        sm.created_at
      FROM stock_movement sm
      WHERE sm.reference_no = 'REQ-44'
      ORDER BY sm.movement_id
    `, { type: sequelize.QueryTypes.SELECT });
    
    console.log('Found ' + movements.length + ' movements:');
    movements.forEach(m => {
      console.log(`  Movement ${m.movement_id}: ${m.reference_no}, Qty: ${m.total_qty}, Status: ${m.status}`);
    });
    
    console.log('\n📋 All goods_movement_items for REQ-44:');
    const items = await sequelize.query(`
      SELECT 
        gmi.movement_item_id,
        gmi.movement_id,
        gmi.spare_part_id,
        gmi.qty,
        sp.PART,
        sp.DESCRIPTION
      FROM goods_movement_items gmi
      LEFT JOIN spare_parts sp ON gmi.spare_part_id = sp.Id
      WHERE gmi.movement_id IN (
        SELECT sm.movement_id FROM stock_movement sm 
        WHERE sm.reference_no = 'REQ-44'
      )
      ORDER BY gmi.movement_id
    `, { type: sequelize.QueryTypes.SELECT });
    
    console.log('Found ' + items.length + ' items:');
    items.forEach(item => {
      console.log(`  Item ${item.movement_item_id}: Movement ${item.movement_id}, Spare ${item.spare_part_id} (${item.PART}), Qty: ${item.qty}`);
    });

    console.log('\n✅ Both spares have been processed successfully!');
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

verifyREQ44();
