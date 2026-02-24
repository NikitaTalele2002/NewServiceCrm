import { sequelize } from './db.js';
import { QueryTypes } from 'sequelize';

async function createItemsForRequest22() {
  try {
    console.log('\n' + '='.repeat(70));
    console.log('📦 CREATING TEST ITEMS FOR REQUEST 22');
    console.log('='.repeat(70) + '\n');

    // Get some spare parts to use
    console.log('1️⃣ Finding spare parts...');
    const spareParts = await sequelize.query(`
      SELECT TOP 5 Id, PART, DESCRIPTION, BRAND
      FROM spare_parts
      ORDER BY Id
    `, { type: QueryTypes.SELECT });

    if (spareParts.length === 0) {
      console.log('❌ No spare parts found in database!');
      process.exit(1);
    }

    console.log(`✅ Found ${spareParts.length} spare parts\n`);

    // Create items for request 22
    console.log('2️⃣ Creating items for Request 22...');
    
    const itemCreations = [];
    const quantities = [5, 3, 2, 4, 1]; // Different quantities for each item

    for (let i = 0; i < spareParts.length; i++) {
      const spare = spareParts[i];
      const quantity = quantities[i];
      
      const result = await sequelize.query(`
        INSERT INTO spare_request_items (request_id, spare_id, requested_qty, approved_qty)
        VALUES (?, ?, ?, ?)
      `, {
        replacements: [22, spare.Id, quantity, 0],
        type: QueryTypes.INSERT
      });

      const partDisplay = `${spare.PART} (${spare.DESCRIPTION})`;
      console.log(`   ✅ Item ${i + 1}: ${partDisplay} | Qty: ${quantity}`);
      itemCreations.push({
        spare_id: spare.Id,
        part: spare.PART,
        description: spare.DESCRIPTION,
        qty: quantity
      });
    }

    console.log(`\n✅ Created ${itemCreations.length} items for Request 22\n`);

    // Verify
    console.log('3️⃣ Verification:');
    const verify = await sequelize.query(`
      SELECT COUNT(*) as itemCount FROM spare_request_items 
      WHERE request_id = 22
    `, { type: QueryTypes.SELECT });

    console.log(`   Items now in Request 22: ${verify[0].itemCount}`);

    console.log('\n' + '='.repeat(70));
    console.log('✅ COMPLETE - Refresh the page to see the items!');
    console.log('='.repeat(70) + '\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    process.exit(0);
  }
}

createItemsForRequest22();
