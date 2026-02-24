import { sequelize, connectDB } from '../db.js';
// ensure models loaded
import('../models/index.js');

async function run() {
  try {
    await connectDB();
    const locationType = 'service_center';
    const locationIds = [4];

    let sql = `
      SELECT si.spare_inventory_id AS Id,
             si.spare_id AS spare_id,
             ISNULL(sp.PART, '') AS SpareName,
             CONVERT(varchar(50), sp.Id) AS Sku,
             si.qty_good AS GoodQty,
             si.qty_defective AS DefectiveQty
      FROM spare_inventory si
      LEFT JOIN spare_parts sp ON sp.Id = si.spare_id
      WHERE si.location_type = ? 
    `;

    const replacements = [locationType];
    if (locationIds.length === 1) {
      sql += ' AND si.location_id = ? ';
      replacements.push(locationIds[0]);
    } else {
      const placeholders = locationIds.map(() => '?').join(',');
      sql += ` AND si.location_id IN (${placeholders}) `;
      replacements.push(...locationIds);
    }

    sql += ' ORDER BY SpareName ';

    console.log('SQL:', sql);
    console.log('Replacements:', replacements);

    const rows = await sequelize.query(sql, { replacements, type: sequelize.QueryTypes.SELECT });
    console.log('Rows:', rows.length);
    console.dir(rows, { depth: 2 });
  } catch (err) {
    console.error('Debug query error:', err);
    if (err && err.stack) console.error(err.stack);
  }
}

run();
