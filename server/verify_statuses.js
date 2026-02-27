import { sequelize } from './db.js';
import { QueryTypes } from 'sequelize';

try {
  console.log('\n' + '='.repeat(80));
  console.log('📋 CHECKING STATUS VALUES IN DATABASE');
  console.log('='.repeat(80));

  const statuses = await sequelize.query(`
    SELECT DISTINCT status_name, COUNT(*) as count
    FROM [status]
    GROUP BY status_name
    ORDER BY status_name
  `, { type: QueryTypes.SELECT });

  console.log('\n✅ Available statuses:');
  statuses.forEach(s => {
    console.log(`   - ${s.status_name}: ${s.count} records`);
  });

  // Check what statuses are used in spare_requests
  console.log('\n✅ Statuses used in spare_requests:');
  const usedStatuses = await sequelize.query(`
    SELECT DISTINCT st.status_name, COUNT(*) as count
    FROM spare_requests sr
    LEFT JOIN [status] st ON sr.status_id = st.status_id
    GROUP BY st.status_name
    ORDER BY st.status_name
  `, { type: QueryTypes.SELECT });

  usedStatuses.forEach(s => {
    console.log(`   - ${s.status_name}: ${s.count} requests`);
  });

  process.exit(0);
} catch (e) {
  console.error('❌ Error:', e.message);
  process.exit(1);
}
