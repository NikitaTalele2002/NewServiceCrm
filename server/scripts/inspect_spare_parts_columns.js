import { sequelize, connectDB } from '../db.js';
import('../models/index.js');

async function run() {
  try {
    await connectDB();
    const sql = `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'spare_parts' ORDER BY ORDINAL_POSITION`;
    const rows = await sequelize.query(sql, { type: sequelize.QueryTypes.SELECT });
    console.log('spare_parts columns:', rows.map(r => r.COLUMN_NAME));
  } catch (err) {
    console.error('Inspect error:', err && err.message ? err.message : err);
    if (err && err.stack) console.error(err.stack);
  }
}

run();
