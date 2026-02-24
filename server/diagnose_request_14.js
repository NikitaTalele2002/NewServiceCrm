/**
 * Diagnostic: Check why request 14 shows 0 available inventory
 */

import { sequelize, SpareRequest, SpareRequestItem, SpareInventory } from './models/index.js';

async function diagnose() {
  try {
    console.log('=== DIAGNOSTIC: Request 14 Inventory Mismatch ===\n');

    // Get request 14
    console.log('1️⃣  Fetching Request 14...');
    const request = await SpareRequest.findOne({
      where: { request_id: 14 },
      include: [
        {
          model: SpareRequestItem,
          as: 'SpareRequestItems'
        }
      ]
    });

    if (!request) {
      console.log('❌ Request 14 not found\n');
      process.exit(1);
    }

    console.log('Request details:');
    console.log(`  requested_to_type: ${request.requested_to_type}`);
    console.log(`  requested_to_id: ${request.requested_to_id}`);
    console.log(`  Items: ${request.SpareRequestItems.length}\n`);

    // For each item, check inventory
    console.log('2️⃣  Checking inventory for each item...\n');

    for (const item of request.SpareRequestItems) {
      console.log(`Item: Spare ID ${item.spare_id}`);
      console.log(`  Requested Qty: ${item.requested_qty}`);

      // Check what's in inventory at this location
      const inventoryAtLocation = await SpareInventory.findOne({
        where: {
          spare_id: item.spare_id,
          location_type: request.requested_to_type,
          location_id: request.requested_to_id
        }
      });

      if (inventoryAtLocation) {
        console.log(`  ✅ Found inventory at ${request.requested_to_type}:${request.requested_to_id}`);
        console.log(`     qty_good: ${inventoryAtLocation.qty_good}`);
        console.log(`     qty_defective: ${inventoryAtLocation.qty_defective}`);
        console.log(`     qty_in_transit: ${inventoryAtLocation.qty_in_transit}`);
      } else {
        console.log(`  ❌ NO inventory at ${request.requested_to_type}:${request.requested_to_id}`);
        
        // Check if inventory exists for this spare at any location
        console.log(`  🔍 Checking all locations for this spare:`);
        const allLocations = await SpareInventory.findAll({
          where: { spare_id: item.spare_id }
        });
        
        if (allLocations.length === 0) {
          console.log(`     No inventory exists for this spare anywhere`);
        } else {
          allLocations.forEach(inv => {
            console.log(`     - Found at ${inv.location_type}:${inv.location_id} (good: ${inv.qty_good})`);
          });
        }
      }
      console.log('');
    }

    // Check what plants exist
    console.log('3️⃣  All plant IDs in database:');
    const plants = await sequelize.query(
      'SELECT DISTINCT plant_id FROM plants ORDER BY plant_id'
    );
    plants[0].forEach(p => console.log(`  - plant_id: ${p.plant_id}`));

    console.log('\n4️⃣  All inventory locations (branch type):');
    const locations = await sequelize.query(
      'SELECT DISTINCT location_id FROM spare_inventory WHERE location_type = "branch" ORDER BY location_id'
    );
    locations[0].forEach(l => console.log(`  - location_id: ${l.location_id}`));

    console.log('\n✅ Diagnostic complete\n');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

diagnose();
