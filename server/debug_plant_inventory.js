// debug_plant_inventory.js
// Script to debug and print plant inventory for a given plantId and SKU
// Usage: node debug_plant_inventory.js <plantId> [sku]

import { sequelize } from './db.js';

async function debugPlantInventory(plantId, sku = null) {
  if (!plantId) {
    console.error('Usage: node debug_plant_inventory.js <plantId> [sku]');
    process.exit(1);
  }
  try {
    let query = `SELECT si.spare_inventory_id, si.spare_id, si.location_type, si.location_id, si.qty_good, si.qty_defective, si.created_at, si.updated_at
                 FROM spare_inventory si
                 WHERE si.location_type = 'plant' AND si.location_id = ?`;
    const replacements = [plantId];
    if (sku) {
      query += ' AND si.spare_id = ?';
      replacements.push(sku);
    }
    query += ' ORDER BY si.spare_id ASC';
    const inventory = await sequelize.query(query, {
      replacements,
      type: sequelize.QueryTypes.SELECT
    });
    if (!inventory.length) {
      console.log('No inventory found for plantId:', plantId, sku ? `and SKU: ${sku}` : '');
      return;
    }
    console.log(`Inventory for plantId ${plantId}${sku ? `, SKU ${sku}` : ''}:`);
    inventory.forEach(item => {
      console.log(`  SKU: ${item.spare_id}, Good: ${item.qty_good}, Defective: ${item.qty_defective}, InventoryId: ${item.spare_inventory_id}`);
    });
  } catch (err) {
    console.error('Error querying plant inventory:', err.message);
  } finally {
    await sequelize.close();
  }
}

const [,, plantId, sku] = process.argv;
debugPlantInventory(plantId, sku);
