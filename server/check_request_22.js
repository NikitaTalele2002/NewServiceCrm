import { sequelize } from './db.js';
import { QueryTypes } from 'sequelize';

async function checkRequest22() {
  try {
    console.log('\n' + '='.repeat(70));
    console.log('🔍 CHECKING REQUEST ID 22');
    console.log('='.repeat(70));

    // Get the request details
    console.log('\n1️⃣ REQUEST DETAILS:');
    const request = await sequelize.query(`
      SELECT 
        sr.request_id,
        'REQ-' + CAST(sr.request_id AS VARCHAR) as requestNumber,
        t.name as technicianName,
        st.status_name as status,
        sr.created_at,
        (SELECT COUNT(*) FROM spare_request_items WHERE request_id = sr.request_id) as itemCount
      FROM spare_requests sr
      LEFT JOIN technicians t ON sr.requested_source_id = t.technician_id
      LEFT JOIN [status] st ON sr.status_id = st.status_id
      WHERE sr.request_id = 22
    `, { type: QueryTypes.SELECT });

    if (request.length === 0) {
      console.log('❌ Request 22 not found!');
    } else {
      const req = request[0];
      console.log(`Request ID: ${req.request_id}`);
      console.log(`Number: ${req.requestNumber}`);
      console.log(`Technician: ${req.technicianName}`);
      console.log(`Status: ${req.status}`);
      console.log(`Created: ${req.created_at}`);
      console.log(`Items Count: ${req.itemCount}`);
    }

    // Get the items
    console.log('\n2️⃣ SPARE REQUEST ITEMS:');
    const items = await sequelize.query(`
      SELECT 
        sri.id as itemId,
        sri.spare_id as spareId,
        sri.requested_qty as requestedQty,
        COALESCE(sri.approved_qty, 0) as approvedQty,
        sp.PART as partCode,
        sp.DESCRIPTION as partDescription
      FROM spare_request_items sri
      LEFT JOIN spare_parts sp ON sri.spare_id = sp.Id
      WHERE sri.request_id = 22
    `, { type: QueryTypes.SELECT });

    if (items.length === 0) {
      console.log('⚠️ NO ITEMS FOUND for Request 22!');
      console.log('   This is why the detail view is empty.');
    } else {
      console.log(`Found ${items.length} items:`);
      items.forEach((item, idx) => {
        console.log(`  ${idx + 1}. Part: ${item.partCode} | Qty: ${item.requestedQty} | SpareID: ${item.spareId}`);
      });
    }

    console.log('\n' + '='.repeat(70) + '\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
}

checkRequest22();
