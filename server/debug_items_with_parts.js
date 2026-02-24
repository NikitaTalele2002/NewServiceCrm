import { sequelize } from './db.js';
import { QueryTypes } from 'sequelize';

async function debugItemsWithParts() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🔍 DEBUG: Checking Items Query Results');
    console.log('='.repeat(80) + '\n');

    // Check what's in spare_request_items
    console.log('1️⃣ Spare Request Items for Request 22:');
    const sri = await sequelize.query(`
      SELECT id, request_id, spare_id, requested_qty FROM spare_request_items 
      WHERE request_id = 22
    `, { type: QueryTypes.SELECT });
    
    sri.forEach(item => {
      console.log(`  Item ${item.id}: spare_id=${item.spare_id}, qty=${item.requested_qty}`);
    });

    // Check spare parts information
    console.log('\n2️⃣ Spare Parts that should match:');
    const sp = await sequelize.query(`
      SELECT TOP 6 Id, PART, DESCRIPTION FROM spare_parts ORDER BY Id
    `, { type: QueryTypes.SELECT });
    
    sp.forEach(part => {
      console.log(`  ID ${part.Id}: ${part.PART} - ${part.DESCRIPTION}`);
    });

    // Now run the EXACT query the API uses
    console.log('\n3️⃣ API Query Result (with LEFT JOIN):');
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
      WHERE sri.request_id = 22
      ORDER BY sri.id
    `, { type: QueryTypes.SELECT });

    console.log(`Found ${items.length} items\n`);
    items.forEach((item, i) => {
      console.log(`Item ${i+1}:`);
      console.log(`  itemId: ${item.itemId}`);
      console.log(`  spareId: ${item.spareId}`);
      console.log(`  partCode: ${item.partCode}`);
      console.log(`  partDescription: ${item.partDescription}`);
      console.log(`  requestedQty: ${item.requestedQty}`);
      
      if (!item.partCode) {
        console.log(`  ⚠️  WARNING: partCode is NULL/undefined!`);
      }
      if (!item.partDescription) {
        console.log(`  ⚠️  WARNING: partDescription is NULL/undefined!`);
      }
      console.log();
    });

    console.log('\n' + '='.repeat(80));

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    process.exit(0);
  }
}

debugItemsWithParts();
