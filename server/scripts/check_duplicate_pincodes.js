import { sequelize } from '../models/index.js';

async function run() {
  try {
    console.log('\n=== Checking for Duplicate Pincodes ===\n');

    const result = await sequelize.query(`
      SELECT VALUE, COUNT(*) as count
      FROM Pincodes
      GROUP BY VALUE
      HAVING COUNT(*) > 1
      ORDER BY count DESC
    `);

    if (result[0].length === 0) {
      console.log('✓ No duplicate pincodes found');
      process.exit(0);
    }

    console.log(`⚠️  Found ${result[0].length} duplicate pincode(s):\n`);
    result[0].forEach(row => {
      console.log(`  ${row.VALUE}: ${row.count} times`);
    });

    console.log('\nRun the following to remove duplicates:');
    console.log('node scripts\\remove_duplicate_pincodes.js');

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

run();
