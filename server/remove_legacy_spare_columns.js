import sequelize from './database/connection.js';

const legacyCols = [
  'model_id',
  'uom',
  'spare_name',
  'spare_code',
  'description',
  'unit_price',
  'gst_rate',
  'is_active',
  'created_at',
  'updated_at'
];

async function colExists(col) {
  const sql = `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='spare_parts' AND COLUMN_NAME='${col}'`;
  const [rows] = await sequelize.query(sql, { raw: true });
  return rows.length > 0;
}

async function main() {
  try {
    console.log('Removing legacy columns from spare_parts (if present)...');
    for (const col of legacyCols) {
      try {
        const exists = await colExists(col);
        if (!exists) {
          console.log(`- Skipping ${col}: not present`);
          continue;
        }
        console.log(`- Dropping column ${col}...`);
        await sequelize.query(`ALTER TABLE spare_parts DROP COLUMN [${col}]`);
        console.log(`  ✓ Dropped ${col}`);
      } catch (e) {
        console.warn(`  ✗ Failed to drop ${col}:`, e && e.message ? e.message : e);
      }
    }
    console.log('Legacy column removal complete.');
  } catch (err) {
    console.error('Error during legacy column removal:', err);
    process.exitCode = 1;
  } finally {
    try { await sequelize.close(); } catch (e) {}
  }
}

main();
