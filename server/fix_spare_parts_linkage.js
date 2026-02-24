import { sequelize } from './db.js';

async function fixSparePartsLinkage() {
  try {
    console.log('Fixing spare parts to ProductModel linkage...\n');

    // Update spare_parts: set ProductModelId = ModelID
    const result = await sequelize.query(
      `UPDATE spare_parts 
       SET ProductModelId = ModelID 
       WHERE ModelID IS NOT NULL AND ProductModelId IS NULL`,
      { type: sequelize.QueryTypes.UPDATE }
    );

    console.log('✅ Updated spare parts linkage successfully!');
    console.log(`Rows affected: ${result[1]}`);

    // Verify the update
    const spareParts = await sequelize.query(
      `SELECT TOP 10 
        Id, PART, ModelID, ProductModelId 
       FROM spare_parts 
       WHERE ProductModelId IS NOT NULL 
       ORDER BY Id`,
      { type: sequelize.QueryTypes.SELECT }
    );

    console.log('\n\nVerification - Sample updated records:\n');
    spareParts.forEach((sp, idx) => {
      console.log(`${idx + 1}. ${sp.PART}`);
      console.log(`   ModelID: ${sp.ModelID}, ProductModelId: ${sp.ProductModelId}`);
    });

    // Test the association works now
    console.log('\n\nTesting ProductModel with SpareParts...');
    
    const { ProductModel, SparePart } = await import('./models/index.js');
    
    // Reload models to ensure associations are fresh
    const model = await ProductModel.findByPk(74, {
      include: [
        {
          model: SparePart,
          as: 'spareParts'
        }
      ]
    });

    if (model) {
      console.log(`\nProductModel 74 (${model.MODEL_CODE})`);
      console.log(`Associated SpareParts: ${model.spareParts?.length || 0}`);
      
      if (model.spareParts && model.spareParts.length > 0) {
        console.log('Sample SpareParts:');
        model.spareParts.slice(0, 3).forEach(sp => {
          console.log(`  - ${sp.PART}`);
        });
      }
    }

    console.log('\n✅ All done! SpareParts are now linked to ProductModels correctly.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

fixSparePartsLinkage();
