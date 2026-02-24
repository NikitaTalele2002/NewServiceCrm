import { sequelize } from './db.js';

async function detailedCheck() {
  try {
    console.log('📋 Detailed Goods Movement Items Check:');
    console.log('========================================\n');

    // Check all approved requests (status_id = 3 based on what we see)
    const requests = await sequelize.query(`
      SELECT TOP 5
        sr.request_id,
        sr.status_id
      FROM spare_requests sr
      ORDER BY sr.request_id DESC
    `, { type: sequelize.QueryTypes.SELECT });

    for (const req of requests) {
      console.log(`\n✅ REQ-${req.request_id}:`);

      // Get all stock movements for this request
      const movements = await sequelize.query(`
        SELECT 
          sm.movement_id,
          sm.total_qty
        FROM stock_movement sm
        WHERE sm.reference_no = 'REQ-' + CAST(? AS VARCHAR)
        ORDER BY sm.movement_id
      `, { replacements: [req.request_id], type: sequelize.QueryTypes.SELECT });

      console.log(`   Stock Movements: ${movements.length}`);

      if (movements.length > 0) {
        for (const mov of movements) {
          const items = await sequelize.query(`
            SELECT 
              gmi.movement_item_id,
              gmi.spare_part_id,
              sp.PART,
              gmi.qty
            FROM goods_movement_items gmi
            LEFT JOIN spare_parts sp ON gmi.spare_part_id = sp.Id
            WHERE gmi.movement_id = ?
          `, { replacements: [mov.movement_id], type: sequelize.QueryTypes.SELECT });

          console.log(`     Movement ${mov.movement_id}: ${items.length} items`);
          items.forEach(item => {
            console.log(`       - ${item.PART}: Qty ${item.qty}`);
          });
        }
      }

      // Check request items
      const reqItems = await sequelize.query(`
        SELECT 
          sri.id,
          sri.spare_id,
          sp.PART,
          sri.requested_qty,
          sri.approved_qty
        FROM spare_request_items sri
        LEFT JOIN spare_parts sp ON sri.spare_id = sp.Id
        WHERE sri.request_id = ?
      `, { replacements: [req.request_id], type: sequelize.QueryTypes.SELECT });

      console.log(`   Request Items: ${reqItems.length}`);
      reqItems.forEach(item => {
        console.log(`     - ${item.PART}: Requested=${item.requested_qty}, Approved=${item.approved_qty}`);
      });
    }

    await sequelize.close();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

detailedCheck();
