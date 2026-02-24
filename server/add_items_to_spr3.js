/**
 * Add Test Items to Return Request 3
 */

import { sequelize } from './db.js';
import { QueryTypes } from 'sequelize';

async function addTestItems() {
  try {
    console.log ('Adding test items to return request 3...\n');

    // Get some spare parts to use
    const spareParts = await sequelize.query(`
      SELECT TOP 3 Id, PART, DESCRIPTION FROM spare_parts
      ORDER BY Id DESC
    `, { type: QueryTypes.SELECT });

    if (spareParts.length === 0) {
      console.log('❌ No spare parts found!');
      process.exit(0);
    }

    console.log(`Found ${spareParts.length} spare parts to use:`);
    spareParts.forEach(sp => {
      console.log(`  - ID: ${sp.Id}, Code: ${sp.PART}, Description: ${sp.DESCRIPTION}`);
    });

    // Add items for request 3
    const quantities = [5, 3, 2];

    for (let i = 0; i < spareParts.length; i++) {
      const sp = spareParts[i];
      const qty = quantities[i];
      
      const insertResult = await sequelize.query(`
        INSERT INTO spare_request_items (request_id, spare_id, requested_qty, created_at)
        VALUES (3, ?, ?, GETUTCDATE())
      `, {
        replacements: [sp.Id, qty],
        type: QueryTypes.INSERT
      });

      console.log(`\n✅ Added item to request_id=3:`);
      console.log(`  - Spare ID: ${sp.Id} (${sp.PART})`);
      console.log(`  - Quantity: ${qty}`);
    }

    // Verify items were added
    console.log('\n📋 Verifying items in request 3:');
    const items = await sequelize.query(`
      SELECT 
        sri.id,
        sri.spare_id,
        sp.PART,
        sp.DESCRIPTION,
        sri.requested_qty
      FROM spare_request_items sri
      LEFT JOIN spare_parts sp ON sri.spare_id = sp.Id
      WHERE sri.request_id = 3
    `, { type: QueryTypes.SELECT });

    if (items.length === 0) {
      console.log('❌ No items found after insert!');
    } else {
      console.log(`✅ Found ${items.length} items:`);
      items.forEach(item => {
        console.log(`  - Item ID: ${item.id}, Spare: ${item.PART}, Qty: ${item.requested_qty}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error.message || error);
    if (error.original && error.original.errors) {
      error.original.errors.forEach((err, i) => {
        console.error(`  DB Error ${i + 1}:`, err.message);
      });
    }
  } finally {
    process.exit(0);
  }
}

addTestItems();
