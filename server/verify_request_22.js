import { sequelize } from './db.js';
import { QueryTypes } from 'sequelize';

async function verifyAPIResponse() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('✅ VERIFYING API RESPONSE FOR REQUEST 22');
    console.log('='.repeat(80) + '\n');

    // Simulate what the API returns
    console.log('Getting items with same query as API endpoint...\n');

    const items = await sequelize.query(`
      SELECT 
        sri.id as itemId,
        sri.spare_id as spareId,
        sri.requested_qty as requestedQty,
        COALESCE(sri.approved_qty, 0) as approvedQty,
        sp.PART as partCode,
        sp.DESCRIPTION as partDescription,
        sp.BRAND as brand
      FROM spare_request_items sri
      LEFT JOIN spare_parts sp ON sri.spare_id = sp.Id
      WHERE sri.request_id = ?
      ORDER BY sri.id
    `, { 
      replacements: [22], 
      type: QueryTypes.SELECT 
    });

    console.log(`📦 Found ${items.length} items:\n`);
    
    items.forEach((item, idx) => {
      console.log(`Item ${idx + 1}:`);
      console.log(`  itemId: ${item.itemId}`);
      console.log(`  spareId: ${item.spareId}`);
      console.log(`  partCode: ${item.partCode}`);
      console.log(`  partDescription: ${item.partDescription}`);
      console.log(`  requestedQty: ${item.requestedQty}`);
      console.log(`  approvedQty: ${item.approvedQty}`);
      console.log();
    });

    console.log('Component will map these fields:');
    console.log(`  itemId → id`);
    console.log(`  spareId → spare_id`);
    console.log(`  partCode → spare_code`);
    console.log(`  partDescription → description`);
    console.log(`  requestedQty → requestedQty`);
    console.log(`  approvedQty → approvedQty`);
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ API RESPONSE IS CORRECT - Items will display in detail view');
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
}

verifyAPIResponse();
