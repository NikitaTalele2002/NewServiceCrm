import { sequelize } from './db.js';

async function verifyDatabase() {
  try {
    console.log('\n=== COMPREHENSIVE DATABASE VERIFICATION ===\n');
    
    // Count all tables
    const tableQuery = `
      SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'dbo' AND TABLE_TYPE = 'BASE TABLE'
    `;
    
    const tableResult = await sequelize.query(tableQuery, { type: 'SELECT' });
    const tableCount = tableResult[0].count;
    console.log(`✓ Total tables in database: ${tableCount}`);
    
    if (tableCount === 54) {
      console.log('✓✓✓ ALL 54 TABLES CREATED SUCCESSFULLY!');
    } else {
      console.warn(`⚠ Expected 54 tables but found ${tableCount}`);
    }
    
    // Check for foreign keys 
    const fkQuery = `
      SELECT COUNT(*) as fk_count FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
      WHERE CONSTRAINT_TYPE = 'FOREIGN KEY' AND TABLE_SCHEMA = 'dbo'
    `;
    
    const fkResult = await sequelize.query(fkQuery, { type: 'SELECT' });
    console.log(`\n✓ Total foreign key constraints: ${fkResult[0].fk_count}`);
    
    // List all foreign keys
    const fkListQuery = `
      SELECT 
        CONSTRAINT_NAME,
        TABLE_NAME,
        COLUMN_NAME,
        REFERENCED_TABLE_NAME = OBJECT_NAME(REFERENCED_OBJECT_ID)
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE CONSTRAINT_TYPE = 'FOREIGN KEY' AND TABLE_SCHEMA = 'dbo'
      ORDER BY TABLE_NAME
    `;
    
    const fkList = await sequelize.query(`
      SELECT 
        tc.CONSTRAINT_NAME,
        tc.TABLE_NAME,
        kcu.COLUMN_NAME,
        ccu.TABLE_NAME AS REFERENCED_TABLE_NAME
      FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS AS tc
      JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE AS kcu
        ON tc.CONSTRAINT_NAME = kcu.CONSTRAINT_NAME
        AND tc.TABLE_SCHEMA = kcu.TABLE_SCHEMA
      JOIN INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE AS ccu
        ON ccu.CONSTRAINT_NAME = tc.CONSTRAINT_NAME
        AND ccu.TABLE_SCHEMA = tc.TABLE_SCHEMA
      WHERE tc.CONSTRAINT_TYPE = 'FOREIGN KEY'
        AND tc.TABLE_SCHEMA = 'dbo'
      ORDER BY tc.TABLE_NAME
    `, { type: 'SELECT' });
    
    console.log('\n=== FOREIGN KEYS CREATED ===\n');
    fkList.forEach((fk, index) => {
      console.log(`${index + 1}. ${fk.TABLE_NAME}.[${fk.COLUMN_NAME}] -> ${fk.REFERENCED_TABLE_NAME}`);
    });
    
    // Sample verification: check Calls table structure
    console.log('\n=== CALLS TABLE VERIFICATION ===\n');
    const callsColumns = await sequelize.query(`
      SELECT COLUMN_NAME, IS_NULLABLE, DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'calls'
      ORDER BY ORDINAL_POSITION
    `, { type: 'SELECT' });
    
    console.log(`Calls table has ${callsColumns.length} columns:`);
    callsColumns.slice(0, 15).forEach(col => {
      console.log(`  - ${col.COLUMN_NAME} (${col.DATA_TYPE})`);
    });
    if (callsColumns.length > 15) {
      console.log(`  ... and ${callsColumns.length - 15} more columns`);
    }
    
    console.log('\n=== DATABASE VERIFICATION COMPLETE ===\n');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

verifyDatabase();
