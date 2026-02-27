import { sequelize } from './db.js';

async function checkTables() {
  try {
    const [tableNames] = await sequelize.query(`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE='BASE TABLE' AND TABLE_NAME LIKE '%spare%'
      ORDER BY TABLE_NAME
    `);
    
    console.log('\n=== SPARE-RELATED TABLES ===\n');
    tableNames.forEach(row => {
      console.log(' -', row.TABLE_NAME);
    });
    
    // Also check for customer/call tables
    const [callTables] = await sequelize.query(`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE='BASE TABLE' AND (TABLE_NAME LIKE '%call%' OR TABLE_NAME LIKE '%complaint%')
      ORDER BY TABLE_NAME
    `);
    
    console.log('\n=== CALL/COMPLAINT TABLES ===\n');
    callTables.forEach(row => {
      console.log(' -', row.TABLE_NAME);
    });
    
    // Check for service center tables
    const [scTables] = await sequelize.query(`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE='BASE TABLE' AND (TABLE_NAME LIKE '%service%' OR TABLE_NAME LIKE '%center%' OR TABLE_NAME LIKE '%asc%')
      ORDER BY TABLE_NAME
    `);
    
    console.log('\n=== SERVICE CENTER TABLES ===\n');
    scTables.forEach(row => {
      console.log(' -', row.TABLE_NAME);
    });
    
    process.exit(0);
  } catch(e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}

checkTables();
