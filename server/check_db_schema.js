import sequelize from './database/connection.js';

async function main() {
  const tables = ['ProductModels', 'spare_parts', 'ProductMaster'];
  const sql = `
    SELECT TABLE_NAME, COLUMN_NAME, IS_NULLABLE, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME IN (${tables.map(t => `'${t}'`).join(',')})
    ORDER BY TABLE_NAME, ORDINAL_POSITION;
  `;

  try {
    const [results] = await sequelize.query(sql, { raw: true });
    console.log('DB schema for target tables:');
    console.log(JSON.stringify(results, null, 2));
  } catch (err) {
    console.error('Error querying DB schema:', err);
    process.exitCode = 2;
  } finally {
    try { await sequelize.close(); } catch (e) {}
  }
}

main();
