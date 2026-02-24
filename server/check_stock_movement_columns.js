import { sequelize } from './db.js';

async function checkStockMovementColumns() {
  try {
    console.log('=== Checking stock_movement Table Columns ===\n');
    
    // Get all columns from the stock_movement table
    const result = await sequelize.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'stock_movement'
      ORDER BY ORDINAL_POSITION
    `, { type: sequelize.QueryTypes.SELECT });
    
    console.log('Columns in stock_movement table:\n');
    result.forEach((col, idx) => {
      console.log(`${idx + 1}. ${col.COLUMN_NAME}  (${col.DATA_TYPE})  ${col.IS_NULLABLE === 'YES' ? 'NULLABLE' : 'NOT NULL'}`);
    });
    
    // Check for duplicate movement type columns
    const movementCols = result.filter(col => 
      col.COLUMN_NAME.toLowerCase().includes('movement') && 
      col.COLUMN_NAME.toLowerCase().includes('type')
    );
    
    console.log('\n=== Potential Movement Type Columns ===');
    movementCols.forEach(col => {
      console.log(`- ${col.COLUMN_NAME}`);
    });
    
    if (movementCols.length > 1) {
      console.log('\n⚠️  FOUND DUPLICATE COLUMNS!');
      console.log('These should be consolidated into ONE column');
    }
    
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}

checkStockMovementColumns();
