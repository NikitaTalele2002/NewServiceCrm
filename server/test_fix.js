import { sequelize } from './db.js';
import { QueryTypes } from 'sequelize';

try {
  console.log('\n' + '='.repeat(80));
  console.log('✅ TESTING RENTAL ALLOCATION VISIBILITY FIX');
  console.log('='.repeat(80));

  const serviceCenterId = 2;
  const statusFilter = 'AND st.status_name = \'pending\'';

  // Test NEW query (without service center id filter)
  console.log('\n📌 NEW Query (SHOULD work - 1 parameter):');
  const newRequests = await sequelize.query(`
    SELECT 
      sr.request_id,
      'REQ-' + CAST(sr.request_id AS VARCHAR) as requestNumber,
      t.technician_id,
      t.name as technicianName,
      t.service_center_id as techServiceCenterId,
      sr.requested_to_id,
      st.status_name as status
    FROM spare_requests sr
    LEFT JOIN technicians t ON sr.requested_source_id = t.technician_id
    LEFT JOIN [status] st ON sr.status_id = st.status_id
    WHERE sr.requested_to_id = ?
      AND sr.requested_source_type = 'technician'
      AND sr.requested_to_type = 'service_center'
      ${statusFilter}
    ORDER BY sr.created_at DESC
  `, { replacements: [serviceCenterId], type: QueryTypes.SELECT });

  console.log(`✅ Query executed successfully`);
  console.log(`   Results: ${newRequests.length} requests found`);
  
  if (newRequests.length > 0) {
    console.log('\n📋 Sample requests with NEW query:');
    newRequests.slice(0, 5).forEach((r, i) => {
      const techMismatch = r.techServiceCenterId !== r.requested_to_id ? '⚠️' : '✅';
      console.log(`   ${i+1}. ${techMismatch} REQ-${r.request_id} from Tech ${r.technician_id} (SC: ${r.techServiceCenterId}) → Requested to: ${r.requested_to_id}`);
    });
  }

  // Test OLD query (with service center id filter)
  console.log('\n📌 OLD Query (SHOULD be limited - 2 parameters):');
  const oldRequests = await sequelize.query(`
    SELECT 
      sr.request_id,
      'REQ-' + CAST(sr.request_id AS VARCHAR) as requestNumber,
      t.technician_id,
      t.name as technicianName,
      t.service_center_id as techServiceCenterId,
      sr.requested_to_id,
      st.status_name as status
    FROM spare_requests sr
    LEFT JOIN technicians t ON sr.requested_source_id = t.technician_id
    LEFT JOIN [status] st ON sr.status_id = st.status_id
    WHERE sr.requested_to_id = ?
      AND sr.requested_source_type = 'technician'
      AND sr.requested_to_type = 'service_center'
      AND t.service_center_id = ?
      ${statusFilter}
    ORDER BY sr.created_at DESC
  `, { replacements: [serviceCenterId, serviceCenterId], type: QueryTypes.SELECT });

  console.log(`✅ Query executed successfully`);
  console.log(`   Results: ${oldRequests.length} requests found`);

  console.log('\n📊 COMPARISON:');
  console.log(`   NEW query (fixed):  ${newRequests.length} requests`);
  console.log(`   OLD query (buggy):  ${oldRequests.length} requests`);
  console.log(`   DIFFERENCE:         ${newRequests.length - oldRequests.length} requests were hidden before!`);

  // Identify missing requests
  const newIds = new Set(newRequests.map(r => r.request_id));
  const oldIds = new Set(oldRequests.map(r => r.request_id));
  const missingRequests = newRequests.filter(r => !oldIds.has(r.request_id));

  if (missingRequests.length > 0) {
    console.log('\n⚠️ REQUESTS THAT WERE HIDDEN (NOW VISIBLE):');
    missingRequests.forEach(r => {
      console.log(`   - REQ-${r.request_id} from Tech ${r.technician_id} [Tech SC: ${r.techServiceCenterId}, Requested to: ${r.requested_to_id}]`);
    });
  }

  process.exit(0);
} catch (e) {
  console.error('❌ Error:', e.message);
  process.exit(1);
}
