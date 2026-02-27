import { sequelize } from './db.js';
import { QueryTypes } from 'sequelize';

try {
  console.log('\n' + '='.repeat(80));
  console.log('📋 CHECKING CURRENT STATUS AND SUBSTATUS DATA');
  console.log('='.repeat(80));

  // Get all statuses
  console.log('\n🔍 STATUSES:');
  const statuses = await sequelize.query(`
    SELECT status_id, status_name
    FROM [status]
    ORDER BY status_id
  `, { type: QueryTypes.SELECT });

  console.log('\nStatus Table:');
  statuses.forEach(s => {
    console.log(`  ${s.status_id}: ${s.status_name}`);
  });

  // Get all substatus
  console.log('\n🔍 SUB-STATUSES:');
  const substatus = await sequelize.query(`
    SELECT status_id, sub_status_id, sub_status_name
    FROM [sub_status]
    ORDER BY status_id, sub_status_id
  `, { type: QueryTypes.SELECT });

  console.log('\nSub-Status Table:');
  substatus.forEach(s => {
    console.log(`  Status ${s.status_id} -> Sub-Status ${s.sub_status_id}: ${s.sub_status_name}`);
  });

  // Check which are being used in calls table
  console.log('\n🔍 STATUSES USED IN CALLS TABLE:');
  const callStatuses = await sequelize.query(`
    SELECT DISTINCT c.call_status_id, s.status_name, COUNT(*) as count
    FROM calls c
    LEFT JOIN [status] s ON c.call_status_id = s.status_id
    GROUP BY c.call_status_id, s.status_name
    ORDER BY c.call_status_id
  `, { type: QueryTypes.SELECT });

  console.log('\nCall Statuses:');
  callStatuses.forEach(s => {
    console.log(`  ${s.call_status_id}: ${s.status_name || 'NULL'} (${s.count} calls)`);
  });

  // Check sub_status usage
  console.log('\n🔍 SUB-STATUSES USED IN CALLS TABLE:');
  const callSubstatuses = await sequelize.query(`
    SELECT DISTINCT c.call_sub_status_id, ss.sub_status_name, COUNT(*) as count
    FROM calls c
    LEFT JOIN [sub_status] ss ON c.call_sub_status_id = ss.sub_status_id
    WHERE c.call_sub_status_id IS NOT NULL
    GROUP BY c.call_sub_status_id, ss.sub_status_name
    ORDER BY c.call_sub_status_id
  `, { type: QueryTypes.SELECT });

  console.log('\nCall Sub-Statuses:');
  if (callSubstatuses.length > 0) {
    callSubstatuses.forEach(s => {
      console.log(`  ${s.call_sub_status_id}: ${s.sub_status_name || 'NULL'} (${s.count} calls)`);
    });
  } else {
    console.log('  (No sub-status data used)');
  }

  process.exit(0);
} catch (e) {
  console.error('❌ Error:', e.message);
  process.exit(1);
}
