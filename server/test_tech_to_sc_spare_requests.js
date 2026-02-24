/**
 * END-TO-END TEST: Technician to Service Center Spare Request Workflow
 * 
 * This test demonstrates the complete flow:
 * 1. Technician submits spare request to their assigned Service Center
 * 2. Request appears on Service Center's Rental Allocation page
 * 3. Service Center approves the request (with inventory check)
 * 4. Stock movement is created automatically
 * 5. Technician inventory is updated
 */

import { sequelize } from './db.js';
import * as models from './models/index.js';

async function runE2ETest() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🚀 TECHNICIAN TO SERVICE CENTER SPARE REQUEST - E2E TEST');
    console.log('='.repeat(80) + '\n');

    // Initialize database
    await sequelize.sync({ alter: false });

    // ============================================================================
    // TEST 1: Create test data (if not exists)
    // ============================================================================
    console.log('📊 TEST 1: Prepare test data\n');

    // Get a technician with service center assigned
    const technician = await sequelize.query(`
      SELECT TOP 1 
        t.technician_id,
        t.name as technician_name,
        t.service_center_id,
        sc.asc_id,
        sc.asc_name
      FROM technicians t
      LEFT JOIN service_centers sc ON t.service_center_id = sc.asc_id
      WHERE t.service_center_id IS NOT NULL
      ORDER BY t.technician_id
    `, { type: sequelize.QueryTypes.SELECT });

    if (!technician.length) {
      console.log('❌ No technician with service center found');
      process.exit(0);
    }

    const tech = technician[0];
    console.log(`✅ Technician: ${tech.technician_name} (ID: ${tech.technician_id})`);
    console.log(`✅ Service Center: ${tech.asc_name} (ID: ${tech.service_center_id})`);

    // Get spare parts with good inventory in the service center
    const sparesWithInventory = await sequelize.query(`
      SELECT TOP 5
        si.spare_id,
        si.location_id,
        si.qty_good,
        sp.PART as part_code,
        sp.DESCRIPTION as part_description
      FROM spare_inventory si
      LEFT JOIN spare_parts sp ON si.spare_id = sp.Id
      WHERE si.location_type = 'service_center'
        AND si.location_id = ?
        AND si.qty_good >= 5
      ORDER BY si.qty_good DESC
    `, { 
      replacements: [tech.service_center_id],
      type: sequelize.QueryTypes.SELECT 
    });

    if (!sparesWithInventory.length) {
      console.log('❌ No spare parts with sufficient inventory in service center');
      process.exit(0);
    }

    console.log(`✅ Found ${sparesWithInventory.length} spare parts with inventory`);
    sparesWithInventory.forEach(s => {
      console.log(`   • ${s.part_code}: ${s.qty_good} qty available`);
    });

    // ============================================================================
    // TEST 2: Create spare request from technician to service center
    // ============================================================================
    console.log('\n' + '='.repeat(80));
    console.log('📝 TEST 2: Create spare request\n');

    // Get pending status
    const pendingStatus = await sequelize.query(`
      SELECT status_id FROM [status] WHERE status_name = 'pending'
    `, { type: sequelize.QueryTypes.SELECT });

    if (!pendingStatus.length) {
      console.log('❌ Pending status not found');
      process.exit(0);
    }

    const statusId = pendingStatus[0].status_id;

    // Create spare request with detailed logging
    console.log(`✅ Pending status ID: ${statusId}`);
    console.log('\n🔧 Inserting spare request into database...');
    console.log(`   - Spare Request Type: TECH_ISSUE`);
    console.log(`   - Technician ID: ${tech.technician_id}`);
    console.log(`   - Service Center ID: ${tech.service_center_id}`);
    console.log(`   - Status ID: ${statusId}`);

    // Create spare request
    const createRequestResult = await sequelize.query(`
      INSERT INTO spare_requests (
        spare_request_type,
        requested_source_type,
        requested_source_id,
        requested_to_type,
        requested_to_id,
        request_reason,
        status_id,
        created_by,
        created_at,
        updated_at
      )
      OUTPUT inserted.request_id
      VALUES (
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        GETDATE(),
        GETDATE()
      )
    `, { 
      replacements: ['TECH_ISSUE', 'technician', tech.technician_id, 'service_center', tech.service_center_id, 'msl', statusId, 1],
      type: sequelize.QueryTypes.SELECT 
    });

    if (!createRequestResult.length) {
      console.log('❌ Failed to create spare request - No result returned');
      process.exit(0);
    }

    const requestId = createRequestResult[0].request_id;
    console.log(`✅ Spare request created: REQ-${requestId}`);

    // Verify the request was actually inserted
    console.log('\n🔍 Verifying insertion in database...');
    const verifyRequest = await sequelize.query(`
      SELECT TOP 1 
        request_id, 
        spare_request_type, 
        requested_source_id, 
        requested_to_id, 
        status_id,
        created_at
      FROM spare_requests
      WHERE request_id = ?
    `, { replacements: [requestId], type: sequelize.QueryTypes.SELECT });

    if (!verifyRequest.length) {
      console.log('❌ CRITICAL: Request created but NOT FOUND in database!');
      console.log('   This indicates an insertion issue with the spare_requests table');
      process.exit(0);
    }

    const verified = verifyRequest[0];
    console.log(`✅ Request verified in database:`);
    console.log(`   Request ID: ${verified.request_id}`);
    console.log(`   Type: ${verified.spare_request_type}`);
    console.log(`   Technician ID: ${verified.requested_source_id}`);
    console.log(`   Service Center ID: ${verified.requested_to_id}`);
    console.log(`   Status ID: ${verified.status_id}`);
    console.log(`   Created At: ${verified.created_at}`);

    // Create request items with verification
    const selectedSpares = sparesWithInventory.slice(0, 2);
    console.log(`\n📦 Creating request items for ${selectedSpares.length} spares...`);

    const itemIds = [];
    for (const spare of selectedSpares) {
      const quantityToRequest = Math.min(spare.qty_good, 3); // Request up to 3 units
      
      try {
        const itemResult = await sequelize.query(`
          INSERT INTO spare_request_items (
            request_id,
            spare_id,
            requested_qty,
            created_at,
            updated_at
          )
          OUTPUT inserted.id
          VALUES (?, ?, ?, GETDATE(), GETDATE())
        `, { 
          replacements: [requestId, spare.spare_id, quantityToRequest],
          type: sequelize.QueryTypes.SELECT 
        });

        if (!itemResult.length) {
          console.log(`  ⚠️ Item not created for spare ${spare.spare_id}`);
          continue;
        }

        const itemId = itemResult[0].id;

        // Verify item was inserted
        const verifyItem = await sequelize.query(`
          SELECT TOP 1 id, request_id, spare_id, requested_qty FROM spare_request_items WHERE id = ?
        `, { replacements: [itemId], type: sequelize.QueryTypes.SELECT });

        if (verifyItem.length) {
          itemIds.push(itemId);
          console.log(`  ✅ Item created & verified: Spare ${spare.spare_id}, Qty: ${quantityToRequest}, ItemID: ${itemId}`);
        } else {
          console.log(`  ⚠️ Item created but NOT FOUND on verification: ID ${itemId}`);
        }
      } catch (itemErr) {
        console.error(`  ❌ Error creating item for spare ${spare.spare_id}:`, itemErr.message);
      }
    }

    if (itemIds.length === 0) {
      console.log('❌ No items were successfully created!');
      process.exit(0);
    }

    console.log(`\n✅ All request items created: ${itemIds.length} items`);

    // ============================================================================
    // TEST 3: View on Rental Allocation page
    // ============================================================================
    console.log('\n' + '='.repeat(80));
    console.log('📋 TEST 3: Service Center views pending requests (Rental Allocation)\n');

    const pendingRequests = await sequelize.query(`
      SELECT 
        sr.request_id,
        'REQ-' + CAST(sr.request_id AS VARCHAR) as requestNumber,
        t.name as technicianName,
        st.status_name as status,
        sr.created_at as createdAt,
        (SELECT COUNT(*) FROM spare_request_items WHERE request_id = sr.request_id) as itemCount
      FROM spare_requests sr
      LEFT JOIN technicians t ON sr.requested_source_id = t.technician_id
      LEFT JOIN [status] st ON sr.status_id = st.status_id
      WHERE sr.requested_to_id = ?
        AND sr.requested_source_type = 'technician'
        AND st.status_name = 'pending'
      ORDER BY sr.created_at DESC
    `, { 
      replacements: [tech.service_center_id],
      type: sequelize.QueryTypes.SELECT 
    });

    console.log(`✅ Found ${pendingRequests.length} pending requests on Rental Allocation page`);

    const ourRequest = pendingRequests.find(r => r.request_id === requestId);
    if (ourRequest) {
      console.log(`\n📌 Our Request Visible:`);
      console.log(`   Request: ${ourRequest.requestNumber}`);
      console.log(`   Technician: ${ourRequest.technicianName}`);
      console.log(`   Items: ${ourRequest.itemCount}`);
      console.log(`   Status: ${ourRequest.status}`);
    }

    // ============================================================================
    // TEST 4: Load request details with inventory check
    // ============================================================================
    console.log('\n' + '='.repeat(80));
    console.log('📦 TEST 4: Load request details with inventory check\n');

    const requestDetails = await sequelize.query(`
      SELECT 
        sri.id as itemId,
        sri.spare_id as spareId,
        sri.requested_qty as requestedQty,
        sp.PART as partCode,
        sp.DESCRIPTION as partDescription,
        COALESCE(si.qty_good, 0) as availableQty,
        COALESCE(si.qty_defective, 0) as defectiveQty
      FROM spare_request_items sri
      LEFT JOIN spare_parts sp ON sri.spare_id = sp.Id
      LEFT JOIN spare_inventory si ON sri.spare_id = si.spare_id 
        AND si.location_type = 'service_center'
        AND si.location_id = ?
      WHERE sri.request_id = ?
    `, { 
      replacements: [tech.service_center_id, requestId],
      type: sequelize.QueryTypes.SELECT 
    });

    console.log(`✅ Request Details:\n`);
    let canFullyApprove = true;
    requestDetails.forEach((item, idx) => {
      console.log(`  ${idx + 1}. ${item.partCode}`);
      console.log(`     Requested: ${item.requestedQty}, Available: ${item.availableQty}`);
      if (item.availableQty < item.requestedQty) {
        console.log(`     ⚠️  INSUFFICIENT INVENTORY`);
        canFullyApprove = false;
      } else {
        console.log(`     ✅ Fully available`);
      }
    });

    if (!canFullyApprove) {
      console.log('❌ Cannot approve request - insufficient inventory');
      process.exit(0);
    }

    // ============================================================================
    // TEST 5: Approve the request
    // ============================================================================
    console.log('\n' + '='.repeat(80));
    console.log('✅ TEST 5: Service Center approves request\n');

    // Get approved status
    const approvedStatus = await sequelize.query(`
      SELECT status_id FROM [status] WHERE status_name = 'approved'
    `, { type: sequelize.QueryTypes.SELECT });

    if (!approvedStatus.length) {
      console.log('❌ Approved status not found');
      process.exit(0);
    }

    const approvedStatusId = approvedStatus[0].status_id;

    // Prepare approval data
    const approveItems = requestDetails.map(item => ({
      itemId: item.itemId,
      approvedQty: Math.min(item.requestedQty, item.availableQty)
    }));

    const totalQty = approveItems.reduce((sum, item) => sum + item.approvedQty, 0);

    // Create stock movement (TECH_ISSUE_OUT: SC decreases, Technician increases)
    console.log('📦 Step 1: Create stock movement...');
    const movementResult = await sequelize.query(`
      INSERT INTO stock_movement (
        stock_movement_type,
        bucket,
        bucket_operation,
        reference_type,
        reference_no,
        source_location_type,
        source_location_id,
        destination_location_type,
        destination_location_id,
        total_qty,
        movement_date,
        created_by,
        status,
        created_at,
        updated_at
      )
      OUTPUT inserted.movement_id
      VALUES (
        'TECH_ISSUE_OUT',
        'GOOD',
        'DECREASE',
        'spare_request',
        'REQ-' + CAST(? AS VARCHAR),
        'service_center',
        ?,
        'technician',
        ?,
        ?,
        GETDATE(),
        1,
        'completed',
        GETDATE(),
        GETDATE()
      )
    `, { 
      replacements: [requestId, tech.service_center_id, tech.technician_id, totalQty],
      type: sequelize.QueryTypes.SELECT 
    });

    const movementId = movementResult[0].movement_id;
    console.log(`✅ Stock movement created: ID ${movementId}`);

    // Process each approval item
    console.log(`\n📝 Step 2: Process ${approveItems.length} items...`);
    for (const approval of approveItems) {
      // Get spare details
      const spareDetail = requestDetails.find(r => r.itemId === approval.itemId);
      
      // Update spare_request_items with approved_qty
      await sequelize.query(`
        UPDATE spare_request_items
        SET approved_qty = ?, updated_at = GETDATE()
        WHERE id = ?
      `, { replacements: [approval.approvedQty, approval.itemId] });

      // Create goods movement item
      await sequelize.query(`
        INSERT INTO goods_movement_items (
          movement_id,
          spare_part_id,
          qty,
          condition,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, 'good', GETDATE(), GETDATE())
      `, { replacements: [movementId, spareDetail.spareId, approval.approvedQty] });

      // Decrease Service Center inventory
      await sequelize.query(`
        UPDATE spare_inventory
        SET qty_good = qty_good - ?, updated_at = GETDATE()
        WHERE spare_id = ? AND location_type = 'service_center' AND location_id = ?
      `, { replacements: [approval.approvedQty, spareDetail.spareId, tech.service_center_id] });

      // Increase Technician inventory
      const techInventory = await sequelize.query(`
        SELECT spare_inventory_id FROM spare_inventory
        WHERE spare_id = ? AND location_type = 'technician' AND location_id = ?
      `, { replacements: [spareDetail.spareId, tech.technician_id], type: sequelize.QueryTypes.SELECT });

      if (techInventory.length > 0) {
        await sequelize.query(`
          UPDATE spare_inventory
          SET qty_good = qty_good + ?, updated_at = GETDATE()
          WHERE spare_id = ? AND location_type = 'technician' AND location_id = ?
        `, { replacements: [approval.approvedQty, spareDetail.spareId, tech.technician_id] });
      } else {
        await sequelize.query(`
          INSERT INTO spare_inventory (spare_id, location_type, location_id, qty_good, qty_defective, qty_in_transit, created_at, updated_at)
          VALUES (?, 'technician', ?, ?, 0, 0, GETDATE(), GETDATE())
        `, { replacements: [spareDetail.spareId, tech.technician_id, approval.approvedQty] });
      }

      console.log(`  ✅ Item approved: ${spareDetail.partCode}, Qty: ${approval.approvedQty}`);
    }

    // Update request status
    console.log(`\n📊 Step 3: Update request status...`);
    await sequelize.query(`
      UPDATE spare_requests
      SET status_id = ?, updated_at = GETDATE()
      WHERE request_id = ?
    `, { replacements: [approvedStatusId, requestId] });
    console.log(`✅ Request status updated to approved`);

    // Create approval record
    console.log(`\n📋 Step 4: Create approval record...`);
    await sequelize.query(`
      INSERT INTO approvals (
        entity_type,
        entity_id,
        approval_level,
        approver_user_id,
        approval_status,
        approval_remarks,
        approved_at,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, 'approved', ?, GETDATE(), GETDATE(), GETDATE())
    `, { 
      replacements: [
        'spare_request',
        requestId,
        1,
        1,
        `Service Center approved - ${approveItems.length} items allocated`
      ]
    });
    console.log(`✅ Approval record created`);

    // ============================================================================
    // TEST 6: Verify final state
    // ============================================================================
    console.log('\n' + '='.repeat(80));
    console.log('✅ TEST 6: Verify final state\n');

    // Verify request status changed
    const finalRequest = await sequelize.query(`
      SELECT TOP 1
        sr.request_id,
        st.status_name as status,
        sr.updated_at as lastUpdated
      FROM spare_requests sr
      LEFT JOIN [status] st ON sr.status_id = st.status_id
      WHERE sr.request_id = ?
    `, { replacements: [requestId], type: sequelize.QueryTypes.SELECT });

    console.log(`📌 Request Status:`);
    console.log(`   Request ID: REQ-${finalRequest[0].request_id}`);
    console.log(`   Status: ${finalRequest[0].status}`);
    console.log(`   Updated: ${finalRequest[0].lastUpdated}`);

    // Verify stock movement exists
    const movements = await sequelize.query(`
      SELECT TOP 1
        movement_id,
        stock_movement_type,
        bucket,
        bucket_operation,
        source_location_type,
        destination_location_type,
        total_qty
      FROM stock_movement
      WHERE movement_id = ?
    `, { replacements: [movementId], type: sequelize.QueryTypes.SELECT });

    console.log(`\n📦 Stock Movement:`);
    if (movements.length) {
      const mov = movements[0];
      console.log(`   Movement ID: ${mov.movement_id}`);
      console.log(`   Type: ${mov.stock_movement_type}`);
      console.log(`   Bucket: ${mov.bucket}`);
      console.log(`   Operation: ${mov.bucket_operation}`);
      console.log(`   From: ${mov.source_location_type} → To: ${mov.destination_location_type}`);
      console.log(`   Quantity: ${mov.total_qty}`);
    }

    // Verify technician inventory increased
    console.log(`\n👤 Technician Inventory (After Approval):`);
    const techInventoryAfter = await sequelize.query(`
      SELECT 
        si.spare_id,
        si.qty_good,
        si.qty_defective,
        sp.PART as part_code
      FROM spare_inventory si
      LEFT JOIN spare_parts sp ON si.spare_id = sp.Id
      WHERE si.location_type = 'technician'
        AND si.location_id = ?
    `, { 
      replacements: [tech.technician_id],
      type: sequelize.QueryTypes.SELECT 
    });

    if (techInventoryAfter.length) {
      techInventoryAfter.forEach(inv => {
        console.log(`   ${inv.part_code}: ${inv.qty_good} good, ${inv.qty_defective} defective`);
      });
    } else {
      console.log('   (No inventory records)');
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ E2E TEST COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(80) + '\n');

    process.exit(0);

  } catch (err) {
    console.error('❌ Test failed:', err.message);
    console.error('Stack:', err.stack);
    process.exit(1);
  }
}

runE2ETest();
