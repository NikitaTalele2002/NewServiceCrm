import { sequelize } from './db.js';

async function addModelIDForeignKey() {
  try {
    console.log('Adding foreign key constraint to ModelID column...\n');

    // Check if the foreign key already exists
    const existingFK = await sequelize.query(
      `SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
       WHERE TABLE_NAME = 'spare_parts' 
       AND COLUMN_NAME = 'ModelID'
       AND CONSTRAINT_NAME LIKE 'FK_%'`,
      { type: sequelize.QueryTypes.SELECT }
    );

    if (existingFK.length > 0) {
      console.log(`ℹ️ Foreign key already exists: ${existingFK[0].CONSTRAINT_NAME}`);
      console.log('✅ No action needed.\n');
    } else {
      console.log('Creating foreign key constraint on ModelID...');
      
      // Add the foreign key constraint
      await sequelize.query(
        `ALTER TABLE spare_parts
         ADD CONSTRAINT FK_spare_parts_ProductModels
         FOREIGN KEY (ModelID) REFERENCES ProductModels(Id)
         ON UPDATE CASCADE
         ON DELETE SET NULL`
      );

      console.log('✅ Foreign key constraint created successfully!\n');
    }

    // Verify the foreign key was created
    console.log('Verifying foreign key constraint...');
    const fkInfo = await sequelize.query(
      `SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
       WHERE TABLE_NAME = 'spare_parts' AND COLUMN_NAME = 'ModelID'
       AND CONSTRAINT_NAME LIKE 'FK_%'`,
      { type: sequelize.QueryTypes.SELECT }
    );

    if (fkInfo.length > 0) {
      console.log(`✅ Foreign Key Details:`);
      console.log(`   Constraint Name: ${fkInfo[0].CONSTRAINT_NAME}`);
      console.log(`   Table: spare_parts`);
      console.log(`   Column: ModelID`);
      console.log(`   References: ProductModels(Id)\n`);
    }

    // Show current spare_parts structure with constraints
    console.log('Current spare_parts table constraints:');
    const constraints = await sequelize.query(
      `SELECT 
         CONSTRAINT_NAME,
         CONSTRAINT_TYPE
       FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
       WHERE TABLE_NAME = 'spare_parts'
       ORDER BY CONSTRAINT_TYPE`,
      { type: sequelize.QueryTypes.SELECT }
    );

    constraints.forEach(c => {
      console.log(`  - ${c.CONSTRAINT_NAME} (${c.CONSTRAINT_TYPE})`);
    });

    console.log('\n✅ Foreign key addition complete!');
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

addModelIDForeignKey();
