import { sequelize } from './db.js';
import { ProductModel, SparePart } from './models/index.js';

async function testSparePartsEndpoint() {
  try {
    console.log('Testing SpareParts endpoint...\n');

    // Get first ProductModel
    const models = await ProductModel.findAll({ limit: 1 });
    
    if (!models || models.length === 0) {
      console.log('❌ No ProductModels found in database');
      process.exit(1);
    }

    const model = models[0];
    console.log(`Found ProductModel: ${model.MODEL_CODE} (ID: ${model.Id})`);

    // Fetch SpareParts for this model
    console.log(`\nFetching SpareParts for model ID ${model.Id}...`);
    
    const spareParts = await ProductModel.findByPk(model.Id, {
      include: [
        {
          model: SparePart,
          as: 'spareParts',
          attributes: ['Id', 'PART', 'DESCRIPTION', 'BRAND', 'MODEL_DESCRIPTION', 'MAX_USED_QTY', 'SERVICE_LEVEL', 'STATUS']
        }
      ]
    });

    if (spareParts && spareParts.spareParts && spareParts.spareParts.length > 0) {
      console.log(`✅ Found ${spareParts.spareParts.length} spare parts:\n`);
      spareParts.spareParts.forEach((sp, idx) => {
        console.log(`${idx + 1}. ${sp.PART} (ID: ${sp.Id})`);
        console.log(`   Brand: ${sp.BRAND}, Max Used Qty: ${sp.MAX_USED_QTY}`);
      });
    } else {
      console.log('⚠️ No spare parts found for this model');
      
      // Try to find any spare part in the database
      console.log('\nChecking for any sparse parts in database...');
      const anySpares = await SparePart.findAll({ limit: 5 });
      console.log(`Found ${anySpares.length} spare parts total in database`);
      
      if (anySpares.length > 0) {
        console.log('\nSample spare parts:');
        anySpares.forEach(sp => {
          console.log(`  - ${sp.PART} (ProductModelId: ${sp.ProductModelId})`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

testSparePartsEndpoint();
