import { sequelize } from '../db.js';
import { City } from '../models/index.js';

const run = async () => {
  try {
    await sequelize.authenticate();
    console.log('DB connected');
    const rows = await City.findAll({ limit: 20, order: [['Id', 'DESC']] });
    console.log('Cities count fetched:', rows.length);
    for (const r of rows) console.log(r.toJSON());
  } catch (err) {
    console.error('Error fetching cities:', err && err.message ? err.message : err);
  } finally {
    await sequelize.close();
  }
};

run();
