import { sequelize } from './db.js';
import { QueryTypes } from 'sequelize';

async function simulateAPIResponse() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🔍 SIMULATING API RESPONSE FOR REQUEST 22');
    console.log('='.repeat(80) + '\n');

    // Service Center 1 (where Request 22 is)
    const serviceCenterId = 1;

    console.log('Fetching request with items using the EXACT API query...\n');

    // Get request
    const requests = await sequelize.query(`
      SELECT 
        sr.request_id,
        'REQ-' + CAST(sr.request_id AS VARCHAR) as requestNumber,
        t.technician_id,
        t.name as technicianName,
        t.mobile_no as technicianPhone,
        sr.request_reason as reason,
        sr.spare_request_type as requestType,
        st.status_id,
        st.status_name as status,
        sr.call_id as callId,
        sr.created_at as createdAt,
        sr.created_by as createdBy
      FROM spare_requests sr
      LEFT JOIN technicians t ON sr.requested_source_id = t.technician_id
      LEFT JOIN [status] st ON sr.status_id = st.status_id
      WHERE sr.requested_to_id = ?
        AND sr.requested_source_type = 'technician'
        AND sr.requested_to_type = 'service_center'
      ORDER BY sr.created_at DESC
    `, { replacements: [serviceCenterId], type: QueryTypes.SELECT });

    console.log(`Found ${requests.length} requests\n`);

    // Get Request 22
    const req22 = requests.find(r => r.request_id === 22);
    if (!req22) {
      console.error('❌ Request 22 not found for SC 1!');
      process.exit(1);
    }

    console.log('✅ Found Request 22');
    console.log(`   Technician: ${req22.technicianName}`);
    console.log(`   Status: ${req22.status}\n`);

    // Get items for Request 22
    const items = await sequelize.query(`
      SELECT 
        sri.id as itemId,
        sri.spare_id as spareId,
        sri.requested_qty as requestedQty,
        COALESCE(sri.approved_qty, 0) as approvedQty,
        sp.PART as partCode,
        sp.DESCRIPTION as partDescription,
        sp.BRAND as brand
      FROM spare_request_items sri
      LEFT JOIN spare_parts sp ON sri.spare_id = sp.Id
      WHERE sri.request_id = ?
      ORDER BY sri.id
    `, { 
      replacements: [22], 
      type: QueryTypes.SELECT 
    });

    console.log(`📦 Found ${items.length} items:\n`);
    items.forEach((item, i) => {
      console.log(`Item ${i + 1}:`);
      Object.keys(item).forEach(key => {
        console.log(`  ${key}: ${item[key]}`);
      });
      console.log();
    });

    // Show what the API response would look like
    console.log('API RESPONSE STRUCTURE:');
    console.log(JSON.stringify({
      success: true,
      data: [{
        requestId: req22.request_id,
        requestNumber: req22.requestNumber,
        technicianName: req22.technicianName,
        status: req22.status,
        createdAt: req22.createdAt,
        items: items
      }]
    }, null, 2));

    console.log('\n' + '='.repeat(80));

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    process.exit(0);
  }
}

simulateAPIResponse();
