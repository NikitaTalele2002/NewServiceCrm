import { sequelize } from './db.js';

async function checkModelRelationship() {
  try {
    console.log('Checking ModelID relationship...\n');

    // Get spare parts with their ModelID values
    const spareParts = await sequelize.query(
      `SELECT DISTINCT ModelID FROM spare_parts WHERE ModelID IS NOT NULL ORDER BY ModelID`,
      { type: sequelize.QueryTypes.SELECT }
    );

    console.log('ModelID values in spare_parts:');
    console.log(spareParts.map(s => s.ModelID).join(', '));

    // Check if these ModelIDs match ProductModel Ids
    const modelIds = spareParts.map(s => s.ModelID);
    if (modelIds.length > 0) {
      const matchingModels = await sequelize.query(
        `SELECT Id, MODEL_CODE FROM ProductModels WHERE Id IN (${modelIds.join(',')})`,
        { type: sequelize.QueryTypes.SELECT }
      );
      
      console.log('\n\nMatching ProductModels:');
      if (matchingModels.length > 0) {
        matchingModels.forEach(m => {
          console.log(`  - Id: ${m.Id}, MODEL_CODE: ${m.MODEL_CODE}`);
        });
      } else {
        console.log('  ❌ No ProductModels found with these Ids');
        
        // Try to find the MAPPED_MODEL in model codes
        console.log('\n\nChecking MAPPED_MODEL values...');
        const mappedModels = await sequelize.query(
          `SELECT DISTINCT MAPPED_MODEL FROM spare_parts WHERE MAPPED_MODEL IS NOT NULL LIMIT 10`,
          { type: sequelize.QueryTypes.SELECT }
        );
        
        console.log('Sample MAPPED_MODEL values:');
        mappedModels.forEach(m => {
          console.log(`  - ${m.MAPPED_MODEL}`);
        });
        
        console.log('\n\nSearching for matching ProductModels by MODEL_CODE...');
        const mappedCodes = mappedModels.map(m => m.MAPPED_MODEL);
        const codeMatches = await sequelize.query(
          `SELECT Id, MODEL_CODE FROM ProductModels WHERE MODEL_CODE IN ('${mappedCodes.join("','")}')`,
          { type: sequelize.QueryTypes.SELECT }
        );
        
        if (codeMatches.length > 0) {
          console.log('Found matches by MODEL_CODE:');
          codeMatches.forEach(m => {
            console.log(`  - Id: ${m.Id}, MODEL_CODE: ${m.MODEL_CODE}`);
          });
        } else {
          console.log('❌ No matches found by MODEL_CODE either');
        }
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

checkModelRelationship();
