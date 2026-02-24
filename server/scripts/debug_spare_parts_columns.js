import { sequelize } from '../db.js';

(async () => {
  try {
    // Get all columns in spare_parts
    const columns = await sequelize.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'spare_parts' ORDER BY COLUMN_NAME`,
      { type: sequelize.QueryTypes.SELECT }
    );
    console.log('spare_parts columns:', columns.map(c => c.COLUMN_NAME));

    // Sample query to see data
    const sample = await sequelize.query(
      `SELECT TOP 2 * FROM spare_parts`,
      { type: sequelize.QueryTypes.SELECT }
    );
    console.log('\nSample spare_parts row:');
    if (sample.length > 0) {
      console.log(Object.keys(sample[0]));
      console.log(sample[0]);
    }

    // Check product group data
    const groups = await sequelize.query(
      `SELECT DISTINCT * FROM product_groups LIMIT 3`,
      { type: sequelize.QueryTypes.SELECT }
    );
    console.log('\nProduct groups sample:');
    if (groups.length > 0) {
      console.log(Object.keys(groups[0]));
      console.log(groups[0]);
    }
  } catch (e) {
    console.error('Error:', e.message);
  }
  process.exit(0);
})();
