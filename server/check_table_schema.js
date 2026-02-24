import { sequelize } from './db.js';

async function getTableSchema() {
  try {
    console.log('Checking table schemas...\n');

    // Check States table
    console.log('States table columns:');
    const statesColumns = await sequelize.query(
      `SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_NAME = 'States' 
       ORDER BY ORDINAL_POSITION`,
      { type: sequelize.QueryTypes.SELECT }
    );
    
    statesColumns.forEach(c => {
      console.log(`  - ${c.COLUMN_NAME} (${c.DATA_TYPE})`);
    });

    // Check users table
    console.log('\nusers table columns:');
    const usersColumns = await sequelize.query(
      `SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_NAME = 'users' 
       ORDER BY ORDINAL_POSITION`,
      { type: sequelize.QueryTypes.SELECT }
    );
    
    usersColumns.forEach(c => {
      console.log(`  - ${c.COLUMN_NAME} (${c.DATA_TYPE})`);
    });

    // Check rsms table
    console.log('\nrsms table columns:');
    const rsmsColumns = await sequelize.query(
      `SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_NAME = 'rsms' 
       ORDER BY ORDINAL_POSITION`,
      { type: sequelize.QueryTypes.SELECT }
    );
    
    rsmsColumns.forEach(c => {
      console.log(`  - ${c.COLUMN_NAME} (${c.DATA_TYPE})`);
    });

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await sequelize.close();
    process.exit(1);
  }
}

getTableSchema();
