import { sequelize } from './db.js';
import { QueryTypes } from 'sequelize';

async function quickCheck() {
  try {
    console.log('\n=== SERVICE CENTERS ===');
    const scs = await sequelize.query('SELECT TOP 5 asc_id, asc_name FROM service_centers', { type: QueryTypes.SELECT });
    scs.forEach(sc => console.log(`SC ${sc.asc_id}: ${sc.asc_name}`));

    console.log('\n=== SPARE REQUESTS ===');
    const reqs = await sequelize.query(`
      SELECT sr.request_id, sr.requested_to_id from spare_requests sr 
      WHERE sr.requested_to_type = 'service_center' AND sr.requested_source_type = 'technician'
      ORDER BY sr.request_id DESC
    `, { type: QueryTypes.SELECT });
    console.log(`Total requests: ${reqs.length}`);
    reqs.slice(0, 10).forEach(r => console.log(`  REQ-${r.request_id} → SC ${r.requested_to_id}`));

    console.log('\n=== SPARE REQUEST ITEMS (Latest 10) ===');
    const items = await sequelize.query(`
      SELECT TOP 10 sri.id, sri.request_id, sri.spare_id FROM spare_request_items sri ORDER BY sri.id DESC
    `, { type: QueryTypes.SELECT });
    items.forEach(i => console.log(`  Item ${i.id}: REQ-${i.request_id}, Spare ${i.spare_id}`));

    console.log('\n✅ Query complete\n');
  } catch (e) {
    console.error('❌', e.message);
  }
  process.exit(0);
}

quickCheck();
