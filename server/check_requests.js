import { sequelize } from './db.js';

async function checkRequests() {
  try {
    console.log('📋 Checking Recent Requests and their goods_movement_items:');
    console.log('===========================================================\n');

    const requests = await sequelize.query(`
      SELECT TOP 10 
        sr.request_id,
        COUNT(sri.id) as item_count,
        sr.status_id
      FROM spare_requests sr
      LEFT JOIN spare_request_items sri ON sr.request_id = sri.request_id
      GROUP BY sr.request_id, sr.status_id
      ORDER BY sr.request_id DESC
    `, { type: sequelize.QueryTypes.SELECT });

    for (const req of requests) {
      const goodsItems = await sequelize.query(`
        SELECT COUNT(*) as cnt FROM goods_movement_items gmi 
        WHERE gmi.movement_id IN (
          SELECT sm.movement_id FROM stock_movement sm 
          WHERE sm.reference_no = 'REQ-' + CAST(? AS VARCHAR)
        )
      `, { replacements: [req.request_id], type: sequelize.QueryTypes.SELECT });

      const count = goodsItems[0].cnt || 0;
      console.log(`REQ-${req.request_id}: Request Items=${req.item_count}, Goods Items=${count}, Status=${req.status_id}`);
    }

    await sequelize.close();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkRequests();
