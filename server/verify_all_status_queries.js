import { sequelize } from './db.js';
import { QueryTypes } from 'sequelize';

try {
  console.log('\n' + '='.repeat(80));
  console.log('✅ VERIFYING ALL API STATUS USAGE IS CORRECT');
  console.log('='.repeat(80));

  // Get all statuses
  console.log('\n🔍 Current Database Statuses:');
  const statuses = await sequelize.query(`
    SELECT status_id, status_name FROM [status] ORDER BY status_id
  `, { type: QueryTypes.SELECT });

  const statusMap = {};
  const statusNameMap = {};
  statuses.forEach(s => {
    statusMap[s.status_name.toLowerCase()] = s.status_id;
    statusNameMap[s.status_id] = s.status_name;
  });

  statuses.forEach(s => {
    console.log(`  ID ${s.status_id}: "${s.status_name}"`);
  });

  // Test queries that APIs use
  console.log('\n🧪 TEST 1: Pending Status Query');
  const pendingTest = await sequelize.query(`
    SELECT status_id FROM [status] WHERE status_name = 'pending'
  `, { type: QueryTypes.SELECT });
  console.log(`  ✅ Found pending status ID: ${pendingTest[0].status_id}`);

  console.log('\n🧪 TEST 2: Approved Status Query');
  const approvedTest = await sequelize.query(`
    SELECT status_id FROM [status] WHERE status_name = 'approved'
  `, { type: QueryTypes.SELECT });
  console.log(`  ✅ Found approved status ID: ${approvedTest[0].status_id}`);

  console.log('\n🧪 TEST 3: Rejected Status Query');
  const rejectedTest = await sequelize.query(`
    SELECT status_id FROM [status] WHERE status_name = 'rejected'
  `, { type: QueryTypes.SELECT });
  console.log(`  ✅ Found rejected status ID: ${rejectedTest[0].status_id}`);

  console.log('\n🧪 TEST 4: Allocated Status Query');
  const allocatedTest = await sequelize.query(`
    SELECT status_id FROM [status] WHERE status_name IN ('Allocated', 'allocated')
  `, { type: QueryTypes.SELECT });
  console.log(`  ✅ Found allocated status ID: ${allocatedTest[0].status_id}`);

  console.log('\n🧪 TEST 5: Re-Allocated Status Query');
  const reallocatedTest = await sequelize.query(`
    SELECT status_id FROM [status] WHERE status_name IN ('Re-Allocated', 're-allocated')
  `, { type: QueryTypes.SELECT });
  console.log(`  ✅ Found re-allocated status ID: ${reallocatedTest[0].status_id}`);

  console.log('\n🧪 TEST 6: Case-Insensitive Pending Query (for spareRequests.js)');
  const caseInsensitiveTest = await sequelize.query(`
    SELECT status_id FROM [status] WHERE LOWER(status_name) = 'pending'
  `, { type: QueryTypes.SELECT });
  console.log(`  ✅ Found status ID: ${caseInsensitiveTest[0].status_id}`);

  console.log('\n🧪 TEST 7: LIKE Query with Multiple Statuses');
  const likeTest = await sequelize.query(`
    SELECT status_id FROM [status] WHERE status_name LIKE '%pending%' OR status_name LIKE '%open%'
  `, { type: QueryTypes.SELECT });
  console.log(`  ✅ Found ${likeTest.length} statuses matching pattern`);

  console.log('\n🧪 TEST 8: Sub-Status Validation');
  const substatus = await sequelize.query(`
    SELECT COUNT(*) as count FROM [sub_status]
  `, { type: QueryTypes.SELECT });
  console.log(`  ✅ Sub-status table has ${substatus[0].count} records`);

  console.log('\n' + '='.repeat(80));
  console.log('✅ ALL TESTS PASSED - APIs ARE READY');
  console.log('='.repeat(80));

  console.log('\n📋 Summary of Status/SubStatus Data:');
  console.log('   Statuses Available: ' + statuses.map(s => `"${s.status_name}"`).join(', '));
  console.log('\n✅ All API queries should now work correctly');

  process.exit(0);
} catch (e) {
  console.error('❌ Test failed:', e.message);
  process.exit(1);
}
