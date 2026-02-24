import { sequelize } from './db.js';
import { SparePart, SpareInventory } from './models/index.js';

async function addBranchInventory() {
  try {
    console.log('=== Adding Sample Branch/Plant Inventory ===\n');

    // Get first 10 spare parts
    const spareParts = await SparePart.findAll({ limit: 10 });
    
    if (spareParts.length === 0) {
      console.log('No spare parts found in database');
      process.exit(1);
    }

    console.log(`Found ${spareParts.length} spare parts\n`);

    // Branch/Plant ID to add inventory for
    const branchId = 1;
    const locationType = 'branch';

    // Add inventory for each spare part at branch
    let addedCount = 0;
    const inventoryData = [];
    
    for (const sparePart of spareParts) {
      // Check if inventory already exists
      const existingInventory = await SpareInventory.findOne({
        where: {
          spare_id: sparePart.Id,
          location_type: locationType,
          location_id: branchId
        }
      });

      if (existingInventory) {
        console.log(`✓ Spare ${sparePart.Id} (${sparePart.PART}): already exists at ${locationType} ${branchId}`);
        continue;
      }

      // Create new inventory entry with random quantities
      try {
        const newInventory = await SpareInventory.create({
          spare_id: sparePart.Id,
          location_type: locationType,
          location_id: branchId,
          qty_good: Math.floor(Math.random() * 50) + 5,        // 5-55 units
          qty_defective: Math.floor(Math.random() * 10),        // 0-10 units
          qty_in_transit: Math.floor(Math.random() * 5)         // 0-5 units
        });

        inventoryData.push({
          spare_id: sparePart.Id,
          sku: sparePart.PART,
          description: sparePart.DESCRIPTION,
          location_type: locationType,
          location_id: branchId,
          qty_good: newInventory.qty_good,
          qty_defective: newInventory.qty_defective,
          qty_in_transit: newInventory.qty_in_transit
        });

        console.log(`✚ Added: Spare ${sparePart.Id} (${sparePart.PART}) - Good: ${newInventory.qty_good}, Defective: ${newInventory.qty_defective}, Transit: ${newInventory.qty_in_transit}`);
        addedCount++;
      } catch (err) {
        console.log(`✗ Failed to add spare ${sparePart.Id}: ${err.message}`);
      }
    }

    console.log(`\n=== Summary ===`);
    console.log(`Location Type: ${locationType}`);
    console.log(`Location ID: ${branchId}`);
    console.log(`Added Records: ${addedCount}`);
    console.log(`Total Spare Parts: ${spareParts.length}`);

    if (inventoryData.length > 0) {
      console.log('\n=== Sample Data Added ===');
      console.log(JSON.stringify(inventoryData, null, 2));
    }

    console.log('\n✅ Branch inventory data added successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding branch inventory:', error.message);
    process.exit(1);
  }
}

addBranchInventory();
