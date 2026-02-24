import { sequelize } from '../db.js';

(async () => {
  try {
    console.log('=== spare_parts sample ===');
    const sp = await sequelize.query(
      'SELECT TOP 2 * FROM spare_parts WHERE PART IS NOT NULL',
      { type: sequelize.QueryTypes.SELECT }
    );
    if (sp.length > 0) {
      console.log('Columns:', Object.keys(sp[0]));
      sp.forEach((row, i) => {
        console.log(`\nRow ${i + 1}:`, JSON.stringify(row, null, 2));
      });
    }
    
    console.log('\n=== model_master sample ===');
    const mm = await sequelize.query(
      'SELECT TOP 2 * FROM model_master',
      { type: sequelize.QueryTypes.SELECT }
    );
    if (mm.length > 0) {
      console.log('Columns:', Object.keys(mm[0]));
      console.log('Sample:', mm[0]);
    }

    console.log('\n=== Looking for ProductModelId (spare_parts uses this) ===');
    const pmi = await sequelize.query(
      'SELECT TOP 3 ProductModelId, PART, MODEL_DESCRIPTION FROM spare_parts WHERE ProductModelId IS NOT NULL',
      { type: sequelize.QueryTypes.SELECT }
    );
    if (pmi.length > 0) {
      console.log('sparse_parts with ProductModelId:', pmi);
    }
  } catch (e) {
    console.error('Error:', e.message);
  }
  process.exit(0);
})();
