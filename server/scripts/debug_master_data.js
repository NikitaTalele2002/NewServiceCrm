import { sequelize } from '../db.js';

(async () => {
  try {
    console.log('\n=== Product Groups ===');
    const pg = await sequelize.query(
      'SELECT TOP 5 * FROM product_groups',
      { type: sequelize.QueryTypes.SELECT }
    );
    if (pg.length > 0) {
      console.log('Columns:', Object.keys(pg[0]));
      console.log(pg.map(p => ({ Id: p.Id, NAME: p.NAME })));
    }

    console.log('\n=== Product Master ===');
    const pm = await sequelize.query(
      'SELECT TOP 3 * FROM product_master',
      { type: sequelize.QueryTypes.SELECT }
    );
    if (pm.length > 0) {
      console.log('Columns:', Object.keys(pm[0]));
      console.log(pm[0]);
    }

    console.log('\n=== Models Master ===');
    const mm = await sequelize.query(
      'SELECT TOP 3 * FROM model_master',
      { type: sequelize.QueryTypes.SELECT }
    );
    if (mm.length > 0) {
      console.log('Columns:', Object.keys(mm[0]));
      console.log(mm[0]);
    }
  } catch (e) {
    console.error('Error:', e.message);
  }
  process.exit(0);
})();
