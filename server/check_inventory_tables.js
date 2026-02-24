import { sequelize } from './db.js';

async function checkTables() {
  try {
    console.log('📊 CHECKING STOCK MOVEMENT & INVENTORY TABLES\n');

    // Check spare_inventory structure
    console.log('1️⃣ spare_inventory columns:');
    const invCols = await sequelize.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'spare_inventory'
      ORDER BY ORDINAL_POSITION
    `, { type: sequelize.QueryTypes.SELECT });
    invCols.forEach(col => console.log(`  ${col.COLUMN_NAME}: ${col.DATA_TYPE}`));

    // Check stock_movement structure
    console.log('\n2️⃣ stock_movement columns:');
    const movCols = await sequelize.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'stock_movement'
      ORDER BY ORDINAL_POSITION
    `, { type: sequelize.QueryTypes.SELECT });
    movCols.forEach(col => console.log(`  ${col.COLUMN_NAME}: ${col.DATA_TYPE}`));

    // Check sample inventories
    console.log('\n3️⃣ Sample inventory data:');
    const invData = await sequelize.query(`
      SELECT TOP 5 * FROM spare_inventory
    `, { type: sequelize.QueryTypes.SELECT });
    if (invData.length > 0) {
      console.log('Columns:', Object.keys(invData[0]));
      console.log('Sample row:', invData[0]);
    }

    // Check sample movements
    console.log('\n4️⃣ Sample stock movement:');
    const movData = await sequelize.query(`
      SELECT TOP 5 * FROM stock_movement
    `, { type: sequelize.QueryTypes.SELECT });
    if (movData.length > 0) {
      console.log('Columns:', Object.keys(movData[0]));
      console.log('Sample row:', movData[0]);
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit(0);
  }
}

checkTables();
