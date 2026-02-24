/**
 * Debug Script: Check why inventory validation might not be working
 * This script will examine a specific spare request and its inventory
 */

import { sequelize } from './db.js';

async function debugApprovalInventory(requestId = null) {
  try {
    console.log('=== Debugging Inventory-Based Approval ===\n');

    // Get latest pending request if no ID provided
    let request;
    if (requestId) {
      request = await sequelize.query(`
        SELECT TOP 1 * FROM spare_requests WHERE request_id = ?
      `, {
        replacements: [requestId],
        type: sequelize.QueryTypes.SELECT
      });
    } else {
      request = await sequelize.query(`
        SELECT TOP 1 * FROM spare_requests 
        WHERE status_id IN (SELECT status_id FROM status WHERE status_name = 'pending')
        ORDER BY request_id DESC
      `, {
        type: sequelize.QueryTypes.SELECT
      });
    }

    if (!request || request.length === 0) {
      console.log('❌ No request found');
      console.log('\nTo debug, create a pending spare request first:\n');
      console.log('1. Create spare request via frontend');
      console.log('2. Run: node debug_inventory_approval.js <request_id>');
      process.exit(0);
    }

    const req = request[0];
    console.log('✅ Found Spare Request:\n');
    console.log(`  Request ID: ${req.request_id}`);
    console.log(`  Requested From: ${req.requested_source_type} (ID: ${req.requested_source_id})`);
    console.log(`  Requested To: ${req.requested_to_type} (ID: ${req.requested_to_id})`);
    console.log(`  Status ID: ${req.status_id}`);
    console.log(`  Created At: ${req.created_at}\n`);

    // Validation Check 1: Source info present
    if (!req.requested_source_id || !req.requested_source_type) {
      console.log('❌ ERROR: Request missing source information!');
      console.log('   requested_source_type:', req.requested_source_type);
      console.log('   requested_source_id:', req.requested_source_id);
      console.log('\n⚠️  This is why inventory check is not working!');
      process.exit(1);
    }

    // Get request items
    const items = await sequelize.query(`
      SELECT 
        sri.id,
        sri.request_id,
        sri.spare_id,
        sri.requested_qty,
        sri.approved_qty,
        sp.PART,
        sp.BRAND,
        sp.DESCRIPTION
      FROM spare_request_items sri
      LEFT JOIN spare_parts sp ON sri.spare_id = sp.Id
      WHERE sri.request_id = ?
      ORDER BY sri.id
    `, {
      replacements: [req.request_id],
      type: sequelize.QueryTypes.SELECT
    });

    console.log(`Items in Request (${items.length}):\n`);
    console.log('┌────┬──────────┬──────────────┬──────────────────────────┐');
    console.log('│ ID │ Spare ID │ Requested    │ Part Code                │');
    console.log('├────┼──────────┼──────────────┼──────────────────────────┤');

    for (const item of items) {
      const id = String(item.id || '').padEnd(4);
      const spareId = String(item.spare_id || '').padEnd(8);
      const reqQty = String(item.requested_qty || 0).padEnd(12);
      const partCode = (item.PART || 'Unknown').substring(0, 26).padEnd(26);
      console.log(`│ ${id} │ ${spareId} │ ${reqQty} │ ${partCode} │`);
    }
    console.log('└────┴──────────┴──────────────┴──────────────────────────┘\n');

    // For each item, check inventory at requesting location
    console.log('Inventory Check at Requesting Location:');
    console.log(`(location_type='${req.requested_source_type}', location_id=${req.requested_source_id})\n`);
    console.log('┌────┬──────────┬──────────────┬─────────────────────────────────┐');
    console.log('│ ID │ Spare ID │ Available    │ Status                          │');
    console.log('├────┼──────────┼──────────────┼─────────────────────────────────┤');

    let allHaveInventory = true;

    for (const item of items) {
      const inventory = await sequelize.query(`
        SELECT TOP 1
          spare_inventory_id,
          location_type,
          location_id,
          qty_good,
          qty_defective
        FROM spare_inventory
        WHERE spare_id = ? 
          AND location_type = ? 
          AND location_id = ?
      `, {
        replacements: [item.spare_id, req.requested_source_type, req.requested_source_id],
        type: sequelize.QueryTypes.SELECT
      });

      const availableQty = inventory && inventory.length > 0 ? inventory[0].qty_good : 0;
      const hasInventory = inventory && inventory.length > 0;
      
      if (!hasInventory) {
        allHaveInventory = false;
      }

      let status = '';
      if (!hasInventory) {
        status = '❌ NO INVENTORY RECORD';
      } else if (availableQty === 0) {
        status = '⚠️  0 UNITS - CANNOT APPROVE';
      } else {
        status = `✅ ${availableQty} units available`;
      }

      const id = String(item.id || '').padEnd(4);
      const spareId = String(item.spare_id || '').padEnd(8);
      const availQty = String(availableQty).padEnd(12);

      console.log(`│ ${id} │ ${spareId} │ ${availQty} │ ${status.padEnd(31)} │`);
    }
    console.log('└────┴──────────┴──────────────┴─────────────────────────────────┘\n');

    // Summary
    console.log('📊 Diagnosis Summary:');
    console.log(`  ✅ Request has source info: YES`);
    console.log(`  ${allHaveInventory ? '✅' : '❌'} All items have inventory records: ${allHaveInventory ? 'YES' : 'NO'}`);
    console.log(`  ${allHaveInventory ? '✅' : '⚠️'} Inventory check should work: ${allHaveInventory ? 'YES' : 'PARTIAL - Some items missing'}`);

    if (!allHaveInventory) {
      console.log('\n⚠️  ACTION REQUIRED:');
      console.log('   Some items have no inventory record at the requesting location.');
      console.log('   The system cannot limit approval quantities.');
      console.log('\n   Fix: Run this to add inventory records:');
      console.log('   INSERT INTO spare_inventory (spare_id, location_type, location_id, qty_good, qty_defective)');
      console.log(`   VALUES (spare_id, '${req.requested_source_type}', ${req.requested_source_id}, qty, 0);`);
    } else {
      console.log('\n✅ Inventory check should be working!');
      console.log('   If approval is still not being limited, there may be a code issue.');
      console.log('   Check server logs when approving: should see [INVENTORY CHECK] lines');
    }

    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Get request ID from command line or use null to get latest
const requestId = process.argv[2] ? parseInt(process.argv[2]) : null;
debugApprovalInventory(requestId);
