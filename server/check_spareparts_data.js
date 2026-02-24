import { sequelize } from './db.js';
import { QueryTypes } from 'sequelize';

async function checkSpareParts() {
  try {
    console.log('Checking spare parts data...\n');

    // Check total spare parts
    const totalSpares = await sequelize.query(
      `SELECT COUNT(*) as total FROM spare_parts`,
      { type: QueryTypes.SELECT }
    );

    console.log(`✓ Total spare parts: ${totalSpares[0].total}`);

    // Check spare parts with ModelID values
    const withModelID = await sequelize.query(
      `SELECT COUNT(*) as total FROM spare_parts WHERE ModelID IS NOT NULL`,
      { type: QueryTypes.SELECT }
    );

    console.log(`✓ Spare parts with ModelID: ${withModelID[0].total}`);

    // Check spare parts without ModelID values
    const withoutModelID = await sequelize.query(
      `SELECT COUNT(*) as total FROM spare_parts WHERE ModelID IS NULL`,
      { type: QueryTypes.SELECT }
    );

    console.log(`✓ Spare parts without ModelID: ${withoutModelID[0].total}\n`);

    // Get sample ProductModels and their spare parts count
    console.log('Sample ProductModels and their spare parts:');
    const modelCounts = await sequelize.query(
      `SELECT TOP 10
         pm.Id,
         pm.MODEL_CODE,
         pm.MODEL_DESCRIPTION,
         COUNT(sp.Id) as spare_count
       FROM ProductModels pm
       LEFT JOIN spare_parts sp ON sp.ModelID = pm.Id
       GROUP BY pm.Id, pm.MODEL_CODE, pm.MODEL_DESCRIPTION
       ORDER BY spare_count DESC`,
      { type: QueryTypes.SELECT }
    );

    modelCounts.forEach(m => {
      console.log(`  - Model ${m.Id} (${m.MODEL_CODE}): ${m.spare_count} spares`);
    });

    // Get spare parts for specific models (17 and 20 from the error)
    console.log('\nSpare parts for model 17 and 20:');
    const sparesFor17and20 = await sequelize.query(
      `SELECT 
         sp.Id,
         sp.PART,
         sp.ModelID,
         sp.BRAND
       FROM spare_parts sp
       WHERE sp.ModelID IN (17, 20)`,
      { type: QueryTypes.SELECT }
    );

    if (sparesFor17and20.length > 0) {
      sparesFor17and20.forEach(sp => {
        console.log(`  - ${sp.PART} (ModelID: ${sp.ModelID})`);
      });
    } else {
      console.log('  ❌ No spare parts found for models 17 and 20');
    }

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await sequelize.close();
    process.exit(1);
  }
}

checkSpareParts();
