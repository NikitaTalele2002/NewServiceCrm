import { sequelize } from './db.js';
import { QueryTypes } from 'sequelize';

try {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 CHECKING WHICH STATUS VALUES ARE MISSING');
  console.log('='.repeat(80));

  const statuses = await sequelize.query(`
    SELECT status_id, status_name FROM [status] ORDER BY status_id
  `, { type: QueryTypes.SELECT });

  const existingStatuses = new Map();
  statuses.forEach(s => {
    existingStatuses.set(s.status_name.toLowerCase(), s.status_id);
  });

  console.log('\n✅ EXISTING STATUSES:');
  statuses.forEach(s => {
    console.log(`   ID ${s.status_id}: "${s.status_name}"`);
  });

  // List of all status references found in the code
  const referencedStatuses = [
    'pending', 'open', 'closed', 'cancelled',
    'approved', 'rejected', 'allocated', 're-allocated',
    'completed', 'active'
  ];

  console.log('\n⚠️  MISSING STATUSES (referenced in code but NOT in database):');
  let hasMissing = false;
  referencedStatuses.forEach(status => {
    if (!existingStatuses.has(status.toLowerCase())) {
      console.log(`   - "${status}" ❌`);
      hasMissing = true;
    }
  });
  
  if (!hasMissing) {
    console.log('   (All referenced statuses exist!)');
  }

  console.log('\n📋 STATUS MAPPING NEEDED:');
  console.log('   approved → Use "pending" (ID 2) or create new "approved" status');
  console.log('   rejected → Need to create new "rejected" status');
  console.log('   allocated → Use "Allocated" (ID 14)');
  console.log('   re-allocated → Use "Re-Allocated" (ID 15)');

  process.exit(0);
} catch (e) {
  console.error('❌ Error:', e.message);
  process.exit(1);
}
