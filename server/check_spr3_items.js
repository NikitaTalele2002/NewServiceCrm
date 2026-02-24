/**
 * Check Spare Request Items for Request ID 3
 */

import { sequelize } from './db.js';
import { QueryTypes } from 'sequelize';

async function checkItems() {
  try {
    console.log('Checking spare_request_items for request_id=3...\n');

    // Check if items exist
    const items = await sequelize.query(`
      SELECT 
        sri.id,
        sri.request_id,
        sri.spare_id,
        sri.requested_qty,
        sri.approved_qty,
        sp.PART,
        sp.DESCRIPTION
      FROM spare_request_items sri
      LEFT JOIN spare_parts sp ON sri.spare_id = sp.Id
      WHERE sri.request_id = 3
    `, { type: QueryTypes.SELECT });

    if (items.length === 0) {
      console.log('❌ No items found for request_id=3');
      
      // Check what's in the spare_request_items table at all
      console.log('\n📋 All Spare Request Items:');
      const allItems = await sequelize.query(`
        SELECT TOP 10 id, request_id, spare_id, requested_qty FROM spare_request_items
        ORDER BY request_id
      `, { type: QueryTypes.SELECT });

      if (allItems.length === 0) {
        console.log('❌ spare_request_items table is empty!');
      } else {
        allItems.forEach(item => {
          console.log(`  - ID: ${item.id}, Request: ${item.request_id}, Spare: ${item.spare_id}, Qty: ${item.requested_qty}`);
        });
      }
    } else {
      console.log(`✅ Found ${items.length} item(s) for request_id=3:`);
      items.forEach(item => {
        console.log(`  - ID: ${item.id}`);
        console.log(`    Spare ID: ${item.spare_id}`);
        console.log(`    Part Code: ${item.PART}`);
        console.log(`    Description: ${item.DESCRIPTION}`);
        console.log(`    Requested QTY: ${item.requested_qty}`);
        console.log(`    Approved QTY: ${item.approved_qty}`);
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

checkItems();
