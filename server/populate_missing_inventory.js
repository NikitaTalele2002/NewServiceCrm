/**
 * Script to populate missing spare inventory records
 * This will add inventory records for spare parts that are being requested
 */

import { sequelize } from './db.js';

async function populateInventory() {
  try {
    console.log('=== Populating Missing Inventory Records ===\n');

    // Step 1: Get service centers and branches
    const locations = await sequelize.query(`
      SELECT DISTINCT location_type, location_id 
      FROM spare_inventory
      ORDER BY location_type, location_id
    `, {
      type: sequelize.QueryTypes.SELECT
    });

    console.log('Found locations:');
    locations.forEach(loc => console.log(`  - ${loc.location_type} ID ${loc.location_id}`));

    // Step 2: Get spare parts being requested
    const requestedSpares = await sequelize.query(`
      SELECT DISTINCT sri.spare_id 
      FROM spare_request_items sri
      WHERE sri.spare_id NOT IN (
        SELECT DISTINCT spare_id FROM spare_inventory
      )
      ORDER BY sri.spare_id
    `, {
      type: sequelize.QueryTypes.SELECT
    });

    console.log(`\nFound ${requestedSpares.length} spare parts without inventory records`);

    if (requestedSpares.length === 0) {
      console.log('✅ All requested spare parts already have inventory records');
      process.exit(0);
    }

    // Step 3: Insert inventory records for missing spares at each location
    console.log('\nInserting inventory records...');
    let inserted = 0;

    for (const spare of requestedSpares) {
      for (const loc of locations) {
        // Insert with 0 qty to test rejection, can be updated later
        const result = await sequelize.query(`
          INSERT INTO spare_inventory (spare_id, location_type, location_id, qty_good, qty_defective)
          VALUES (?, ?, ?, 0, 0)
        `, {
          replacements: [spare.spare_id, loc.location_type, loc.location_id],
          type: sequelize.QueryTypes.INSERT
        });
        inserted++;
      }
    }

    console.log(`✅ Created ${inserted} inventory records`);

    // Step 4: Verify
    const nowHasInventory = await sequelize.query(`
      SELECT COUNT(DISTINCT spare_id) as total FROM spare_inventory
    `, {
      type: sequelize.QueryTypes.SELECT
    });

    console.log(`\n📊 Summary:`);
    console.log(`  - Total unique spare_ids with inventory: ${nowHasInventory[0].total}`);
    console.log(`\n✅ Inventory records populated!`);
    console.log(`   Now test approval: spare_id 160 at service_center 4 should be rejected (0 available)`);

    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

populateInventory();
