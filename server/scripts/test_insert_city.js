import { sequelize } from '../db.js';
import { City } from '../models/index.js';

const run = async () => {
  try {
    await sequelize.authenticate();
    console.log('DB connected for test');
    const sample = { Value: 'TEST_CITY_AI', Description: 'Test city from script', StateId: null, StateName: 'TEST' };
    const created = await City.create(sample);
    console.log('Created city:', created && created.toJSON ? created.toJSON() : created);
    const found = await City.findAll({ where: { Value: 'TEST_CITY_AI' } });
    console.log('Found rows count:', found.length);
    for (const r of found) console.log(r.toJSON());
  } catch (err) {
    console.error('Test insert error:', err && err.message ? err.message : err);
  } finally {
    await sequelize.close();
    console.log('DB connection closed');
  }
};

run();


