/**
 * Verify Inventory-Based Approval Logic
 * Check that approved quantities are limited by available inventory
 */

import { sequelize } from './db.js';

async function verifyApprovalLogic() {
  try {
    console.log('=== Inventory-Based Approval Verification ===\n');

    // Get recent spare requests
    const spareRequests = await sequelize.query(`
      SELECT 
        sr.request_id,
        sr.requested_source_id,
        sr.requested_source_type,
        sri.id as item_id,
        sri.spare_id,
        sri.requested_qty,
        sri.approved_qty,
        si.qty_good as available_qty,
        sp.PART,
        sp.BRAND
      FROM spare_requests sr
      JOIN spare_request_items sri ON sr.request_id = sri.request_id
      LEFT JOIN spare_inventory si ON sri.spare_id = si.spare_id 
        AND si.location_type = sr.requested_source_type 
        AND si.location_id = sr.requested_source_id
      LEFT JOIN spare_parts sp ON sri.spare_id = sp.Id
      WHERE sr.status_id = (
        SELECT TOP 1 status_id FROM status WHERE status_name = 'approved_by_rsm'
      )
      ORDER BY sr.request_id DESC 
      OFFSET 0 ROWS FETCH NEXT 10 ROWS ONLY;
    `);

    if (spareRequests[0].length === 0) {
      console.log('No approved spare requests found.');
      console.log('\nTo test:');
      console.log('1. Create a spare request');
      console.log('2. Approve it as RSM');
      console.log('3. Run this check again');
      process.exit(0);
    }

    console.log('✅ Approved Spare Requests Found:\n');
    console.log('┌─────────────┬──────────┬───────────────┬─────────────┬─────────────┬───────────────────┐');
    console.log('│ Request ID  │ Spare ID │ Requested Qty │ Approved Qty│ Available   │ Status            │');
    console.log('├─────────────┼──────────┼───────────────┼─────────────┼─────────────┼───────────────────┤');

    let validCount = 0;
    let invalidCount = 0;

    spareRequests[0].forEach(row => {
      const requestedQty = parseInt(row.requested_qty) || 0;
      const approvedQty = parseInt(row.approved_qty) || 0;
      const availableQty = parseInt(row.available_qty) || 0;

      const isValid = approvedQty <= requestedQty && approvedQty <= availableQty;
      const status = isValid ? '✅ Valid' : '❌ INVALID';
      
      if (isValid) {
        validCount++;
      } else {
        invalidCount++;
      }

      const reqId = String(row.request_id).padEnd(11);
      const spareId = String(row.spare_id).padEnd(8);
      const reqQty = String(requestedQty).padEnd(13);
      const appQty = String(approvedQty).padEnd(11);
      const availQty = String(availableQty).padEnd(11);

      console.log(`│ ${reqId} │ ${spareId} │ ${reqQty} │ ${appQty} │ ${availQty} │ ${status.padEnd(17)} │`);
    });

    console.log('└─────────────┴──────────┴───────────────┴─────────────┴─────────────┴───────────────────┘');

    console.log(`\n📊 Summary:`);
    console.log(`✅ Valid approvals (approved_qty <= min(requested_qty, available_qty)): ${validCount}`);
    console.log(`❌ Invalid approvals: ${invalidCount}`);

    if (invalidCount > 0) {
      console.log('\n⚠️  ISSUE FOUND: Some approved quantities exceed available inventory!');
      console.log('This indicates inventory check logic is not working properly.');
      process.exit(1);
    } else {
      console.log('\n✅ All approvals respect inventory constraints!');
      process.exit(0);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

verifyApprovalLogic();
