import { sequelize } from './db.js';

async function checkPlantVsWarehouse() {
  try {
    console.log('=== Checking Inventory Organization ===\n');
    
    // Check what location_ids exist for warehouse
    const warehouse = await sequelize.query(
      `SELECT location_id, COUNT(*) as cnt FROM spare_inventory WHERE location_type='warehouse' GROUP BY location_id ORDER BY location_id`,
      { type: sequelize.QueryTypes.SELECT }
    );
    
    // Check what plant_ids exist
    const plants = await sequelize.query(
      `SELECT plant_id FROM plants ORDER BY plant_id`,
      { type: sequelize.QueryTypes.SELECT }
    );
    
    console.log('Warehouse location_ids:', warehouse.map(w => `${w.location_id}(${w.cnt} items)`).join(', '));
    console.log('Plant IDs:', plants.map(p => p.plant_id).join(', '));
    
    // Check if location_id in warehouse matches plant_id
    console.log('\n❓ Issue: Warehouse location_id matches Plant ID');
    console.log('   - Warehouse location_id=1 (storing 10 items)');
    console.log('   - Plant ID=1 (FIN_GUWAHATI)');
    console.log('   - These are being confused!');
    
    console.log('\n✅ Solution: Change warehouse location_id to clearly distinguish:');
    console.log('   - Keep warehouse at location_id=1 if it belongs to plant_id=1');
    console.log('   - OR rename location_type to "branch" for plant inventory');
    console.log('   - OR keep warehouse separate with different location_id mapping');
    
    // Show sample data
    console.log('\n=== Sample Data ===');
    const sample = await sequelize.query(
      `SELECT TOP 3 spare_id, location_type, location_id, qty_good FROM spare_inventory WHERE location_type='warehouse'`,
      { type: sequelize.QueryTypes.SELECT }
    );
    console.log(JSON.stringify(sample, null, 2));
    
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}

checkPlantVsWarehouse();
