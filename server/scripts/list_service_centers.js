import { sequelize, ServiceCenter } from '../models/index.js';

/**
 * List all service centers to help you choose which one to assign pincodes to
 */
async function run() {
  try {
    await sequelize.authenticate();
    console.log('\n=== All Service Centers ===\n');

    const centers = await ServiceCenter.findAll({
      attributes: ['asc_id', 'asc_code', 'asc_name', 'user_id'],
      limit: 20,
    });

    if (centers.length === 0) {
      console.log('❌ No service centers found. Create one first.');
      process.exit(0);
    }

    console.log('Service Centers in database:');
    centers.forEach(sc => {
      console.log(`  asc_id: ${sc.asc_id}`);
      console.log(`  asc_code: ${sc.asc_code}`);
      console.log(`  asc_name: ${sc.asc_name}`);
      console.log(`  user_id: ${sc.user_id}`);
      console.log('---');
    });

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

run();
