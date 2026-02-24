/**
 * Schedule Database Cleanup
 * 
 * NOTE: The movement_type column in stock_movement table can be manually dropped 
 * or dropped via direct SQL when the database is in a better state.
 * 
 * For now, the code has been updated to:
 * 1. NOT write to movement_type column
 * 2. ONLY write to stock_movement_type column
 * 3. Read only from stock_movement_type
 * 
 * SQL to run manually when ready:
 * ================================
 * ALTER TABLE stock_movement DROP COLUMN movement_type;
 * 
 * This removes the old duplicate column.
 */

import { sequelize } from './db.js';

async function scheduledCleanup() {
  try {
    console.log('=== Stock Movement Column Duplication Cleanup ===\n');
    
    console.log('STATUS: Code has been updated to use only stock_movement_type\n');
    
    // Check current usage
    const result = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'stock_movement' 
      AND COLUMN_NAME LIKE '%movement%type%'
      ORDER BY COLUMN_NAME
    `, { type: sequelize.QueryTypes.SELECT });

    console.log('Movement Type Columns in Database:');
    result.forEach((col, idx) => {
      const status = col.COLUMN_NAME === 'stock_movement_type' ? '✅ ACTIVE' : '⚠️  OLD';
      console.log(`${idx + 1}. ${col.COLUMN_NAME}  ${status}`);
    });

    console.log('\n=== NEXT STEPS ===');
    console.log('\n1. Code Updates (COMPLETED):');
    console.log('   ✅ server/routes/sparePartReturns.js - Updated to use stock_movement_type');
    console.log('   ✅ server/routes/logistics.js - Updated to use stock_movement_type');
    console.log('   ✅ StockMovement model - Already has stock_movement_type defined');

    console.log('\n2. Database Cleanup (PENDING):');
    console.log('   Run this SQL command when ready:');
    console.log('   > ALTER TABLE stock_movement DROP COLUMN movement_type;');

    console.log('\n3. Verification:');
    console.log('   After running the SQL, only stock_movement_type column will exist');
    console.log('   All new stock movements will use detailed types like:');
    console.log('   - FILLUP_DISPATCH');
    console.log('   - ASC_RETURN_DEFECTIVE_OUT');
    console.log('   - TECH_ISSUE_OUT, etc.');

    console.log('\n✅ Code side is ready. Database cleanup can be done anytime.');

    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}

scheduledCleanup();
