import { sequelize } from './db.js';
import { QueryTypes } from 'sequelize';

async function testRequest22Complete() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🔍 TESTING REQUEST 22 COMPLETE DATA STRUCTURE');
    console.log('='.repeat(80) + '\n');

    const serviceCenterId = 1;

    // Step 1: Get request
    console.log('1️⃣ Fetching Request 22...');
    const request = await sequelize.query(`
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
      WHERE sr.request_id = 22
    `, { type: QueryTypes.SELECT });

    if (request.length === 0) {
      console.error('❌ Request 22 not found!');
      process.exit(1);
    }

    const req = request[0];
    console.log(`✅ Request 22 found`);
    console.log(`   Technician: ${req.technicianName}`);
    console.log(`   Status: ${req.status}\n`);

    // Step 2: Get items
    console.log('2️⃣ Fetching items for Request 22...');
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
      WHERE sri.request_id = 22
      ORDER BY sri.id
    `, { type: QueryTypes.SELECT });

    console.log(`✅ Found ${items.length} items\n`);

    if (items.length === 0) {
      console.error('❌ ERROR: NO ITEMS FOUND!');
      process.exit(1);
    }

    // Step 3: Check each item
    console.log('3️⃣ Item details:\n');
    items.forEach((item, i) => {
      console.log(`Item ${i + 1}:`);
      console.log(`  itemId: ${item.itemId} (type: ${typeof item.itemId})`);
      console.log(`  spareId: ${item.spareId} (type: ${typeof item.spareId})`);
      console.log(`  requestedQty: ${item.requestedQty} (type: ${typeof item.requestedQty})`);
      console.log(`  partCode: ${item.partCode} (type: ${typeof item.partCode})`);
      console.log(`  partDescription: ${item.partDescription} (type: ${typeof item.partDescription})`);
      
      const hasNullFields = !item.partCode || !item.partDescription || !item.requestedQty;
      if (hasNullFields) {
        console.log(`  ⚠️  WARNING: NULL/UNDEFINED FIELDS!`);
      }
      console.log();
    });

    // Step 4: Show what API should return
    console.log('4️⃣ What API should return (enrichedItems structure):');
    
    const enrichedItems = await Promise.all(
      items.map(async (item) => {
        // Simulate inventory lookup (from SC 1)
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

        const inv = inventory[0] || { availableQty: 0 };
        
        return {
          itemId: item.itemId,
          spareId: item.spareId,
          partCode: item.partCode || 'N/A',
          partDescription: item.partDescription || 'Unknown',
          brand: item.brand || 'N/A',
          requestedQty: item.requestedQty,
          approvedQty: item.approvedQty,
          availableQty: inv.availableQty,
          defectiveQty: inv.defectiveQty,
          inTransitQty: inv.inTransitQty,
          availability_status: inv.availableQty >= item.requestedQty ? 'fully_available' : 'not_available',
          canFullyApprove: inv.availableQty >= item.requestedQty
        };
      })
    );

    console.log('Enriched items count:', enrichedItems.length);
    enrichedItems.forEach((item, i) => {
      console.log(`  ${i + 1}. ${item.partCode} | Qty: ${item.requestedQty}`);
    });
    console.log();

    // Step 5: Show final response structure
    console.log('5️⃣ Final response structure (what component receives):');
    const finalResponse = {
      requestId: req.request_id,
      requestNumber: req.requestNumber,
      technicianId: req.technician_id,
      technicianName: req.technicianName,
      technicianPhone: req.technicianPhone,
      reason: req.reason,
      requestType: req.requestType,
      status: req.status,
      callId: req.callId,
      createdAt: req.createdAt,
      items: enrichedItems
    };

    console.log(JSON.stringify(finalResponse, null, 2));

    console.log('\n' + '='.repeat(80));
    console.log('✅ Test complete - component should receive all items with data');
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    process.exit(0);
  }
}

testRequest22Complete();
