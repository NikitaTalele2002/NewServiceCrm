import { sequelize } from './db.js';

async function dropProductModelIdColumn() {
  try {
    console.log('Dropping ProductModelId column from spare_parts table...\n');

    // First, check if the column exists
    const describeTable = await sequelize.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_NAME = 'spare_parts' AND COLUMN_NAME = 'ProductModelId'`,
      { type: sequelize.QueryTypes.SELECT }
    );

    if (describeTable.length === 0) {
      console.log('✅ ProductModelId column does not exist (already dropped or never existed)');
    } else {
      console.log('Found ProductModelId column...');
      console.log('Checking for foreign key constraints...');

      // First, drop any foreign key constraints on the ProductModelId column
      const fkConstraints = await sequelize.query(
        `SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
         WHERE TABLE_NAME = 'spare_parts' AND COLUMN_NAME = 'ProductModelId'
         AND CONSTRAINT_NAME NOT LIKE 'PK_%'`,
        { type: sequelize.QueryTypes.SELECT }
      );

      if (fkConstraints.length > 0) {
        for (const fk of fkConstraints) {
          console.log(`Dropping foreign key constraint: ${fk.CONSTRAINT_NAME}`);
          await sequelize.query(
            `ALTER TABLE spare_parts DROP CONSTRAINT ${fk.CONSTRAINT_NAME}`
          );
        }
      }

      console.log('Dropping ProductModelId column...');
      
      // Drop the column
      await sequelize.query(
        `ALTER TABLE spare_parts DROP COLUMN ProductModelId`
      );

      console.log('✅ ProductModelId column dropped successfully!\n');
    }

    // Verify ModelID is present and has foreign key constraint
    console.log('Verifying ModelID column configuration...');
    
    const modelIDColumn = await sequelize.query(
      `SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_NAME = 'spare_parts' AND COLUMN_NAME = 'ModelID'`,
      { type: sequelize.QueryTypes.SELECT }
    );

    if (modelIDColumn.length > 0) {
      const col = modelIDColumn[0];
      console.log(`✅ ModelID column exists`);
      console.log(`   Type: ${col.DATA_TYPE}`);
      console.log(`   Nullable: ${col.IS_NULLABLE === 'YES' ? 'Yes' : 'No'}\n`);
    }

    // Show current table structure
    console.log('Current spare_parts table columns:');
    const columns = await sequelize.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_NAME = 'spare_parts' 
       ORDER BY ORDINAL_POSITION`,
      { type: sequelize.QueryTypes.SELECT }
    );

    columns.forEach((col, idx) => {
      console.log(`  ${idx + 1}. ${col.COLUMN_NAME}`);
    });

    console.log('\n✅ Migration complete! ProductModelId column removed.');
    console.log('   Going forward, all code will use ModelID for ProductModel relationships.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

dropProductModelIdColumn();
