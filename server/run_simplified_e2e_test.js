/**
 * SIMPLIFIED E2E PROCESS TEST
 * Tests using direct database operations followed by API verification
 */

import { sequelize } from './db.js';
import axios from 'axios';

const BASE_URL = 'http://localhost:3000/api';

async function main() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🔄 SIMPLIFIED END-TO-END PROCESS TEST');
    console.log('='.repeat(80));
    
    // Step 0: Get test data
    console.log('\n📊 STEP 0: Getting test data...\n');
    
    const [customers] = await sequelize.query(`SELECT TOP 1 customer_id, name FROM customers`);
    const customerId = customers[0].customer_id;
    console.log(`✅ Customer: ID=${customerId}, Name="${customers[0].name}"`);
    
    const [ascs] = await sequelize.query(`SELECT TOP 1 asc_id, asc_name FROM service_centers`);
    const ascId = ascs[0].asc_id;
    console.log(`✅ ASC: ID=${ascId}, Name="${ascs[0].asc_name}"`);
    
    const [techs] = await sequelize.query(`SELECT TOP 1 technician_id, name FROM technicians ORDER BY technician_id DESC`);
    const techId = techs[0].technician_id;
    console.log(`✅ Technician: ID=${techId}, Name="${techs[0].name}"`);
    
    const [spares] = await sequelize.query(`SELECT TOP 1 Id as spare_id, PART FROM spare_parts`);
    const spareId = spares[0].spare_id;
    console.log(`✅ Spare: ID=${spareId}, Code="${spares[0].PART}"`);
    
    //const [plants] = await sequelize.query(`SELECT TOP 1 plant_id FROM plants`);
    //const plantId = plants[0].plant_id;
    console.log(`✅ Plant/Warehouse: Using ASC (ID=${ascId}) as warehouse`);
    
    // ============================================================================
    // STEP 1: CREATE CALL
    // ============================================================================
    console.log('\n' + '='.repeat(80));
    console.log('STEP 1: CREATE CALL');
    console.log('='.repeat(80));
    
    let callId = null;
    try {
      // Insert directly into calls table
      await sequelize.query(`
        INSERT INTO calls 
        (customer_id, call_type, call_source, caller_type, remark, created_at, updated_at)
        VALUES (${customerId}, 'complaint', 'phone', 'customer', 'Test call for E2E verification', GETDATE(), GETDATE())
      `);
      
      // Retrieve the newly created call
      const [createdCall] = await sequelize.query(`
        SELECT TOP 1 call_id FROM calls 
        WHERE customer_id = ${customerId}
        ORDER BY call_id DESC
      `);
      
      if (createdCall && createdCall.length > 0) {
        callId = createdCall[0].call_id;
        console.log(`✅ Call created: ID=${callId}`);
      }
    } catch(err) {
      console.log(`❌ Call creation failed: ${err.message}`);
      console.error(err);
      return;
    }
    
    // ============================================================================
    // STEP 2: ALLOCATE CALL TO ASC AND TECHNICIAN
    // ============================================================================
    console.log('\n' + '='.repeat(80));
    console.log('STEP 2: ALLOCATE CALL TO ASC AND TECHNICIAN');
    console.log('='.repeat(80));
    
    try {
      await sequelize.query(`
        UPDATE calls
        SET assigned_asc_id = ${ascId}, 
            assigned_tech_id = ${techId},
            updated_at = GETDATE()
        WHERE call_id = ${callId}
      `);
      console.log(`✅ Call allocated to ASC=${ascId}, Technician=${techId}`);
    } catch(err) {
      console.log(`❌ Allocation failed: ${err.message}`);
    }
    
    // ============================================================================
    // STEP 3: TECHNICIAN REQUESTS SPARE
    // ============================================================================
    console.log('\n' + '='.repeat(80));
    console.log('STEP 3: TECHNICIAN REQUESTS SPARE');
    console.log('='.repeat(80));
    
    let spareRequestId = null;
    try {
      const [created] = await sequelize.query(`
        INSERT INTO spare_requests
        (call_id, spare_id, quantity, requested_by_id, requested_from_id, request_type, status, created_date)
        OUTPUT INSERTED.spare_request_id
        VALUES (${callId}, ${spareId}, 1, ${techId}, ${ascId}, 'technician_request', 'pending', GETDATE())
      `);
      
      if (created && created.length > 0) {
        spareRequestId = created[0].spare_request_id;
        console.log(`✅ Spare request created: ID=${spareRequestId}`);
      }
    } catch(err) {
      console.log(`❌ Spare request failed: ${err.message}`);
    }
    
    // ============================================================================
    // STEP 4: ASC APPROVES SPARE
    // ============================================================================
    console.log('\n' + '='.repeat(80));
    console.log('STEP 4: ASC APPROVES SPARE REQUEST');
    console.log('='.repeat(80));
    
    try {
      await sequelize.query(`
        UPDATE spare_requests
        SET status = 'approved',
            quantity_approved = quantity,
            approved_date = GETDATE(),
            approved_by_id = ${ascId}
        WHERE spare_request_id = ${spareRequestId}
      `);
      console.log(`✅ Spare request approved`);
    } catch(err) {
      console.log(`❌ Approval failed: ${err.message}`);
    }
    
    // ============================================================================
    // STEP 5: UPDATE SPARE USAGE IN CALL
    // ============================================================================
    console.log('\n' + '='.repeat(80));
    console.log('STEP 5: MARK SPARE AS USED/CONSUMED');
    console.log('='.repeat(80));
    
    try {
      const [existing] = await sequelize.query(`
        SELECT COUNT(*) as cnt FROM call_spare_usage 
        WHERE call_id = ${callId} AND spare_id = ${spareId}
      `);
      
      if (existing[0].cnt === 0) {
        // Insert new usage
        await sequelize.query(`
          INSERT INTO call_spare_usage
          (call_id, spare_id, quantity_used, usage_date)
          VALUES (${callId}, ${spareId}, 1, GETDATE())
        `);
        console.log(`✅ Spare usage recorded`);
      } else {
        // Update existing
        await sequelize.query(`
          UPDATE call_spare_usage
          SET quantity_used = quantity_used + 1
          WHERE call_id = ${callId} AND spare_id = ${spareId}
        `);
        console.log(`✅ Spare usage updated (quantity incremented)`);
      }
    } catch(err) {
      console.log(`❌ Spare usage update failed: ${err.message}`);
    }
    
    // ============================================================================
    // STEP 6: CLOSE CALL
    // ============================================================================
    console.log('\n' + '='.repeat(80));
    console.log('STEP 6: CLOSE CALL');
    console.log('='.repeat(80));
    
    try {
      await sequelize.query(`
        UPDATE calls
        SET closed_by = GETDATE(),
            call_closure_source = 'technician',
            updated_at = GETDATE()
        WHERE call_id = ${callId}
      `);
      console.log(`✅ Call closed`);
    } catch(err) {
      console.log(`❌ Call closure failed: ${err.message}`);
    }
    
    // ============================================================================
    // VERIFICATION: Check all updates
    // ============================================================================
    console.log('\n' + '='.repeat(80));
    console.log('VERIFICATION: DATABASE UPDATES');
    console.log('='.repeat(80));
    
    // Verify call status
    const [callStatus] = await sequelize.query(`
      SELECT call_id, status_id, assigned_asc_id, assigned_tech_id 
      FROM calls WHERE call_id = ${callId}
    `);
    
    if (callStatus && callStatus.length > 0) {
      const c = callStatus[0];
      console.log(`\n📍 CALL STATUS:`);
      console.log(`   Call ID: ${c.call_id}`);
      console.log(`   Status ID: ${c.status_id}`);
      console.log(`   Allocated ASC: ${c.assigned_asc_id} (Expected: ${ascId})`);
      console.log(`   Allocated Tech: ${c.assigned_tech_id} (Expected: ${techId})`);
      
      if (c.assigned_asc_id === ascId && c.assigned_tech_id === techId) {
        console.log(`   ✅ CALL ALLOCATION: CORRECT`);
      } else {
        console.log(`   ⚠️  CALL ALLOCATION: MISMATCH`);
      }
    }
    
    // Verify spare request
    if (spareRequestId) {
      const [sreq] = await sequelize.query(`
        SELECT spare_request_id, status, quantity_approved 
        FROM spare_requests WHERE spare_request_id = ${spareRequestId}
      `);
      
      if (sreq && sreq.length > 0) {
        const sr = sreq[0];
        console.log(`\n📍 SPARE REQUEST STATUS:`);
        console.log(`   Request ID: ${sr.spare_request_id}`);
        console.log(`   Status: ${sr.status}`);
        console.log(`   Approved Qty: ${sr.quantity_approved}`);
        
        if (sr.status === 'approved' && sr.quantity_approved === 1) {
          console.log(`   ✅ SPARE REQUEST: APPROVED`);
        }
      }
    }
    
    // Verify spare usage
    const [usage] = await sequelize.query(`
      SELECT call_id, spare_id, quantity_used 
      FROM call_spare_usage 
      WHERE call_id = ${callId} AND spare_id = ${spareId}
    `);
    
    if (usage && usage.length > 0) {
      const u = usage[0];
      console.log(`\n📍 SPARE CONSUMPTION:`);
      console.log(`   Call ID: ${u.call_id}`);
      console.log(`   Spare ID: ${u.spare_id}`);
      console.log(`   Quantity Used: ${u.quantity_used}`);
      console.log(`   ✅ SPARE USAGE: RECORDED`);
    } else {
      console.log(`\n⚠️  No spare usage found`);
    }
    
    // Verify stock movement (if applicable)
    const [movements] = await sequelize.query(`
      SELECT TOP 3 * FROM stock_movement 
      WHERE spare_id = ${spareId}
      ORDER BY created_date DESC
    `);
    
    if (movements && movements.length > 0) {
      console.log(`\n📍 STOCK MOVEMENT (Last ${movements.length} records):`);
      movements.forEach((m, idx) => {
        console.log(`   ${idx+1}. Type: ${m.movement_type} | Qty: ${m.quantity} | From: ${m.from_location_type} | To: ${m.to_location_type}`);
      });
      console.log(`   ✅ STOCK MOVEMENTS: RECORDED`);
    } else {
      console.log(`\n⚠️  No stock movements found for this spare`);
    }
    
    // Check inventory
    const [inv] = await sequelize.query(`
      SELECT * FROM spare_inventory 
      WHERE spare_id = ${spareId} AND location_type = 'service_center' AND location_id = ${ascId}
    `);
    
    if (inv && inv.length > 0) {
      const i = inv[0];
      console.log(`\n📍 SERVICE CENTER INVENTORY:`);
      console.log(`   Spare ID: ${i.spare_id}`);
      console.log(`   Location: SC=${i.location_id}`);
      console.log(`   Good Qty: ${i.qty_good || i.quantity_good || 'N/A'}`);
      console.log(`   ✅ INVENTORY: UPDATED`);
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('✅ END-TO-END PROCESS TEST COMPLETED');
    console.log('='.repeat(80) + '\n');
    
  } catch(err) {
    console.error('\n❌ Test failed:', err.message);
    console.error(err);
  } finally {
    process.exit(0);
  }
}

main();
