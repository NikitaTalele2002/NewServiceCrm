import { sequelize } from './db.js';

async function fixWarehouseLocationIds() {
  const transaction = await sequelize.transaction();
  try {
    console.log('=== Fixing Warehouse Location ID Conflict ===\n');
    
    // Step 1: Get all warehouse records
    const warehouse = await sequelize.query(
      `SELECT DISTINCT location_id FROM spare_inventory WHERE location_type='warehouse'`,
      { type: sequelize.QueryTypes.SELECT },
      { transaction }
    );
    
    console.log('Warehouse location_ids found:', warehouse.map(w => w.location_id).join(', '));
    
    // Step 2: Update each warehouse location
    // Map: location_id=1 → location_id=1001, etc.
    for (const record of warehouse) {
      const oldId = record.location_id;
      const newId = 1000 + oldId;  // offset by 1000
      
      console.log(`\nUpdating warehouse location_id: ${oldId} → ${newId}`);
      
      const count = await sequelize.query(
        `UPDATE spare_inventory SET location_id = ? WHERE location_type = 'warehouse' AND location_id = ?`,
        { replacements: [newId, oldId], transaction }
      );
      
      console.log(`  Updated ${count[1]} records`);
      
      // Show sample
      const sample = await sequelize.query(
        `SELECT TOP 2 spare_id, qty_good FROM spare_inventory WHERE location_type = 'warehouse' AND location_id = ?`,
        { replacements: [newId], type: sequelize.QueryTypes.SELECT, transaction }
      );
      console.log(`  Sample records:`, sample.map(s => `Spare ${s.spare_id}(qty:${s.qty_good})`).join(', '));
    }
    
    await transaction.commit();
    console.log('\n✅ Fixed! Warehouse location_ids now use 1000+ offset');
    console.log('   Warehouse location_id=1 is now location_id=1001');
    console.log('   This prevents conflict with Plant IDs (1-28)');
    
    process.exit(0);
  } catch (e) {
    await transaction.rollback();
    console.error('❌ Error:', e.message);
    process.exit(1);
  }
}

fixWarehouseLocationIds();
