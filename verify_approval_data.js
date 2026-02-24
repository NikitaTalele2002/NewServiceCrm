/**
 * Database Query Script - Verify Approval Data
 * 
 * This script directly queries the database to verify that:
 * 1. Approval records are created in the approvals table
 * 2. Stock movement records are created in the stock_movement table
 * 3. Goods movement items are created in the goods_movement_items table
 * 4. Inventory is updated in both locations
 * 5. Return request status is updated
 */

import { sequelize } from './server/db.js';
import { QueryTypes } from 'sequelize';

const REQUEST_ID = 50; // Change this to the return request ID you're testing

async function verifyApprovalData() {
  try {
    console.log('\n========================================');
    console.log('🔍 DATABASE VERIFICATION SCRIPT');
    console.log('========================================\n');
    console.log(`Checking data for Return Request ID: ${REQUEST_ID}\n`);

    // 1. Check RETURN REQUEST
    console.log('1️⃣ RETURN REQUEST STATUS:');
    const [returnRequest] = await sequelize.query(`
      SELECT 
        request_id,
        status_id,
        s.status_name,
        requested_source_id,
        requested_to_id
      FROM spare_requests sr
      LEFT JOIN status s ON sr.status_id = s.status_id
      WHERE request_id = ?
    `, {
      replacements: [REQUEST_ID],
      type: QueryTypes.SELECT
    });

    if (!returnRequest) {
      console.log('❌ Return request not found!');
      return;
    }

    console.log(`  ✅ Found Return Request:`);
    console.log(`     ID: ${returnRequest.request_id}`);
    console.log(`     Status: ${returnRequest.status_name}`);
    console.log(`     From Technician ID: ${returnRequest.requested_source_id}`);
    console.log(`     To Service Center ID: ${returnRequest.requested_to_id}`);

    // 2. Check APPROVAL RECORDS
    console.log('\n2️⃣ APPROVAL RECORDS:');
    const approvals = await sequelize.query(`
      SELECT 
        approval_id,
        entity_type,
        entity_id,
        approval_level,
        approver_user_id,
        approval_status,
        approval_remarks,
        approved_at,
        created_at
      FROM approvals
      WHERE entity_type = 'return_request' AND entity_id = ?
      ORDER BY created_at DESC
    `, {
      replacements: [REQUEST_ID],
      type: QueryTypes.SELECT
    });

    if (approvals.length > 0) {
      console.log(`  ✅ Found ${approvals.length} approval record(s):`);
      approvals.forEach((apr, idx) => {
        console.log(`\n     Approval ${idx + 1}:`);
        console.log(`     - ID: ${apr.approval_id}`);
        console.log(`     - Entity: ${apr.entity_type} #${apr.entity_id}`);
        console.log(`     - Approver ID: ${apr.approver_user_id}`);
        console.log(`     - Status: ${apr.approval_status}`);
        console.log(`     - Remarks: ${apr.approval_remarks || '(none)'}`);
        console.log(`     - Approved At: ${apr.approved_at}`);
      });
    } else {
      console.log(`  ❌ NO approval records found for return request ${REQUEST_ID}`);
      console.log(`     Expected: At least 1 approval with entity_type='return_request'`);
    }

    // 3. Check STOCK MOVEMENT
    console.log('\n3️⃣ STOCK MOVEMENT RECORDS:');
    const movements = await sequelize.query(`
      SELECT 
        movement_id,
        movement_type,
        reference_type,
        reference_no,
        source_location_type,
        source_location_id,
        destination_location_type,
        destination_location_id,
        total_qty,
        status,
        movement_date,
        created_by,
        created_at
      FROM stock_movement
      WHERE reference_type = 'return_request' AND reference_no LIKE 'RET-%' + CAST(? AS VARCHAR)
      ORDER BY created_at DESC
    `, {
      replacements: [REQUEST_ID],
      type: QueryTypes.SELECT
    });

    if (movements.length > 0) {
      console.log(`  ✅ Found ${movements.length} stock movement record(s):`);
      movements.forEach((mov, idx) => {
        console.log(`\n     Movement ${idx + 1}:`);
        console.log(`     - ID: ${mov.movement_id}`);
        console.log(`     - Reference: ${mov.reference_no}`);
        console.log(`     - Type: ${mov.movement_type}`);
        console.log(`     - From: ${mov.source_location_type} (ID: ${mov.source_location_id})`);
        console.log(`     - To: ${mov.destination_location_type} (ID: ${mov.destination_location_id})`);
        console.log(`     - Total Qty: ${mov.total_qty}`);
        console.log(`     - Status: ${mov.status}`);
        console.log(`     - Created: ${mov.created_at}`);
      });
    } else {
      console.log(`  ❌ NO stock movement records found`);
      console.log(`     Expected: At least 1 movement with reference_type='return_request'`);
    }

    // 4. Check GOODS MOVEMENT ITEMS
    console.log('\n4️⃣ GOODS MOVEMENT ITEMS:');
    const goodsMovements = await sequelize.query(`
      SELECT 
        gmi.movement_id,
        gmi.spare_part_id,
        sp.PART,
        sp.DESCRIPTION,
        gmi.qty,
        gmi.condition,
        gmi.created_at
      FROM goods_movement_items gmi
      LEFT JOIN spare_parts sp ON gmi.spare_part_id = sp.Id
      WHERE gmi.movement_id IN (
        SELECT movement_id FROM stock_movement 
        WHERE reference_type = 'return_request' AND reference_no LIKE 'RET-%' + CAST(? AS VARCHAR)
      )
      ORDER BY gmi.created_at DESC
    `, {
      replacements: [REQUEST_ID],
      type: QueryTypes.SELECT
    });

    if (goodsMovements.length > 0) {
      console.log(`  ✅ Found ${goodsMovements.length} goods movement item(s):`);
      goodsMovements.forEach((item, idx) => {
        console.log(`\n     Item ${idx + 1}:`);
        console.log(`     - Movement ID: ${item.movement_id}`);
        console.log(`     - Spare Part ID: ${item.spare_part_id}`);
        console.log(`     - Part Code: ${item.PART}`);
        console.log(`     - Description: ${item.DESCRIPTION}`);
        console.log(`     - Quantity: ${item.qty}`);
        console.log(`     - Condition: ${item.condition}`);
        console.log(`     - Created: ${item.created_at}`);
      });
    } else {
      console.log(`  ❌ NO goods movement items found`);
      console.log(`     Expected: Items linked to the stock movement`);
    }

    // 5. Check INVENTORY CHANGES
    console.log('\n5️⃣ INVENTORY UPDATES:');
    
    const technicianId = returnRequest.requested_source_id;
    const serviceCenterId = returnRequest.requested_to_id;

    const [techInv] = await sequelize.query(`
      SELECT 
        spare_id,
        qty_good,
        qty_defective,
        updated_at
      FROM spare_inventory
      WHERE location_type = 'technician' AND location_id = ?
      LIMIT 1
    `, {
      replacements: [technicianId],
      type: QueryTypes.SELECT
    });

    const [scInv] = await sequelize.query(`
      SELECT 
        spare_id,
        qty_good,
        qty_defective,
        updated_at
      FROM spare_inventory
      WHERE location_type = 'service_center' AND location_id = ?
      LIMIT 1
    `, {
      replacements: [serviceCenterId],
      type: QueryTypes.SELECT
    });

    if (techInv) {
      console.log(`\n  ✅ Technician ${technicianId} inventory:`);
      console.log(`     - Total Good: ${techInv.qty_good}`);
      console.log(`     - Total Defective: ${techInv.qty_defective}`);
      console.log(`     - Last Updated: ${techInv.updated_at}`);
    }

    if (scInv) {
      console.log(`\n  ✅ Service Center ${serviceCenterId} inventory:`);
      console.log(`     - Total Good: ${scInv.qty_good}`);
      console.log(`     - Total Defective: ${scInv.qty_defective}`);
      console.log(`     - Last Updated: ${scInv.updated_at}`);
    }

    // 6. Check SPARE REQUEST ITEMS
    console.log('\n6️⃣ SPARE REQUEST ITEMS:');
    const requestItems = await sequelize.query(`
      SELECT 
        sri.id,
        sri.spare_id,
        sp.PART,
        sp.DESCRIPTION,
        sri.requested_qty,
        sri.approved_qty,
        sri.created_at,
        sri.updated_at
      FROM spare_request_items sri
      LEFT JOIN spare_parts sp ON sri.spare_id = sp.Id
      WHERE sri.request_id = ?
    `, {
      replacements: [REQUEST_ID],
      type: QueryTypes.SELECT
    });

    if (requestItems.length > 0) {
      console.log(`  ✅ Found ${requestItems.length} item(s) in request:`);
      requestItems.forEach((item, idx) => {
        console.log(`\n     Item ${idx + 1}:`);
        console.log(`     - Part: ${item.PART} (${item.DESCRIPTION})`);
        console.log(`     - Requested Qty: ${item.requested_qty}`);
        console.log(`     - Approved Qty: ${item.approved_qty}`);
        console.log(`     - Status: ${item.approved_qty > 0 ? '✅ APPROVED' : '⏳ PENDING'}`);
      });
    }

    // Summary
    console.log('\n========================================');
    console.log('📋 VERIFICATION SUMMARY');
    console.log('========================================\n');

    const hasApprovals = approvals.length > 0;
    const hasMovements = movements.length > 0;
    const hasGoodsMovements = goodsMovements.length > 0;

    console.log(`✅ Approvals Table: ${hasApprovals ? '✓ Records created' : '✗ NO records'}`);
    console.log(`✅ Stock Movement Table: ${hasMovements ? '✓ Records created' : '✗ NO records'}`);
    console.log(`✅ Goods Movement Items Table: ${hasGoodsMovements ? '✓ Records created' : '✗ NO records'}`);
    console.log(`✅ Return Request Status: ${returnRequest.status_name || 'UNKNOWN'}`);
    console.log(`✅ Inventory Updated: ${(techInv || scInv) ? '✓ Yes' : '✗ No'}`);

    if (hasApprovals && hasMovements && hasGoodsMovements) {
      console.log('\n🎉 ALL VERIFICATION CHECKS PASSED!\n');
    } else {
      console.log('\n⚠️  Some checks failed. Review the output above.\n');
    }

  } catch (error) {
    console.error('\n❌ ERROR during verification:');
    console.error(error.message);
    console.error(error.stack);
  } finally {
    await sequelize.close();
  }
}

// Run verification
verifyApprovalData().catch(console.error);
