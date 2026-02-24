import { sequelize } from './db.js';

async function checkSchema() {
  try {
    console.log('🔍 Checking Technicians table schema\n');

    // Get table information
    const columns = await sequelize.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'Technicians'
      ORDER BY ORDINAL_POSITION
    `, { type: sequelize.QueryTypes.SELECT });

    console.log(`✅ Technicians table columns:\n`);
    columns.forEach(col => {
      console.log(`   ${col.COLUMN_NAME} (${col.DATA_TYPE}, Nullable: ${col.IS_NULLABLE})`);
    });

    // Check service center column names
    console.log(`\n🔍 Checking ServiceCenter table schema\n`);
    const scColumns = await sequelize.query(`
      SELECT COLUMN_NAME, DATA_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'ServiceCenter'
      ORDER BY ORDINAL_POSITION
    `, { type: sequelize.QueryTypes.SELECT });

    console.log(`✅ ServiceCenter table columns:\n`);
    scColumns.forEach(col => {
      console.log(`   ${col.COLUMN_NAME} (${col.DATA_TYPE})`);
    });

    await sequelize.close();
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error('Stack:', err.stack);
    process.exit(1);
  }
}

checkSchema();
