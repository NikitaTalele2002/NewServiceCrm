import { sequelize } from './db.js';

async function verifyModelIDColumn() {
  try {
    console.log('Verifying spare_parts table structure...\n');

    const columns = await sequelize.query(
      `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_NAME = 'spare_parts' 
       ORDER BY ORDINAL_POSITION`,
      { type: sequelize.QueryTypes.SELECT }
    );

    console.log('spare_parts table columns:');
    columns.forEach(col => {
      const nullable = col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL';
      console.log(`  ✓ ${col.COLUMN_NAME} (${col.DATA_TYPE}, ${nullable})`);
    });

    // Check if ProductModelId still exists
    const hasProductModelId = columns.some(c => c.COLUMN_NAME === 'ProductModelId');
    const hasModelID = columns.some(c => c.COLUMN_NAME === 'ModelID');

    console.log('\n✅ Column Status:');
    console.log(`  - ModelID column exists: ${hasModelID ? '✅ YES' : '❌ NO'}`);
    console.log(`  - ProductModelId column exists: ${hasProductModelId ? '❌ YES (SHOULD BE DROPPED!)' : '✅ NO (correctly dropped)'}`);

    // Get some sample data
    const sampleData = await sequelize.query(
      `SELECT TOP 5 Id, PART, ModelID FROM spare_parts WHERE ModelID IS NOT NULL`,
      { type: sequelize.QueryTypes.SELECT }
    );

    if (sampleData.length > 0) {
      console.log('\n✅ Sample spare parts with ModelID:');
      sampleData.forEach(row => {
        console.log(`  - Id: ${row.Id}, PART: ${row.PART}, ModelID: ${row.ModelID}`);
      });
    }

    console.log('\n✅ Verification complete!');
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verifyModelIDColumn();
