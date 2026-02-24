/**
 * Diagnostic: Check technician inventory status
 */
import { sequelize } from './db.js';

async function checkTechnicianInventory() {
  try {
    console.log('📊 CHECKING TECHNICIAN INVENTORY STATUS\n');
    
    // Step 1: List all tables with 'inventory' or 'tech' in name
    console.log('1️⃣ Checking table names...');
    const tables = await sequelize.query(`
      SELECT TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = 'dbo'
      AND (TABLE_NAME LIKE '%inventory%' OR TABLE_NAME LIKE '%tech%')
      ORDER BY TABLE_NAME
    `, { type: sequelize.QueryTypes.SELECT });
    
    console.log('Tables found:');
    tables.forEach(t => console.log(`  - ${t.TABLE_NAME}`));
    
    // Step 2: Check if technician_inventory exists
    console.log('\n2️⃣ Checking technician_inventory table...');
    const checkTable = await sequelize.query(`
      SELECT COLUMN_NAME, DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'technician_inventory'
      ORDER BY ORDINAL_POSITION
    `, { type: sequelize.QueryTypes.SELECT });
    
    if (checkTable.length > 0) {
      console.log('✅ technician_inventory table exists');
      console.log('Columns:');
      checkTable.forEach(col => console.log(`  - ${col.COLUMN_NAME} (${col.DATA_TYPE})`));
      
      // Count records
      const count = await sequelize.query(`
        SELECT COUNT(*) as cnt FROM technician_inventory
      `, { type: sequelize.QueryTypes.SELECT });
      console.log(`\n✅ Total records: ${count[0].cnt}`);
      
      // Check by technician
      console.log('\n3️⃣ Inventory by technician:');
      const byTech = await sequelize.query(`
        SELECT technician_id, COUNT(*) as item_count, SUM(good_qty) as total_good
        FROM technician_inventory
        GROUP BY technician_id
        ORDER BY technician_id
      `, { type: sequelize.QueryTypes.SELECT });
      
      byTech.forEach(row => {
        console.log(`  - Technician ${row.technician_id}: ${row.item_count} items, ${row.total_good} good qty`);
      });
    } else {
      console.log('❌ technician_inventory table DOES NOT EXIST');
    }
    
    // Step 4: Check TechnicianInventory model
    console.log('\n4️⃣ Checking if model queries work...');
    try {
      const { TechnicianInventory } = await import('./models/index.js');
      const modelCount = await TechnicianInventory.count();
      console.log(`✅ TechnicianInventory model query: ${modelCount} records`);
      
      // Try to find for technician 2
      const tech2 = await TechnicianInventory.findAll({
        where: { TechnicianId: 2 },
        limit: 3
      });
      console.log(`✅ Technician 2 inventory: ${tech2.length} items found`);
      if (tech2.length > 0) {
        console.log('  Sample:', JSON.stringify(tech2[0].dataValues, null, 2));
      }
      
      // Try technician 1
      const tech1 = await TechnicianInventory.findAll({
        where: { TechnicianId: 1 },
        limit: 3
      });
      console.log(`✅ Technician 1 inventory: ${tech1.length} items found`);
      
    } catch (err) {
      console.error('❌ Model error:', err.message);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

checkTechnicianInventory();
