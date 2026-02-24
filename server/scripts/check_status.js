import { sequelize, Status } from '../models/index.js';

async function run() {
  try {
    const statuses = await Status.findAll({
      attributes: ['status_id', 'status_name'],
      limit: 10,
    });

    if (statuses.length === 0) {
      console.log('❌ No statuses found in Status table');
      process.exit(1);
    }

    console.log('\n✓ Available statuses:');
    statuses.forEach(s => {
      console.log(`  - status_id: ${s.status_id}, name: ${s.status_name}`);
    });

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

run();
