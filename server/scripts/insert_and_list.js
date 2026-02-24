import { sequelize } from '../db.js';
import { City } from '../models/index.js';

const run = async () => {
  try {
    await sequelize.authenticate();
    console.log('DB connected');
    // Try to alter Parent_I to allow NULL (may fail if lacking privileges)
    try {
      const tableName = City.getTableName();
      await sequelize.query(`ALTER TABLE ${tableName} ALTER COLUMN Parent_I INT NULL`);
      console.log('ALTER TABLE to make Parent_I NULL executed');
    } catch (alterErr) {
      console.warn('ALTER TABLE failed or not permitted:', alterErr && alterErr.message ? alterErr.message : alterErr);
    }

    const sample = { Value: 'ZZ_TEST_CITY', Description: 'Inserted for test', StateId: null, StateName: 'ZZ' };
    const created = await City.create(sample);
    console.log('Created:', created && created.toJSON ? created.toJSON() : created);
    const rows = await City.findAll({ where: { Value: 'ZZ_TEST_CITY' } });
    console.log('Found after insert:', rows.length);
    for (const r of rows) console.log(r.toJSON());
  } catch (err) {
    console.error('Insert error:', err && err.message ? err.message : err);
  } finally {
    await sequelize.close();
  }
};

run();
