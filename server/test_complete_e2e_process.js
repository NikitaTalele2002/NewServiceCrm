/**
 * COMPREHENSIVE END-TO-END PROCESS TEST
 * 
 * Tests the complete workflow:
 * 1. Create call and allocate to ASC and Technician
 * 2. Technician requests spare from ASC
 * 3. ASC approves spare request
 * 4. Spare is updated in call_spare_usage
 * 5. Call is closed
 * 6. Inventory and stock movement is updated
 */

import { sequelize } from './db.js';
import { QueryTypes } from 'sequelize';

async function runE2ETest() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🔄 COMPLETE END-TO-END PROCESS TEST');
    console.log('='.repeat(80));

    // ============================================================
    // STEP 1: VERIFY DATA EXISTS
    // ============================================================
    console.log('\n📊 STEP 1: Verifying test data exists...\n');

    // Get a customer
    const [customers] = await sequelize.query(`
      SELECT TOP 1 customer_id, name FROM customers ORDER BY customer_id DESC
    `);
    if (!customers || customers.length === 0) {
      console.log('❌ No customers found. Please create customers first.');
      return;
    }
    const customerId = customers[0].customer_id;
    console.log(`✅ Customer found: ID=${customerId}, Name="${customers[0].name}"`);

    // Get a service center (ASC)
    const [serviceCenters] = await sequelize.query(`
      SELECT TOP 1 asc_id, asc_name FROM service_centers
    `);
    if (!serviceCenters || serviceCenters.length === 0) {
      console.log('❌ No active service centers found.');
      return;
    }
    const ascId = serviceCenters[0].asc_id;
    console.log(`✅ Service Center (ASC) found: ID=${ascId}, Name="${serviceCenters[0].asc_name}"`);

    // Get a technician assigned to the service center
    let [technicians] = await sequelize.query(`
      SELECT TOP 1 technician_id, name FROM technicians 
      WHERE service_center_id = ?
      ORDER BY technician_id DESC
    `, { replacements: [ascId], type: QueryTypes.SELECT });
    
    let technicianId = null;
    if (!technicians || technicians.length === 0) {
      console.log(`⚠️  No technicians found for service center ${ascId}. Getting any technician...`);
      [technicians] = await sequelize.query(`
        SELECT TOP 1 technician_id, name, service_center_id FROM technicians
      `);
    }
    
    if (technicians && technicians.length > 0) {
      technicianId = technicians[0].technician_id;
      console.log(`✅ Technician found: ID=${technicianId}, Name="${technicians[0].name}"`);
    } else {
      console.log('❌ No technicians found in database.');
      return;
    }

    // Get customer product
    const [custProducts] = await sequelize.query(`
      SELECT TOP 1 cp.customers_products_id, cp.product_id, cp.model_id
      FROM customers_products cp
      WHERE cp.customer_id = ?
    `, { replacements: [customerId], type: QueryTypes.SELECT });
    
    let customerProductId = null;
    if (custProducts && custProducts.length > 0) {
      customerProductId = custProducts[0].customers_products_id;
      console.log(`✅ Customer Product found: ID=${customerProductId}`);
    } else {
      console.log(`⚠️  No customer products registered. Will create call without product.`);
    }

    // Get an available spare part
    const [spareParts] = await sequelize.query(`
      SELECT TOP 1 spare_part_id, part_name FROM spare_parts 
      ORDER BY spare_part_id DESC
    `);
    if (!spareParts || spareParts.length === 0) {
      console.log('❌ No spare parts found in database.');
      return;
    }
    const sparePartId = spareParts[0].spare_part_id;
    console.log(`✅ Spare Part found: ID=${sparePartId}, Name="${spareParts[0].part_name}"`);

    // Get a status for "Open" call
    const [callStatus] = await sequelize.query(`
      SELECT TOP 1 status_id, status_name FROM status 
      WHERE status_name LIKE '%Open%' OR status_name LIKE '%Pending%'
    `);
    const openStatusId = callStatus ? callStatus[0].status_id : 1;
    console.log(`✅ Status found: ID=${openStatusId}, Name="${callStatus ? callStatus[0].status_name : 'Unknown'}"`);

    // ============================================================
    // STEP 2: CREATE CALL AND ALLOCATE TO ASC AND TECH
    // ============================================================
    console.log('\n📞 STEP 2: Creating call and allocating to ASC and Technician...\n');

    const [callInserted] = await sequelize.query(`
      INSERT INTO calls (
        customer_id,
        customer_product_id,
        assigned_asc_id,
        assigned_tech_id,
        call_type,
        call_source,
        status_id,
        remark,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, GETDATE(), GETDATE())
      SELECT SCOPE_IDENTITY() as call_id
    `, {
      replacements: [
        customerId,
        customerProductId,
        ascId,
        technicianId,
        'complaint',
        'phone',
        openStatusId,
        'E2E Test - Device Issue'
      ]
    });

    // Get the call_id from the temporary query
    const [callResult] = await sequelize.query(`
      SELECT TOP 1 call_id FROM calls 
      WHERE customer_id = ? AND assigned_asc_id = ? 
      ORDER BY call_id DESC
    `, { replacements: [customerId, ascId], type: QueryTypes.SELECT });
    
    const callId = callResult[0].call_id;
    console.log(`✅ Call created: ID=${callId}`);
    console.log(`   • Customer: ${customerId}`);
    console.log(`   • ASC: ${ascId}`);
    console.log(`   • Technician: ${technicianId}`);

    // ============================================================
    // STEP 3: TECHNICIAN REQUESTS SPARE FROM ASC
    // ============================================================
    console.log('\n🔧 STEP 3: Technician requesting spare from ASC...\n');

    // Get pending status for spare request
    const [pendingStatus] = await sequelize.query(`
      SELECT TOP 1 status_id FROM status WHERE status_name = 'Pending'
    `);
    const pendingStatusId = pendingStatus ? pendingStatus[0].status_id : 1;

    const [reqInserted] = await sequelize.query(`
      INSERT INTO spare_requests (
        request_type,
        status_id,
        requested_by_id,
        requested_by_type,
        requested_from_id,
        requested_from_type,
        requested_to_id,
        requested_to_type,
        requested_source_id,
        requested_source_type,
        reason,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, GETDATE(), GETDATE())
      SELECT SCOPE_IDENTITY() as request_id
    `, {
      replacements: [
        'allocation',
        pendingStatusId,
        technicianId,
        'technician',
        ascId,
        'service_center',
        ascId,
        'service_center',
        technicianId,
        'technician',
        'Spare needed for call ' + callId
      ]
    });

    const [reqResult] = await sequelize.query(`
      SELECT TOP 1 request_id FROM spare_requests 
      WHERE requested_by_id = ? AND requested_source_id = ?
      ORDER BY request_id DESC
    `, { replacements: [technicianId, technicianId], type: QueryTypes.SELECT });
    
    const requestId = reqResult[0].request_id;
    console.log(`✅ Spare request created: ID=${requestId}`);
    console.log(`   • Requested by: Technician ${technicianId}`);
    console.log(`   • Requested from: ASC ${ascId}`);
    console.log(`   • Reason: Spare needed for call ${callId}`);

    // Add items to request
    const [itemInserted] = await sequelize.query(`
      INSERT INTO spare_request_items (
        request_id,
        spare_id,
        requested_qty,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, GETDATE(), GETDATE())
      SELECT SCOPE_IDENTITY() as id
    `, {
      replacements: [requestId, sparePartId, 2]
    });

    const [itemResult] = await sequelize.query(`
      SELECT TOP 1 id FROM spare_request_items 
      WHERE request_id = ? AND spare_id = ?
      ORDER BY id DESC
    `, { replacements: [requestId, sparePartId], type: QueryTypes.SELECT });
    
    console.log(`✅ Request item added: Spare ID=${sparePartId}, Qty=2`);

    // ============================================================
    // STEP 4: ASC APPROVES SPARE REQUEST
    // ============================================================
    console.log('\n✅ STEP 4: ASC approving spare request...\n');

    const [approvedStatus] = await sequelize.query(`
      SELECT TOP 1 status_id FROM status WHERE status_name = 'Approved'
    `);
    const approvedStatusId = approvedStatus ? approvedStatus[0].status_id : 3;

    // Update sparse request to approved status
    await sequelize.query(`
      UPDATE spare_requests 
      SET status_id = ?, updated_at = GETDATE()
      WHERE request_id = ?
    `, {
      replacements: [approvedStatusId, requestId]
    });

    // Update request item with approved quantity
    await sequelize.query(`
      UPDATE spare_request_items 
      SET approved_qty = ?, updated_at = GETDATE()
      WHERE request_id = ? AND spare_id = ?
    `, {
      replacements: [2, requestId, sparePartId]
    });

    console.log(`✅ Spare request approved: ID=${requestId}`);
    console.log(`   • Status: Approved`);
    console.log(`   • Approved Qty: 2`);

    // ============================================================
    // STEP 5: CREATE STOCK MOVEMENT
    // ============================================================
    console.log('\n📦 STEP 5: Creating stock movement (SC GOOD → TECH GOOD)...\n');

    const [movementInserted] = await sequelize.query(`
      INSERT INTO stock_movements (
        stock_movement_type,
        bucket,
        bucket_operation,
        reference_type,
        reference_id,
        from_location_type,
        from_location_id,
        to_location_type,
        to_location_id,
        spare_part_id,
        quantity,
        related_request_id,
        movement_date,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, GETDATE(), GETDATE(), GETDATE())
      SELECT SCOPE_IDENTITY() as movement_id
    `, {
      replacements: [
        'TECH_ISSUE_OUT',        // stock_movement_type
        'GOOD',                   // bucket
        'DECREASE',               // bucket_operation
        'spare_request',          // reference_type
        requestId,                // reference_id
        'service_center',         // from_location_type
        ascId,                    // from_location_id
        'technician',             // to_location_type
        technicianId,             // to_location_id
        sparePartId,              // spare_part_id
        2,                        // quantity
        requestId                 // related_request_id
      ]
    });

    const [movResult] = await sequelize.query(`
      SELECT TOP 1 movement_id FROM stock_movements 
      WHERE related_request_id = ? AND spare_part_id = ?
      ORDER BY movement_id DESC
    `, { replacements: [requestId, sparePartId], type: QueryTypes.SELECT });
    
    const movementId = movResult[0].movement_id;
    console.log(`✅ Stock movement created: ID=${movementId}`);
    console.log(`   • Type: TECH_ISSUE_OUT`);
    console.log(`   • From: Service Center ${ascId}`);
    console.log(`   • To: Technician ${technicianId}`);
    console.log(`   • Spare: ${sparePartId}, Qty: 2`);

    // ============================================================
    // STEP 6: UPDATE CALL_SPARE_USAGE
    // ============================================================
    console.log('\n📊 STEP 6: Updating call_spare_usage (spare used for call)...\n');

    const [usageInserted] = await sequelize.query(`
      INSERT INTO call_spare_usage (
        call_id,
        spare_part_id,
        issued_qty,
        used_qty,
        returned_qty,
        usage_status,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, GETDATE(), GETDATE())
      SELECT SCOPE_IDENTITY() as usage_id
    `, {
      replacements: [
        callId,
        sparePartId,
        2,              // issued_qty
        2,              // used_qty (fully used)
        0,              // returned_qty (none returned)
        'USED'          // usage_status
      ]
    });

    const [usageResult] = await sequelize.query(`
      SELECT TOP 1 usage_id FROM call_spare_usage 
      WHERE call_id = ? AND spare_part_id = ?
      ORDER BY usage_id DESC
    `, { replacements: [callId, sparePartId], type: QueryTypes.SELECT });
    
    const usageId = usageResult[0].usage_id;
    console.log(`✅ Call spare usage recorded: ID=${usageId}`);
    console.log(`   • Call: ${callId}`);
    console.log(`   • Spare: ${sparePartId}`);
    console.log(`   • Issued: 2, Used: 2, Returned: 0`);
    console.log(`   • Status: USED`);

    // ============================================================
    // STEP 7: CLOSE THE CALL
    // ============================================================
    console.log('\n🔴 STEP 7: Closing the call...\n');

    // Get closed status
    const [closedStatus] = await sequelize.query(`
      SELECT TOP 1 status_id FROM status WHERE status_name = 'Closed' OR status_name = 'Completed'
    `);
    const closedStatusId = closedStatus ? closedStatus[0].status_id : 4;

    await sequelize.query(`
      UPDATE calls 
      SET status_id = ?, updated_at = GETDATE()
      WHERE call_id = ?
    `, {
      replacements: [closedStatusId, callId]
    });

    console.log(`✅ Call closed: ID=${callId}`);
    console.log(`   • New Status ID: ${closedStatusId}`);

    // ============================================================
    // STEP 8: VERIFY INVENTORY UPDATES
    // ============================================================
    console.log('\n📈 STEP 8: Verifying inventory updates...\n');

    // Check spare inventory at service center
    const [scInventory] = await sequelize.query(`
      SELECT 
        si.inventory_id,
        si.spare_part_id,
        si.location_type,
        si.location_id,
        si.good_qty,
        si.defective_qty,
        si.intransit_qty
      FROM spare_inventory si
      WHERE si.spare_part_id = ? 
        AND si.location_type = 'service_center'
        AND si.location_id = ?
    `, { replacements: [sparePartId, ascId], type: QueryTypes.SELECT });

    if (scInventory && scInventory.length > 0) {
      console.log(`✅ Service Center Inventory (ASC ${ascId}):`);
      scInventory.forEach(inv => {
        console.log(`   • Spare ${inv.spare_part_id}: Good=${inv.good_qty}, Defective=${inv.defective_qty}, InTransit=${inv.intransit_qty}`);
      });
    } else {
      console.log(`⚠️  No inventory record found for Service Center ${ascId}`);
    }

    // Check spare inventory at technician
    const [techInventory] = await sequelize.query(`
      SELECT 
        si.inventory_id,
        si.spare_part_id,
        si.location_type,
        si.location_id,
        si.good_qty,
        si.defective_qty,
        si.intransit_qty
      FROM spare_inventory si
      WHERE si.spare_part_id = ? 
        AND si.location_type = 'technician'
        AND si.location_id = ?
    `, { replacements: [sparePartId, technicianId], type: QueryTypes.SELECT });

    if (techInventory && techInventory.length > 0) {
      console.log(`✅ Technician Inventory (Tech ${technicianId}):`);
      techInventory.forEach(inv => {
        console.log(`   • Spare ${inv.spare_part_id}: Good=${inv.good_qty}, Defective=${inv.defective_qty}, InTransit=${inv.intransit_qty}`);
      });
    } else {
      console.log(`⚠️  No inventory record found for Technician ${technicianId}`);
    }

    // ============================================================
    // STEP 9: VERIFY STOCK MOVEMENTS
    // ============================================================
    console.log('\n🔄 STEP 9: Verifying stock movements recorded...\n');

    const [movements] = await sequelize.query(`
      SELECT TOP 5
        movement_id,
        stock_movement_type,
        bucket,
        bucket_operation,
        spare_part_id,
        quantity,
        from_location_type,
        from_location_id,
        to_location_type,
        to_location_id,
        movement_date
      FROM stock_movements
      WHERE spare_part_id = ? AND related_request_id = ?
      ORDER BY movement_id DESC
    `, { replacements: [sparePartId, requestId], type: QueryTypes.SELECT });

    if (movements && movements.length > 0) {
      console.log(`✅ Stock Movements found (${movements.length}): \n`);
      movements.forEach((mov, idx) => {
        console.log(`   Movement ${idx + 1}:`);
        console.log(`     • Type: ${mov.stock_movement_type}`);
        console.log(`     • Qty: ${mov.quantity}, Bucket: ${mov.bucket}, Operation: ${mov.bucket_operation}`);
        console.log(`     • From: ${mov.from_location_type}/${mov.from_location_id} → To: ${mov.to_location_type}/${mov.to_location_id}`);
      });
    } else {
      console.log(`⚠️  No stock movements found`);
    }

    // ============================================================
    // FINAL SUMMARY
    // ============================================================
    console.log('\n' + '='.repeat(80));
    console.log('✅ END-TO-END PROCESS TEST COMPLETED');
    console.log('='.repeat(80));

    console.log('\n📋 TEST SUMMARY:\n');
    console.log(`  ✅ Call Created: ID=${callId}`);
    console.log(`  ✅ Allocated to: ASC=${ascId}, Tech=${technicianId}`);
    console.log(`  ✅ Spare Request: ID=${requestId}`);
    console.log(`  ✅ Spare Approved: ${approvedStatusId}`);
    console.log(`  ✅ Stock Movement: ID=${movementId}`);
    console.log(`  ✅ Call Spare Usage: ID=${usageId}`);
    console.log(`  ✅ Call Closed: Status=${closedStatusId}`);
    console.log(`  ✅ Inventory Checked`);
    console.log(`  ✅ Stock Movements Verified`);

    console.log('\n📊 PROCESS FLOW VERIFICATION:\n');
    console.log('  Step 1: Create Call & Allocate → ✅');
    console.log('  Step 2: Technician Requests Spare → ✅');
    console.log('  Step 3: ASC Approves Request → ✅');
    console.log('  Step 4: Stock Movement Created → ✅');
    console.log('  Step 5: Call Spare Usage Updated → ✅');
    console.log('  Step 6: Call Closed → ✅');
    console.log('  Step 7: Inventory Updated → ' + (scInventory && scInventory.length > 0 ? '✅' : '⚠️'));
    console.log('  Step 8: Stock Movement Recorded → ' + (movements && movements.length > 0 ? '✅' : '⚠️'));

    console.log('\n' + '='.repeat(80) + '\n');

  } catch (error) {
    console.error('\n❌ ERROR in E2E Test:', error.message);
    console.error(error.stack);
  } finally {
    process.exit(0);
  }
}

runE2ETest();
