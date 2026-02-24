/**
 * Check Spare Inventory Data
 */

import { sequelize } from './db.js';

async function checkInventory() {
  try {
    console.log('Checking spare_inventory table...\n');

    // Count records
    const count = await sequelize.query(
      'SELECT COUNT(*) as cnt FROM spare_inventory',
      { type: sequelize.QueryTypes.SELECT }
    );
    console.log('Total spare_inventory records:', count[0].cnt);

    // Show sample records
    console.log('\nSample records:');
    const samples = await sequelize.query(
      `SELECT TOP 10 spare_inventory_id, spare_id, location_type, location_id, qty_good, qty_defective 
       FROM spare_inventory 
       ORDER BY spare_inventory_id DESC`,
      { type: sequelize.QueryTypes.SELECT }
    );
    console.log(JSON.stringify(samples, null, 2));

    // Check for warehouse location
    console.log('\nWarehouse inventory records:');
    const warehouse = await sequelize.query(
      `SELECT TOP 10 spare_inventory_id, spare_id, location_type, location_id, qty_good, qty_defective 
       FROM spare_inventory 
       WHERE location_type = 'warehouse'
       ORDER BY spare_inventory_id DESC`,
      { type: sequelize.QueryTypes.SELECT }
    );
    console.log(JSON.stringify(warehouse, null, 2));

    // Check for plant_id = 1 specifically
    console.log('\nInventory for plant_id = 1 (warehouse):');
    const plant1 = await sequelize.query(
      `SELECT TOP 10 spare_inventory_id, spare_id, location_type, location_id, qty_good, qty_defective 
       FROM spare_inventory 
       WHERE location_type = 'warehouse' AND location_id = 1
       ORDER BY spare_inventory_id DESC`,
      { type: sequelize.QueryTypes.SELECT }
    );
    console.log(JSON.stringify(plant1, null, 2));

    if (plant1.length === 0) {
      console.log('\n⚠️  No inventory data for plant_id=1 warehouse');
      console.log('We need to insert test data');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
}

checkInventory();
