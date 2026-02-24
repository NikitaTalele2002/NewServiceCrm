/**
 * Add Warehouse Inventory Test Data
 */

import { sequelize } from './db.js';

async function addWarehouseInventory() {
  try {
    console.log('Adding warehouse inventory test data...\n');

    // First, get available spare parts to use
    const spareParts = await sequelize.query(
      'SELECT TOP 10 Id FROM spare_parts ORDER BY Id ASC',
      { type: sequelize.QueryTypes.SELECT }
    );

    if (spareParts.length === 0) {
      console.log('❌ No spare parts found. Please add spare parts first.');
      return;
    }

    console.log(`Found ${spareParts.length} spare parts to use\n`);

    // Insert warehouse inventory for plant_id = 1
    const warehouseData = spareParts.map((sp, idx) => ({
      spare_id: sp.Id,
      location_type: 'warehouse',
      location_id: 1,  // plant_id = 1 (FIN_GUWAHATI)
      qty_good: Math.floor(Math.random() * 50) + 10,  // 10-60 units
      qty_defective: Math.floor(Math.random() * 10) + 1,  // 1-10 units
      created_at: new Date(),
      updated_at: new Date()
    }));

    console.log('Inserting records:');
    console.log(JSON.stringify(warehouseData.slice(0, 3), null, 2));
    console.log(`... and ${warehouseData.length - 3} more records\n`);

    // Insert in batches
    for (const record of warehouseData) {
      await sequelize.query(
        `INSERT INTO spare_inventory (spare_id, location_type, location_id, qty_good, qty_defective, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, GETDATE(), GETDATE())`,
        {
          replacements: [record.spare_id, record.location_type, record.location_id, record.qty_good, record.qty_defective],
          type: sequelize.QueryTypes.INSERT
        }
      );
    }

    console.log(`✅ Inserted ${warehouseData.length} warehouse inventory records\n`);

    // Verify
    const verify = await sequelize.query(
      `SELECT COUNT(*) as cnt FROM spare_inventory WHERE location_type = 'warehouse' AND location_id = 1`,
      { type: sequelize.QueryTypes.SELECT }
    );

    console.log(`✅ Verified: ${verify[0].cnt} warehouse inventory records for plant_id=1`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
}

addWarehouseInventory();
