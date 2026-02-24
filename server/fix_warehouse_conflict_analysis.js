import { sequelize } from './db.js';

async function fixWarehouseLocationConflict() {
  try {
    console.log('=== Fixing Warehouse/Plant Location Conflict ===\n');
    
    // Step 1: Get all warehouse records
    const warehouse = await sequelize.query(
      `SELECT spare_inventory_id, spare_id, location_id, qty_good, qty_defective FROM spare_inventory WHERE location_type='warehouse'`,
      { type: sequelize.QueryTypes.SELECT }
    );
    
    console.log(`Found ${warehouse.length} warehouse records to fix\n`);
    
    // Step 2: For each warehouse record, determine if it's a central warehouse
    // Warehouse location_id=1 likely means it serves plant_id=1
    // We'll rename it to use location_type='branch' to clarify it's plant inventory
    
    console.log('Solution: Convert warehouse to branch');
    console.log('This clarifies that warehouse location_id=1 stores inventory FOR plant_id=1\n');
    
    // Alternative mappings:
    console.log('Option 1: Rename warehouse to branch');
    console.log('  UPDATE spare_inventory SET location_type="branch" WHERE location_type="warehouse"\n');
    
    console.log('Option 2: Keep warehouse, use location_id offset (add 1000)');
    console.log('  warehouse location_id=1 → location_id=1001 (central warehouse)\n');
    
    console.log('Option 3: Distinguish warehouse scope');
    console.log('  location_type="branch" for plant-owned warehouse/inventory');
    console.log('  location_type="warehouse" only for central distribution warehouses (location_id > 9999)\n');
    
    console.log('RECOMMENDATION: Use Option 1');
    console.log('Change location_type from "warehouse" to "branch" for plant inventory\n');
    
    console.log('Current warehouse records:');
    warehouse.slice(0, 3).forEach(w => {
      console.log(`  Spare ${w.spare_id}: warehouse location_id=${w.location_id}, qty_good=${w.qty_good}`);
    });
    
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}

fixWarehouseLocationConflict();
