import { sequelize } from './db.js';
import { QueryTypes } from 'sequelize';

try {

    console.log('\n' + '='.repeat(80));
    console.log('🔍 RENTAL ALLOCATION DATABASE DIAGNOSTIC');
    console.log('='.repeat(80));

    // First, check if any spare_requests exist
    console.log('\n📌 Step 1: Checking all spare_requests in database...');
    const allRequests = await sequelize.query(`
      SELECT TOP 10
        sr.request_id,
        sr.requested_source_type,
        sr.requested_source_id,
        sr.requested_to_type,
        sr.requested_to_id,
        sr.status_id,
        st.status_name,
        sr.created_at
      FROM spare_requests sr
      LEFT JOIN [status] st ON sr.status_id = st.status_id
      ORDER BY sr.created_at DESC
    `, { type: QueryTypes.SELECT });

    console.log(`✅ Found ${allRequests.length} spare requests`);
    if (allRequests.length > 0) {
      console.log('\n📋 Recent requests:');
      allRequests.forEach((r, i) => {
        console.log(`  ${i+1}. REQ-${r.request_id}: From ${r.requested_source_type}(${r.requested_source_id}) → ${r.requested_to_type}(${r.requested_to_id}) [Status: ${r.status_name}]`);
      });
    }

    // Check specific service center (SC 2)
    console.log('\n📌 Step 2: Checking requests for Service Center 2...');
    const sc2Requests = await sequelize.query(`
      SELECT 
        sr.request_id,
        sr.requested_source_type,
        sr.requested_source_id,
        sr.requested_to_type,
        sr.requested_to_id,
        t.technician_id,
        t.service_center_id,
        st.status_name
      FROM spare_requests sr
      LEFT JOIN technicians t ON sr.requested_source_id = t.technician_id
      LEFT JOIN [status] st ON sr.status_id = st.status_id
      WHERE sr.requested_to_id = 2
        OR sr.requested_source_type = 'technician'
      ORDER BY sr.created_at DESC
    `, { type: QueryTypes.SELECT });

    console.log(`✅ Found ${sc2Requests.length} related requests`);
    if (sc2Requests.length > 0) {
      console.log('\n📋 Requests related to SC 2:');
      sc2Requests.slice(0, 5).forEach((r, i) => {
        console.log(`  ${i+1}. REQ-${r.request_id}:`);
        console.log(`     - From: ${r.requested_source_type}(${r.requested_source_id})`);
        console.log(`     - To: ${r.requested_to_type}(${r.requested_to_id})`);
        console.log(`     - Tech SC ID: ${r.service_center_id}, Tech ID: ${r.technician_id}`);
        console.log(`     - Status: ${r.status_name}`);
      });
    }

    // Check the exact query that the API uses
    console.log('\n📌 Step 3: Running EXACT rental allocation query for SC 2...');
    const exactQuery = await sequelize.query(`
      SELECT 
        sr.request_id,
        st.status_name
      FROM spare_requests sr
      LEFT JOIN technicians t ON sr.requested_source_id = t.technician_id
      LEFT JOIN [status] st ON sr.status_id = st.status_id
      WHERE sr.requested_to_id = 2
        AND sr.requested_source_type = 'technician'
        AND sr.requested_to_type = 'service_center'
        AND t.service_center_id = 2
    `, { type: QueryTypes.SELECT });

    console.log(`✅ Query returned ${exactQuery.length} requests`);
    if (exactQuery.length > 0) {
      console.log('\n📋 Requests from exact API query:');
      exactQuery.forEach((r, i) => {
        console.log(`  ${i+1}. REQ-${r.request_id} (Status: ${r.status_name})`);
      });
    } else {
      console.log('\n⚠️ API query returned 0 results!');
      console.log('   Checking potential issues:');
      
      // Check if technicians have service_center_id
      const techCheck = await sequelize.query(`
        SELECT TOP 3 technician_id, service_center_id FROM technicians
      `, { type: QueryTypes.SELECT });
      console.log(`   - Sample technicians:`, techCheck);
    }

  process.exit(0);
} catch (e) {
  console.error('❌ Error:', e.message);
  process.exit(1);
}
