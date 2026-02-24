import { sequelize } from './db.js';

async function checkSparePartsStructure() {
  try {
    console.log('Checking spare parts table structure...\n');

    // Get sample spare parts with all fields
    const spareParts = await sequelize.query(
      `SELECT TOP 5 
        Id, PART, BRAND, ModelID, ProductModelId, 
        MAPPED_MODEL, MODEL_DESCRIPTION, STATUS
       FROM spare_parts
       ORDER BY Id`,
      { type: sequelize.QueryTypes.SELECT }
    );

    console.log('Sample Spare Parts:\n');
    spareParts.forEach((sp, idx) => {
      console.log(`${idx + 1}. ${sp.PART}`);
      console.log(`   Id: ${sp.Id}`);
      console.log(`   ModelID: ${sp.ModelID}`);
      console.log(`   ProductModelId: ${sp.ProductModelId}`);
      console.log(`   MAPPED_MODEL: ${sp.MAPPED_MODEL}`);
      console.log('');
    });

    // Check ProductModels
    console.log('\n\nSample ProductModels:\n');
    const models = await sequelize.query(
      `SELECT TOP 5 Id, MODEL_CODE, ProductID FROM ProductModels ORDER BY Id`,
      { type: sequelize.QueryTypes.SELECT }
    );

    models.forEach((m, idx) => {
      console.log(`${idx + 1}. ${m.MODEL_CODE} (Id: ${m.Id})`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

checkSparePartsStructure();
