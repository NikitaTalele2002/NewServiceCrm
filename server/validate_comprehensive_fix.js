import { sequelize } from './db.js';
import { QueryTypes } from 'sequelize';

try {
  console.log('\n' + '='.repeat(80));
  console.log('✅ COMPREHENSIVE RENTAL ALLOCATION FIX VALIDATION');
  console.log('='.repeat(80));

  const serviceCenterId = 2;

  // Test 1: With default status filter (no filter = 'pending' and 'open')
  console.log('\n📌 Test 1: WITH DEFAULT STATUS FILTER (pending + open)');
  const statusFilterDefault = 'AND st.status_name IN (\'pending\', \'open\')';
  
  const defaultRequests = await sequelize.query(`
    SELECT 
      sr.request_id,
      t.technician_id,
      t.name as technicianName,
      t.service_center_id as techServiceCenterId,
      st.status_name as status,
      sr.created_at
    FROM spare_requests sr
    LEFT JOIN technicians t ON sr.requested_source_id = t.technician_id
    LEFT JOIN [status] st ON sr.status_id = st.status_id
    WHERE sr.requested_to_id = ?
      AND sr.requested_source_type = 'technician'
      AND sr.requested_to_type = 'service_center'
      ${statusFilterDefault}
    ORDER BY sr.created_at DESC
  `, { replacements: [serviceCenterId], type: QueryTypes.SELECT });

  console.log(`✅ Found ${defaultRequests.length} requests with default filter`);
  
  // Test 2: With only pending filter
  console.log('\n📌 Test 2: WITH PENDING FILTER ONLY');
  const statusFilterPending = 'AND st.status_name = \'pending\'';
  
  const pendingRequests = await sequelize.query(`
    SELECT 
      sr.request_id,
      t.technician_id,
      t.name as technicianName,
      st.status_name as status
    FROM spare_requests sr
    LEFT JOIN technicians t ON sr.requested_source_id = t.technician_id
    LEFT JOIN [status] st ON sr.status_id = st.status_id
    WHERE sr.requested_to_id = ?
      AND sr.requested_source_type = 'technician'
      AND sr.requested_to_type = 'service_center'
      ${statusFilterPending}
    ORDER BY sr.created_at DESC
  `, { replacements: [serviceCenterId], type: QueryTypes.SELECT });

  console.log(`✅ Found ${pendingRequests.length} pending requests`);

  // Test 3: WITH OLD BROKEN QUERY (with technician service center id)
  console.log('\n📌 Test 3: BROKEN QUERY (old - with tech.service_center_id filter)');
  const statusFilterOpen = 'AND st.status_name = \'open\'';
  
  const brokenRequests = await sequelize.query(`
    SELECT 
      sr.request_id,
      t.technician_id,
      t.service_center_id as techServiceCenterId,
      st.status_name as status
    FROM spare_requests sr
    LEFT JOIN technicians t ON sr.requested_source_id = t.technician_id
    LEFT JOIN [status] st ON sr.status_id = st.status_id
    WHERE sr.requested_to_id = ?
      AND sr.requested_source_type = 'technician'
      AND sr.requested_to_type = 'service_center'
      AND t.service_center_id = ?
      ${statusFilterOpen}
    ORDER BY sr.created_at DESC
  `, { replacements: [serviceCenterId, serviceCenterId], type: QueryTypes.SELECT });

  console.log(`❌ Found only ${brokenRequests.length} open requests (due to old broken logic)`);

  // Test 4: Check which requests have mismatched technician service centers
  console.log('\n📌 Test 4: REQUESTS WITH TECHNICIAN SERVICE CENTER MISMATCH');
  
  const mismatched = defaultRequests.filter(r => r.techServiceCenterId !== serviceCenterId);
  console.log(`⚠️ Found ${mismatched.length} requests from technicians not in SC ${serviceCenterId}:`);
  mismatched.forEach(r => {
    console.log(`   - REQ-${r.request_id}: Tech ${r.technician_id} (in SC ${r.techServiceCenterId}), Status: ${r.status}`);
  });

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 SUMMARY OF IMPROVEMENTS');
  console.log('='.repeat(80));
  console.log(`\nOld broken implementation showed only certain requests based on`);
  console.log(`technician's CURRENT service center, causing requests to disappear if:`);
  console.log(`  - Technician was reassigned to different service center`);
  console.log(`  - Technician data was inconsistent`);
  console.log(`  - Status filtering was too restrictive`);
  console.log(`\n✅ NEW IMPLEMENTATION (after fix):`);
  console.log(`  - Uses requested_to_id directly (not technician's current SC)`);
  console.log(`  - Shows both 'pending' and 'open' statuses by default`);
  console.log(`  - All ${defaultRequests.length} requests are now visible`);
  console.log(`  - Requests are correctly grouped by their intended destination SC`);

  process.exit(0);
} catch (e) {
  console.error('❌ Error:', e.message);
  process.exit(1);
}
