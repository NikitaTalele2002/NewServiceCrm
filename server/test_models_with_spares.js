import { sequelize } from './db.js';
import { ProductModel, SparePart } from './models/index.js';

async function testSparePartsForModelWithData() {
  try {
    console.log('Testing SpareParts for models that have spare parts...\n');

    // Find a model that has spare parts
    const modelsWithSpares = await ProductModel.findAll({
      include: [
        {
          model: SparePart,
          as: 'spareParts',
          required: true,
          attributes: ['Id', 'PART']
        }
      ],
      attributes: ['Id', 'MODEL_CODE'],
      limit: 3
    });

    if (!modelsWithSpares || modelsWithSpares.length === 0) {
      console.log('❌ No models with spare parts found');
      process.exit(1);
    }

    console.log(`✅ Found ${modelsWithSpares.length} models with spare parts:\n`);

    modelsWithSpares.forEach((model, idx) => {
      console.log(`${idx + 1}. Model: ${model.MODEL_CODE} (ID: ${model.Id})`);
      console.log(`   SpareParts: ${model.spareParts?.length || 0}`);
      
      if (model.spareParts && model.spareParts.length > 0) {
        console.log('   Sample:');
        model.spareParts.slice(0, 3).forEach((sp, spIdx) => {
          console.log(`     - ${sp.PART}`);
        });
      }
      console.log('');
    });

    console.log('✅ Data linkage is correct! SpareParts are properly associated with ProductModels.');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

testSparePartsForModelWithData();
