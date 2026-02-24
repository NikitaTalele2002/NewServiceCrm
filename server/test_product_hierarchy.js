import { sequelize } from './db.js';
import { ProductGroup, ProductMaster, ProductModel, SparePart } from './models/index.js';

async function testProductHierarchy() {
  try {
    console.log('Testing ProductGroup query...');
    
    const groups = await ProductGroup.findAll({
      limit: 1
    });
    
    console.log(`Found ${groups.length} product groups`);
    
    if (groups.length > 0) {
      const group = groups[0];
      console.log(`\nFirst group:`);
      console.log(`  ID: ${group.Id}`);
      console.log(`  VALUE: ${group.VALUE}`);
      console.log(`  DESCRIPTION: ${group.DESCRIPTION}`);
      
      // Try to load with nested includes
      console.log('\nTesting nested include...');
      console.log('Step 1: Including ProductMasters...');
      
      const groupWithDetails = await ProductGroup.findByPk(group.Id, {
        include: [
          {
            model: ProductMaster,
            as: 'productMasters',
            attributes: ['ID', 'VALUE', 'DESCRIPTION']
          }
        ],
        attributes: ['Id', 'VALUE', 'DESCRIPTION']
      });
      
      console.log(`✅ ProductMasters loaded: ${groupWithDetails.productMasters?.length || 0} items`);
      
      if (groupWithDetails.productMasters && groupWithDetails.productMasters.length > 0) {
        console.log('\nStep 2: Adding ProductModels...');
        
        const fullDetails = await ProductGroup.findByPk(group.Id, {
          include: [
            {
              model: ProductMaster,
              as: 'productMasters',
              include: [
                {
                  model: ProductModel,
                  as: 'productModels',
                  attributes: ['Id', 'MODEL_CODE', 'MODEL_DESCRIPTION', 'BRAND', 'PRICE', 'WARRANTY_IN_MONTHS']
                }
              ],
              attributes: ['ID', 'VALUE', 'DESCRIPTION']
            }
          ],
          attributes: ['Id', 'VALUE', 'DESCRIPTION']
        });
        
        console.log(`✅ Full hierarchy loaded`);
        console.log(`ProductMasters count: ${fullDetails.productMasters?.length || 0}`);
        
        const modelCount = fullDetails.productMasters?.reduce((sum, pm) => sum + (pm.productModels?.length || 0), 0) || 0;
        console.log(`ProductModels count: ${modelCount}`);
      }
      
    } else {
      console.log('⚠️ No product groups found in database');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

testProductHierarchy();
