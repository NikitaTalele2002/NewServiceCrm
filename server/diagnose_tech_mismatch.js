import { sequelize } from './db.js';
import { QueryTypes } from 'sequelize';

try {
  console.log('\n' + '='.repeat(80));
  console.log('🔍 TECHNICIAN SERVICE CENTER MISMATCH DIAGNOSIS');
  console.log('='.repeat(80));

  // Check technicians and their service center assignments
  console.log('\n📌 Step 1: Checking technicians (sample)...');
  const techs = await sequelize.query(`
    SELECT TOP 10 technician_id, name, service_center_id, user_id FROM technicians
    ORDER BY technician_id DESC
  `, { type: QueryTypes.SELECT });

  console.log(`✅ Found technicians:`);
  techs.forEach(t => {
    console.log(`   - Tech ${t.technician_id}: ${t.name || 'Unknown'}, SC: ${t.service_center_id}, User: ${t.user_id}`);
  });

  // Check specific issue
  console.log('\n📌 Step 2: Checking the problem requests...');
  const problems = await sequelize.query(`
    SELECT DISTINCT
      sr.request_id,
      t.technician_id,
      t.service_center_id,
      sr.requested_to_id,
      st.status_name
    FROM spare_requests sr
    LEFT JOIN technicians t ON sr.requested_source_id = t.technician_id
    LEFT JOIN [status] st ON sr.status_id = st.status_id
    WHERE sr.requested_to_id = 2
      AND sr.requested_source_type = 'technician'
      AND sr.requested_to_type = 'service_center'
      AND sr.request_id IN (90, 89, 88, 87, 86)
    ORDER BY sr.request_id DESC
  `, { type: QueryTypes.SELECT });

  console.log(`\n📋 Recent problematic requests:`);
  problems.forEach(p => {
    const match = p.service_center_id === p.requested_to_id ? '✅' : '❌';
    console.log(`   ${match} REQ-${p.request_id}: Tech=${p.technician_id}, Tech.SC=${p.service_center_id}, Req.To=${p.requested_to_id}, Status=${p.status_name}`);
  });

  console.log('\n📌 Step 3: Root cause - Technician 2 service center assignment...');
  const tech2 = await sequelize.query(`
    SELECT technician_id, service_center_id, asc_id FROM technicians
    WHERE technician_id IN (2, 3, 11)
  `, { type: QueryTypes.SELECT });

  console.log(`\n📋 Technicians with issues:`);
  tech2.forEach(t => {
    console.log(`   - Tech ${t.technician_id}: service_center_id=${t.service_center_id}`);
  });

  process.exit(0);
} catch (e) {
  console.error('❌ Error:', e.message);
  process.exit(1);
}
