import { sequelize } from './db.js';
import { QueryTypes } from 'sequelize';

try {
  console.log('\n' + '='.repeat(80));
  console.log('🛠️  ADDING MISSING STATUSES TO DATABASE');
  console.log('='.repeat(80));

  // Check which statuses already exist
  const existing = await sequelize.query(`
    SELECT status_name FROM [status]
  `, { type: QueryTypes.SELECT });

  const existingNames = new Set(existing.map(s => s.status_name.toLowerCase()));

  // Statuses to add
  const statusesToAdd = [
    { name: 'approved', description: 'Request approved by service center' },
    { name: 'rejected', description: 'Request rejected' },
    { name: 'completed', description: 'Task completed' }
  ];

  console.log('\n📝 Adding missing statuses...\n');
  
  for (const status of statusesToAdd) {
    if (!existingNames.has(status.name.toLowerCase())) {
      console.log(`Adding: "${status.name}"...`);
      try {
        await sequelize.query(`
          INSERT INTO [status] (status_name)
          VALUES (?)
        `, { replacements: [status.name], type: QueryTypes.INSERT });
        console.log(`  ✅ Added "${status.name}"`);
      } catch (e) {
        console.log(`  ⚠️  "${status.name}" might already exist`);
      }
    } else {
      console.log(`✅ "${status.name}" already exists`);
    }
  }

  // Verify all statuses are now present
  console.log('\n🔍 Verifying all statuses...\n');
  const allStatuses = await sequelize.query(`
    SELECT status_id, status_name FROM [status] ORDER BY status_id
  `, { type: QueryTypes.SELECT });

  console.log('Final Status Table:');
  allStatuses.forEach(s => {
    console.log(`  ID ${s.status_id}: "${s.status_name}"`);
  });

  process.exit(0);
} catch (e) {
  console.error('❌ Error:', e.message);
  process.exit(1);
}
