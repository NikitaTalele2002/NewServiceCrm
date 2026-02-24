import { sequelize } from './db.js';
import { SparePart, SpareInventory, ServiceCenter } from './models/index.js';

async function addSpareInventory() {
  try {
    // Get service center ID (default to 4 if not found)
    let serviceCenterId = 2; // Default service center ID
    
    // Try to find the first service center
    try {
      const serviceCenters = await ServiceCenter.findAll({ limit: 1 });
      if (serviceCenters.length > 0 && serviceCenters[0].id) {
        serviceCenterId = serviceCenters[0].id;
      }
    } catch (e) {
      console.log('Could not fetch service centers, using default ID: 4');
    }
    
    console.log(`Using service center ID: ${serviceCenterId}`);

    // Get first 10 spare parts
    const spareParts = await SparePart.findAll({ limit: 10 });
    
    if (spareParts.length === 0) {
      console.log('No spare parts found in database');
      return;
    }

    console.log(`Found ${spareParts.length} spare parts`);

    // Add inventory for each spare part
    const inventoryEntries = [];
    
    for (const sparePart of spareParts) {
      const existingInventory = await SpareInventory.findOne({
        where: {
          spare_id: sparePart.Id,
          location_type: 'service_center',
          location_id: serviceCenterId
        }
      });

      if (existingInventory) {
        console.log(`Inventory for spare ${sparePart.Id} (${sparePart.PART}) already exists`);
        continue;
      }

      // Create new inventory entry
      const newInventory = await SpareInventory.create({
        spare_id: sparePart.Id,
        location_type: 'service_center',
        location_id: serviceCenterId,
        qty_good: Math.floor(Math.random() * 20) + 1, // Random quantity between 1-20
        qty_defective: Math.floor(Math.random() * 5) // Random defective between 0-4
      });

      inventoryEntries.push({
        spare_part: sparePart.PART,
        spare_id: sparePart.Id,
        good_qty: newInventory.qty_good,
        defective_qty: newInventory.qty_defective
      });

      console.log(`Added inventory for spare ${sparePart.Id} (${sparePart.PART}): Good=${newInventory.qty_good}, Defective=${newInventory.qty_defective}`);
    }

    console.log('\n✅ Inventory added successfully!');
    console.log('\nSummary:');
    console.log(`Service Center: ${serviceCenterId}`);
    console.log(`Location Type: service_center`);
    console.log(`Total entries added: ${inventoryEntries.length}`);
    
    console.log('\nInventory Details:');
    inventoryEntries.forEach(entry => {
      console.log(`  - ${entry.spare_part} (ID: ${entry.spare_id}): Good=${entry.good_qty}, Defective=${entry.defective_qty}`);
    });

  } catch (error) {
    console.error('Error adding spare inventory:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

addSpareInventory();
