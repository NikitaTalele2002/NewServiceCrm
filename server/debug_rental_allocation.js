/**
 * Debug script to check rental allocation data in database
 * Verifies that spare requests have items attached
 */

import { sequelize } from './models/index.js';
import { QueryTypes } from 'sequelize';

async function debugRentalAllocation() {
  try {
    console.log('\n' + '='.repeat(70));
    console.log('🔍 RENTAL ALLOCATION DATA DEBUG');
    console.log('='.repeat(70));

    // Service Center ID (adjust if needed)
    const serviceCenterId = 4;
    console.log(`\n📍 Checking data for Service Center: ${serviceCenterId}\n`);

    // 1. Check all spare requests for this SC
    console.log('1️⃣ All spare requests for this SC:');
    const requests = await sequelize.query(`
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
      WHERE sr.requested_to_id = ?
        AND sr.requested_source_type = 'technician'
        AND sr.requested_to_type = 'service_center'
      ORDER BY sr.created_at DESC
    `, { replacements: [serviceCenterId], type: QueryTypes.SELECT });

    console.log(`Found ${requests.length} requests:`);
    requests.forEach(req => {
      console.log(`  - REQ-${req.request_id} | Tech: ${req.technicianName} | Items: ${req.itemCount} | Status: ${req.status} | Date: ${req.created_at}`);
    });

    // 2. For the most recent request, check its items
    if (requests.length > 0) {
      const latestRequest = requests[0];
      console.log(`\n2️⃣ Items for latest request (REQ-${latestRequest.request_id}):`);
      
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
        replacements: [latestRequest.request_id], 
        type: QueryTypes.SELECT 
      });

      console.log(`Found ${items.length} items:`);
      items.forEach(item => {
        console.log(`  - Item ${item.itemId}: Part=${item.partCode} Qty=${item.requestedQty} SpareId=${item.spareId}`);
      });

      // 3. Check inventory for each item
      console.log(`\n3️⃣ Inventory availability for these items at SC ${serviceCenterId}:`);
      for (const item of items) {
        const inventory = await sequelize.query(`
          SELECT 
            COALESCE(qty_good, 0) as availableQty,
            COALESCE(qty_defective, 0) as defectiveQty,
            COALESCE(qty_in_transit, 0) as inTransitQty
          FROM spare_inventory 
          WHERE spare_id = ? 
            AND location_type = 'service_center'
            AND location_id = ?
        `, { 
          replacements: [item.spareId, serviceCenterId], 
          type: QueryTypes.SELECT 
        });

        const inv = inventory[0] || { availableQty: 0, defectiveQty: 0, inTransitQty: 0 };
        console.log(`  - SpareId ${item.spareId} (${item.partCode}): Available=${inv.availableQty}, Requested=${item.requestedQty}`);
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ Debug check complete');
    console.log('='.repeat(70) + '\n');

  } catch (error) {
    console.error('❌ Error during debug:', error.message);
    console.error(error);
  } finally {
    process.exit(0);
  }
}

debugRentalAllocation();
