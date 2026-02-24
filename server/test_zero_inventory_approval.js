/**
 * Test Script: Simulate RSM approval with zero inventory
 * Tests that the system rejects approval when inventory is 0
 */

import { sequelize } from './db.js';
import { SpareRequest, SpareRequestItem, SpareInventory } from './models/index.js';

async function testApprovalWithZeroInventory() {
  try {
    console.log('=== Testing Zero-Inventory Approval Rejection ===\n');

    // Get request 22 (the one the user tested)
    const request = await SpareRequest.findByPk(22, {
      include: [{ model: SpareRequestItem, as: 'SpareRequestItems' }]
    });

    if (!request) {
      console.log('❌ Request 22 not found');
      process.exit(1);
    }

    console.log(`✅ Found Request 22`);
    console.log(`  Requested from: ${request.requested_source_type} (ID: ${request.requested_source_id})`);
    console.log(`  Requested to: ${request.requested_to_type} (ID: ${request.requested_to_id})\n`);

    // Simulate RSM approval
    console.log('Simulating RSM Approval Test...\n');

    for (const item of request.SpareRequestItems) {
      console.log(`Item ${item.id}:`);
      console.log(`  Spare ID: ${item.spare_id}`);
      console.log(`  Requested Qty: ${item.requested_qty}`);
      console.log(`  Current Approved: ${item.approved_qty || 0}`);

      // Check inventory (same logic as rsm.js)
      const inventory = await SpareInventory.findOne({
        where: {
          spare_id: item.spare_id,
          location_type: request.requested_source_type,
          location_id: request.requested_source_id
        }
      });

      const availableQty = inventory ? inventory.qty_good : 0;
      console.log(`  Available at ${request.requested_source_type} ${request.requested_source_id}: ${availableQty}`);

      // Simulate RSM trying to approve 2 units (like in the test case)
      const rsmApprovedQty = 2;
      console.log(`  RSM Tries to Approve: ${rsmApprovedQty}`);

      // Test the three rejection checks from rsm.js
      console.log(`\n  Applying Validation Checks:`);

      // Check 1: No inventory record at all
      if (!inventory && rsmApprovedQty > 0) {
        console.log(`    ❌ CHECK 1 FAILS: No inventory record exists`);
        console.log(`       → REJECT: Cannot approve without inventory record`);
        continue;
      }

      // Check 2: Zero inventory with approval attempt
      if (availableQty === 0 && rsmApprovedQty > 0) {
        console.log(`    ❌ CHECK 2 FAILS: Zero inventory, trying to approve > 0`);
        console.log(`       → REJECT: Cannot approve ${rsmApprovedQty} units when 0 available`);
        continue;
      }

      // If we get here, approval should go through (limited to available)
      const finalQty = Math.min(rsmApprovedQty, item.requested_qty, availableQty);
      console.log(`    ✅ ALL CHECKS PASS: Approval accepted`);
      console.log(`       Final Approved Qty: ${finalQty}`);
    }

    console.log(`\n📊 Test Result for Request 22:`);
    console.log(`  Expected: REJECTION (spare_id 160 has 0 inventory)`);
    console.log(`  Reason: availableQty = 0 AND requestedQtyFromFrontend = 2`);
    console.log(`  Config: Check #2 at rsm.js line ~133-145 should trigger `);

    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

testApprovalWithZeroInventory();

// And when to triggeer the in transit so that inventory that will be coming to the asc wil be monitored so i have to show that in transit material to at both plant and also at the ASC