import { sequelize } from './db.js';

(async () => {
  try {
    const res = await sequelize.query(`
      SELECT TOP 10
        request_id,
        spare_part_id,
        requested_qty,
        approval_status,
        request_status,
        created_at
      FROM spare_requests
      WHERE spare_part_id = 3197
      ORDER BY request_id DESC
    `);
    
    console.log('Spare Requests for ID 3197:');
    if (res[0].length === 0) {
      console.log('❌ No requests found');
    } else {
      console.table(res[0]);
    }
    
    // Also check what's in spare_inventory in general
    console.log('\n\nAll spare_inventory records (first 10):');
    const inv = await sequelize.query(`SELECT TOP 10 spare_id, location_type, location_id, qty_good, qty_defective FROM spare_inventory ORDER BY spare_id DESC`);
    console.table(inv[0]);
    
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
