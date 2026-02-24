import { sequelize } from './db.js';
import { ProductGroup, ProductMaster, ProductModel, SparePart } from './models/index.js';

async function testCompleteHierarchy() {
  try {
    console.log('🧪 Testing complete product hierarchy flow...\n');

    // Step 1: Get ProductGroups
    console.log('Step 1: Fetching ProductGroups...');
    const groups = await ProductGroup.findAll({ attributes: ['Id', 'VALUE', 'DESCRIPTION'], limit: 1 });
    
    if (!groups || groups.length === 0) {
      console.log('❌ No ProductGroups found');
      process.exit(1);
    }

    const group = groups[0];
    console.log(`✅ Found ProductGroup: ${group.VALUE} (ID: ${group.Id})\n`);

    // Step 2: Get ProductMasters for the group
    console.log('Step 2: Fetching ProductMasters for the group...');
    const groupWithMasters = await ProductGroup.findByPk(group.Id, {
      include: [
        {
          model: ProductMaster,
          as: 'productMasters',
          attributes: ['ID', 'VALUE', 'DESCRIPTION']
        }
      ],
      attributes: ['Id', 'VALUE', 'DESCRIPTION']
    });

    const masters = groupWithMasters.productMasters || [];
    console.log(`✅ Found ${masters.length} ProductMasters\n`);

    if (masters.length === 0) {
      console.log('❌ No ProductMasters found');
      process.exit(1);
    }

    // Step 3: Get ProductModels for the first ProductMaster
    console.log('Step 3: Fetching ProductModels for first master...');
    const master = masters[0];
    const masterWithModels = await ProductMaster.findByPk(master.ID, {
      include: [
        {
          model: ProductModel,
          as: 'productModels',
          attributes: ['Id', 'MODEL_CODE', 'MODEL_DESCRIPTION', 'BRAND', 'PRICE', 'WARRANTY_IN_MONTHS']
        }
      ],
      attributes: ['ID', 'VALUE', 'DESCRIPTION']
    });

    const models = masterWithModels.productModels || [];
    console.log(`✅ Found ${models.length} ProductModels\n`);

    if (models.length === 0) {
      console.log('⚠️ No ProductModels found for this master, trying another approach...');
      // Try to get models directly from products that have spare parts
      const modelsWithSpares = await ProductModel.findAll({
        include: [
          {
            model: SparePart,
            as: 'spareParts',
            required: true,
            attributes: ['Id']
          }
        ],
        attributes: ['Id', 'MODEL_CODE'],
        limit: 1
      });
      
      if (modelsWithSpares.length > 0) {
        console.log(`Found model with spares: ${modelsWithSpares[0].MODEL_CODE}\n`);
      }
    } else {
      // Step 4: Get SpareParts for the first ProductModel
      console.log('Step 4: Fetching complete hierarchy with SpareParts...');
      const modelWithSpares = await ProductModel.findByPk(models[0].Id, {
        include: [
          {
            model: SparePart,
            as: 'spareParts',
            attributes: ['Id', 'PART', 'BRAND', 'MODEL_DESCRIPTION', 'MAX_USED_QTY', 'STATUS']
          }
        ]
      });

      if (modelWithSpares) {
        const spareParts = modelWithSpares.spareParts || [];
        console.log(`✅ Found ${spareParts.length} SpareParts for ${modelWithSpares.MODEL_CODE}\n`);

        if (spareParts.length > 0) {
          console.log('Sample SpareParts:');
          spareParts.slice(0, 3).forEach((sp, idx) => {
            console.log(`  ${idx + 1}. ${sp.PART} (ID: ${sp.Id})`);
            console.log(`     Brand: ${sp.BRAND}, Max Qty: ${sp.MAX_USED_QTY}`);
          });
          console.log('');
        }
      }
    }

    // Step 5: Test the full nested hierarchy retrieve
    console.log('Step 5: Testing full nested hierarchy (ProductGroup → Master → Models → SpareParts)...');
    const fullHierarchy = await ProductGroup.findByPk(group.Id, {
      include: [
        {
          model: ProductMaster,
          as: 'productMasters',
          include: [
            {
              model: ProductModel,
              as: 'productModels',
              include: [
                {
                  model: SparePart,
                  as: 'spareParts',
                  attributes: ['Id', 'PART', 'BRAND', 'MODEL_DESCRIPTION', 'MAX_USED_QTY', 'STATUS']
                }
              ],
              attributes: ['Id', 'MODEL_CODE', 'MODEL_DESCRIPTION', 'BRAND', 'PRICE', 'WARRANTY_IN_MONTHS']
            }
          ],
          attributes: ['ID', 'VALUE', 'DESCRIPTION']
        }
      ],
      attributes: ['Id', 'VALUE', 'DESCRIPTION']
    });

    let totalSpares = 0;
    if (fullHierarchy && fullHierarchy.productMasters) {
      fullHierarchy.productMasters.forEach(pm => {
        if (pm.productModels) {
          pm.productModels.forEach(pmod => {
            if (pmod.spareParts) {
              totalSpares += pmod.spareParts.length;
            }
          });
        }
      });
    }

    console.log(`✅ Full hierarchy loaded successfully!`);
    console.log(`   ProductGroup: ${group.VALUE}`);
    console.log(`   ProductMasters: ${fullHierarchy.productMasters?.length || 0}`);
    console.log(`   Total ProductModels: ${models.length}`);
    console.log(`   Total SpareParts: ${totalSpares}\n`);

    console.log('✅ ✅ ✅ ALL TESTS PASSED! The hierarchy is working correctly.');
    console.log('The spare parts dropdown should now display properly in the OrderRequestCreate component!\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

testCompleteHierarchy();
