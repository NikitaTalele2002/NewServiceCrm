import { ProductModel, SparePart } from './models/index.js';

async function testAssociations() {
  try {
    console.log('Testing Sequelize associations...\n');

    // Test Model 17
    console.log('Testing Model 17:');
    const model17 = await ProductModel.findByPk(17, {
      include: [
        {
          model: SparePart,
          as: 'spareParts',
          attributes: ['Id', 'PART', 'BRAND']
        }
      ]
    });

    if (model17) {
      console.log(`  - Model 17 found: ${model17.MODEL_CODE}`);
      console.log(`  - Associated spare parts: ${model17.spareParts ? model17.spareParts.length : 0}`);
      if (model17.spareParts && model17.spareParts.length > 0) {
        model17.spareParts.slice(0, 3).forEach(sp => {
          console.log(`    • ${sp.PART} (${sp.BRAND})`);
        });
      }
    } else {
      console.log('  ❌ Model 17 not found!');
    }

    // Test Model 20
    console.log('\nTesting Model 20:');
    const model20 = await ProductModel.findByPk(20, {
      include: [
        {
          model: SparePart,
          as: 'spareParts',
          attributes: ['Id', 'PART', 'BRAND']
        }
      ]
    });

    if (model20) {
      console.log(`  - Model 20 found: ${model20.MODEL_CODE}`);
      console.log(`  - Associated spare parts: ${model20.spareParts ? model20.spareParts.length : 0}`);
      if (model20.spareParts && model20.spareParts.length > 0) {
        model20.spareParts.slice(0, 3).forEach(sp => {
          console.log(`    • ${sp.PART} (${sp.BRAND})`);
        });
      }
    } else {
      console.log('  ❌ Model 20 not found!');
    }

    console.log('\n✅ Association test complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testAssociations();
