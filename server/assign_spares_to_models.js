import { sequelize } from './db.js';

async function assignSparesToModels17and20() {
  try {
    console.log('Assigning spare parts to models 17 and 20...\n');

    // First, check if models 17 and 20 exist
    const models = await sequelize.query(
      `SELECT Id, MODEL_CODE, MODEL_DESCRIPTION FROM ProductModels WHERE Id IN (17, 20)`,
      { type: sequelize.QueryTypes.SELECT }
    );

    console.log('ProductModels found:');
    models.forEach(m => {
      console.log(`  - Model ${m.Id}: ${m.MODEL_CODE}`);
    });

    // Get all spare parts that are currently unassigned or assigned to other models
    const availableSpares = await sequelize.query(
      `SELECT TOP 30 Id, PART, BRAND FROM spare_parts ORDER BY Id`,
      { type: sequelize.QueryTypes.SELECT }
    );

    console.log(`\nFound ${availableSpares.length} available spare parts to assign\n`);

    // Assign first 15 spares to model 17 and next 15 to model 20
    let updates = 0;
    
    // Model 17 gets first 15 spares
    const spareIds17 = availableSpares.slice(0, 15).map(s => s.Id);
    if (spareIds17.length > 0) {
      await sequelize.query(
        `UPDATE spare_parts SET ModelID = 17 WHERE Id IN (${spareIds17.join(',')})`
      );
      updates += spareIds17.length;
      console.log(`✓ Assigned ${spareIds17.length} spare parts to Model 17`);
    }

    // Model 20 gets next 15 spares
    const spareIds20 = availableSpares.slice(15, 30).map(s => s.Id);
    if (spareIds20.length > 0) {
      await sequelize.query(
        `UPDATE spare_parts SET ModelID = 20 WHERE Id IN (${spareIds20.join(',')})`
      );
      updates += spareIds20.length;
      console.log(`✓ Assigned ${spareIds20.length} spare parts to Model 20`);
    }

    console.log(`\n✅ Total spare parts assigned: ${updates}\n`);

    // Verify the assignment
    console.log('Verification:');
    const verify17 = await sequelize.query(
      `SELECT COUNT(*) as count FROM spare_parts WHERE ModelID = 17`,
      { type: sequelize.QueryTypes.SELECT }
    );
    console.log(`  - Model 17: ${verify17[0].count} spare parts`);

    const verify20 = await sequelize.query(
      `SELECT COUNT(*) as count FROM spare_parts WHERE ModelID = 20`,
      { type: sequelize.QueryTypes.SELECT }
    );
    console.log(`  - Model 20: ${verify20[0].count} spare parts\n`);

    // Show sample spares for each model
    console.log('Sample spares for Model 17:');
    const spares17 = await sequelize.query(
      `SELECT TOP 5 Id, PART, BRAND FROM spare_parts WHERE ModelID = 17`,
      { type: sequelize.QueryTypes.SELECT }
    );
    spares17.forEach(s => {
      console.log(`  - ${s.PART} (${s.BRAND})`);
    });

    console.log('\nSample spares for Model 20:');
    const spares20 = await sequelize.query(
      `SELECT TOP 5 Id, PART, BRAND FROM spare_parts WHERE ModelID = 20`,
      { type: sequelize.QueryTypes.SELECT }
    );
    spares20.forEach(s => {
      console.log(`  - ${s.PART} (${s.BRAND})`);
    });

    console.log('\n✅ Assignment complete!');
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await sequelize.close();
    process.exit(1);
  }
}

assignSparesToModels17and20();
