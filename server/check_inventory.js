import { sequelize } from './db.js';

console.log('\n🔍 === SPARE INVENTORY CHECK ===\n');

try {
  // Check all spare inventory records
  const allRecords = await sequelize.query(`
    SELECT spare_id, location_type, location_id, qty_good, qty_defective
    FROM spare_inventory
    ORDER BY spare_id, location_type, location_id
  `, { type: sequelize.QueryTypes.SELECT });

  console.log(`Total spare_inventory records: ${allRecords.length}\n`);

  if (allRecords.length > 0) {
    console.log('Current Inventory:');
    allRecords.forEach(rec => {
      console.log(`  Spare ${rec.spare_id} @ ${rec.location_type}-${rec.location_id}: ${rec.qty_good} good, ${rec.qty_defective} defective`);
    });
  } else {
    console.log('❌ NO INVENTORY RECORDS FOUND IN spare_inventory TABLE\n');
    console.log('This is why transfers are not updating inventory!');
    console.log('\n📝 To fix this, populate spare_inventory for test:');
    console.log(`
    INSERT INTO spare_inventory (spare_id, location_type, location_id, qty_good, qty_defective)
    VALUES 
      (0, 'branch', 4, 10, 0),        -- 10 units at plant 4
      (0, 'service_center', 3, 5, 0); -- 5 units at ASC 3
    `);
  }

  // Also check spare parts
  console.log('\n📝 Available Spare Parts:');
  const spareParts = await sequelize.query(`
    SELECT TOP 5 Id, PART, BRAND, DESCRIPTION FROM spare_parts
  `, { type: sequelize.QueryTypes.SELECT });

  console.log(`Found ${spareParts.length} spare parts`);
  spareParts.forEach(part => {
    console.log(`  ID ${part.Id}: ${part.PART} (${part.BRAND})`);
  });

  // Check plants
  console.log('\n📝 Available Plants:');
  const plants = await sequelize.query(`
    SELECT TOP 5 plant_id, plant_code FROM plants
  `, { type: sequelize.QueryTypes.SELECT });

  console.log(`Found ${plants.length} plants`);
  plants.forEach(plant => {
    console.log(`  ID ${plant.plant_id}: ${plant.plant_code}`);
  });

  // Check service centers
  console.log('\n📝 Available Service Centers:');
  const asc = await sequelize.query(`
    SELECT TOP 5 asc_id, asc_name FROM service_centers
  `, { type: sequelize.QueryTypes.SELECT });

  console.log(`Found ${asc.length} service centers`);
  asc.forEach(center => {
    console.log(`  ID ${center.asc_id}: ${center.asc_name}`);
  });

} catch (error) {
  console.error('❌ Error:', error.message);
}

await sequelize.close();
