import { sequelize } from './db.js';

async function main() {
  try {
    await sequelize.authenticate();
    
    // Check sub_status columns
    const subStatusCols = await sequelize.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'sub_status'
      ORDER BY ORDINAL_POSITION
    `, { raw: true });
    
    console.log('\n═══ sub_status TABLE STRUCTURE ═══');
    console.log(JSON.stringify(subStatusCols[0], null, 2));
    
    // Check status columns too
    const statusCols = await sequelize.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'status'
      ORDER BY ORDINAL_POSITION
    `, { raw: true });
    
    console.log('\n═══ status TABLE STRUCTURE ═══');
    console.log(JSON.stringify(statusCols[0], null, 2));

    await sequelize.close();
  } catch (err) {
    console.error('Error:', err.message);
  }
}

main();
