/**
 * Check spare_inventory table structure and data
 */
import { sequelize } from './db.js';

async function checkSpareInventory() {
  try {
    console.log('📊 CHECKING SPARE_INVENTORY TABLE\n');
    
    // Check columns
    console.log('1️⃣ Spare inventory table structure:');
    const cols = await sequelize.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'spare_inventory'
      ORDER BY ORDINAL_POSITION
    `, { type: sequelize.QueryTypes.SELECT });
    
    console.log('Columns:');
    cols.forEach(c => console.log(`  - ${c.COLUMN_NAME} (${c.DATA_TYPE}, nullable: ${c.IS_NULLABLE})`));
    
    // Check sample data
    console.log('\n2️⃣ Sample data from spare_inventory:');
    const data = await sequelize.query(`
      SELECT TOP 5 *
      FROM spare_inventory
    `, { type: sequelize.QueryTypes.SELECT });
    
    if (data.length > 0) {
      console.log(`Found ${data.length} records`);
      console.log('\nFirst record:');
      Object.keys(data[0]).forEach(key => {
        console.log(`  ${key}: ${data[0][key]}`);
      });
    } else {
      console.log('No data found');
    }
    
    // Check if there are technician associations
    console.log('\n3️⃣ Checking for technician-related columns...');
    const techCols = [
      'technician_id',
      'technician',
      'assigned_to',
      'allocated_to',
      'owner_id'
    ];
    
    const colNames = cols.map(c => c.COLUMN_NAME.toLowerCase());
    const foundTechCols = techCols.filter(tc => colNames.includes(tc));
    
    if (foundTechCols.length > 0) {
      console.log(`Found technician columns: ${foundTechCols.join(', ')}`);
      
      // If technician_id exists, show inventory by technician
      if (colNames.includes('technician_id')) {
        console.log('\n4️⃣ Inventory by technician:');
        const byTech = await sequelize.query(`
          SELECT technician_id, COUNT(*) as cnt
          FROM spare_inventory
          WHERE technician_id IS NOT NULL
          GROUP BY technician_id
          ORDER BY technician_id
        `, { type: sequelize.QueryTypes.SELECT });
        
        if (byTech.length > 0) {
          byTech.forEach(row => {
            console.log(`  - Technician ${row.technician_id}: ${row.cnt} items`);
          });
        } else {
          console.log('  No technician allocations found');
        }
      }
    } else {
      console.log('No technician-related columns found in spare_inventory');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

checkSpareInventory();
