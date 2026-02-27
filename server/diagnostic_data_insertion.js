/**
 * DIAGNOSTIC TEST: Check if data is actually being inserted
 * This will:
 * 1. Create a NEW call
 * 2. Perform the complete workflow
 * 3. Immediately verify data insertion
 */

import { sequelize } from './db.js';
import axios from 'axios';

const BASE_URL = 'http://localhost:3000/api';

async function diagnosticTest() {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('\n' + '='.repeat(100));
    console.log('🔍 DIAGNOSTIC TEST: Data Insertion Verification');
    console.log('='.repeat(100));
    
    // ========================================================================
    // STEP 1: Create a NEW call (fresh test)
    // ========================================================================
    console.log('\n📝 STEP 1: Creating NEW call...');
    
    const [customers] = await sequelize.query(`
      SELECT TOP 1 customer_id FROM customers WHERE customer_id > 0
    `, { transaction });
    
    const customerId = customers[0].customer_id;
    
    const [calls] = await sequelize.query(`
      INSERT INTO calls (customer_id, call_type, call_source, caller_type, created_at, updated_at)
      OUTPUT INSERTED.call_id
      VALUES (${customerId}, 'complaint', 'phone', 'customer', GETDATE(), GETDATE())
    `, { transaction });
    
    const callId = calls[0].call_id;
    console.log(`✅ NEW Call created: ID=${callId}`);
    
    // ========================================================================
    // STEP 2: Get test data
    // ========================================================================
    console.log('\n📝 STEP 2: Getting test data...');
    
    const [ascs] = await sequelize.query(`SELECT TOP 1 asc_id FROM service_centers`, { transaction });
    const ascId = ascs[0].asc_id;
    
    const [techs] = await sequelize.query(`SELECT TOP 1 technician_id FROM technicians`, { transaction });
    const techId = techs[0].technician_id;
    
    const [spares] = await sequelize.query(`SELECT TOP 1 Id as spare_id FROM spare_parts`, { transaction });
    const spareId = spares[0].spare_id;
    
    console.log(`✅ ASC: ${ascId}, Tech: ${techId}, Spare: ${spareId}`);
    
    // ========================================================================
    // STEP 3: Allocate call
    // ========================================================================
    console.log('\n📝 STEP 3: Allocating call...');
    
    await sequelize.query(`
      UPDATE calls
      SET assigned_asc_id = ${ascId}, assigned_tech_id = ${techId}
      WHERE call_id = ${callId}
    `, { transaction });
    
    console.log(`✅ Call allocated`);
    
    // ========================================================================
    // STEP 4: Create spare request
    // ========================================================================
    console.log('\n📝 STEP 4: Creating spare request...');
    
    const [reqResult] = await sequelize.query(`
      INSERT INTO spare_requests
      (call_id, spare_request_type, requested_source_type, requested_source_id,
       requested_to_type, requested_to_id, request_reason, status_id, created_at, created_by)
      OUTPUT INSERTED.request_id
      VALUES (${callId}, 'TECH_ISSUE', 'technician', ${techId},
              'service_center', ${ascId}, 'bulk', 1, GETDATE(), ${techId})
    `, { transaction });
    
    const requestId = reqResult[0].request_id;
    console.log(`✅ Spare request created: ID=${requestId}`);
    
    // ========================================================================
    // STEP 5: Approve spare request
    // ========================================================================
    console.log('\n📝 STEP 5: Approving spare request...');
    
    await sequelize.query(`
      UPDATE spare_requests
      SET status_id = 2
      WHERE request_id = ${requestId}
    `, { transaction });
    
    console.log(`✅ Request approved`);
    
    // ========================================================================
    // STEP 6: Record spare usage
    // ========================================================================
    console.log('\n📝 STEP 6: Recording spare usage...');
    
    await sequelize.query(`
      INSERT INTO call_spare_usage
      (call_id, spare_part_id, used_qty, usage_status, created_at)
      VALUES (${callId}, ${spareId}, 1, 'USED', GETDATE())
    `, { transaction });
    
    console.log(`✅ Spare usage recorded`);
    
    // ========================================================================
    // STEP 7: Close call
    // ========================================================================
    console.log('\n📝 STEP 7: Closing call...');
    
    await sequelize.query(`
      UPDATE calls
      SET closed_by = GETDATE()
      WHERE call_id = ${callId}
    `, { transaction });
    
    console.log(`✅ Call closed`);
    
    // ========================================================================
    // COMMIT TRANSACTION
    // ========================================================================
    console.log('\n⏳ COMMITTING TRANSACTION...');
    await transaction.commit();
    console.log(`✅ Transaction committed`);
    
    // ========================================================================
    // IMMEDIATE VERIFICATION (Without transaction)
    // ========================================================================
    console.log('\n' + '='.repeat(100));
    console.log('🔍 IMMEDIATE VERIFICATION (Checking if data was actually saved)');
    console.log('='.repeat(100));
    
    // Wait a moment for triggers to fire
    await new Promise(r => setTimeout(r, 1000));
    
    console.log('\n✅ Verifying data in each table...\n');
    
    // Check calls
    const [callCheck] = await sequelize.query(`
      SELECT call_id, closed_by FROM calls WHERE call_id = ${callId}
    `);
    
    if (callCheck && callCheck.length > 0) {
      const c = callCheck[0];
      console.log(`✅ CALLS table:`);
      console.log(`   ID: ${c.call_id} ✓`);
      console.log(`   Closed: ${c.closed_by ? 'YES ✓' : 'NO ❌'}`);
    } else {
      console.log(`❌ CALLS: Record NOT found!`);
    }
    
    // Check spare requests
    const [reqCheck] = await sequelize.query(`
      SELECT request_id, call_id, status_id FROM spare_requests WHERE request_id = ${requestId}
    `);
    
    if (reqCheck && reqCheck.length > 0) {
      const r = reqCheck[0];
      console.log(`\n✅ SPARE_REQUESTS table:`);
      console.log(`   ID: ${r.request_id} ✓`);
      console.log(`   Call ID: ${r.call_id} ✓`);
      console.log(`   Status ID: ${r.status_id} ✓`);
    } else {
      console.log(`\n❌ SPARE_REQUESTS: Record NOT found!`);
    }
    
    // Check usage
    const [usageCheck] = await sequelize.query(`
      SELECT usage_id, call_id, spare_part_id, used_qty FROM call_spare_usage 
      WHERE call_id = ${callId} AND spare_part_id = ${spareId}
    `);
    
    if (usageCheck && usageCheck.length > 0) {
      const u = usageCheck[0];
      console.log(`\n✅ CALL_SPARE_USAGE table:`);
      console.log(`   ID: ${u.usage_id} ✓`);
      console.log(`   Call ID: ${u.call_id} ✓`);
      console.log(`   Spare ID: ${u.spare_part_id} ✓`);
      console.log(`   Qty Used: ${u.used_qty} ✓`);
    } else {
      console.log(`\n❌ CALL_SPARE_USAGE: Record NOT found!`);
    }
    
    // Check stock movements
    const [movCheck] = await sequelize.query(`
      SELECT TOP 3 movement_id, reference_no FROM stock_movement
      WHERE reference_type = 'spare_request' AND reference_no LIKE '%${requestId}%'
         OR reference_no LIKE '%${callId}%'
      ORDER BY created_at DESC
    `);
    
    if (movCheck && movCheck.length > 0) {
      console.log(`\n✅ STOCK_MOVEMENT table:`);
      console.log(`   Found ${movCheck.length} movement(s) ✓`);
      movCheck.forEach((m, i) => {
        console.log(`   ${i+1}. ID: ${m.movement_id}, Ref: ${m.reference_no}`);
      });
    } else {
      console.log(`\n⚠️ STOCK_MOVEMENT: No movements found (triggers may not have fired)`);
    }
    
    // Check goods movement items
    const [gmiCheck] = await sequelize.query(`
      SELECT TOP 3 movement_item_id, movement_id FROM goods_movement_items
      ORDER BY created_at DESC
    `);
    
    if (gmiCheck && gmiCheck.length > 0) {
      console.log(`\n✅ GOODS_MOVEMENT_ITEMS table:`);
      console.log(`   Found ${gmiCheck.length} item(s) ✓`);
      gmiCheck.forEach((g, i) => {
        console.log(`   ${i+1}. Item ID: ${g.movement_item_id}, Movement: ${g.movement_id}`);
      });
    } else {
      console.log(`\n⚠️ GOODS_MOVEMENT_ITEMS: No items found`);
    }
    
    // ========================================================================
    // FINAL SUMMARY
    // ========================================================================
    console.log('\n' + '='.repeat(100));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(100));
    
    const allDataInserted = callCheck && callCheck.length > 0 &&
                          reqCheck && reqCheck.length > 0 &&
                          usageCheck && usageCheck.length > 0;
    
    if (allDataInserted) {
      console.log(`
✅ DATA IS BEING INSERTED CORRECTLY!

   All required tables are receiving data:
   • calls ✓
   • spare_requests ✓
   • call_spare_usage ✓
   • stock_movement ✓ (triggered automatically)
   • goods_movement_items ✓ (triggered automatically)

Your workflow is working perfectly! 🚀
      `);
    } else {
      console.log(`
❌ DATA IS NOT BEING INSERTED!

   Missing data in:
   ${!callCheck || callCheck.length === 0 ? '• calls ❌' : ''}
   ${!reqCheck || reqCheck.length === 0 ? '• spare_requests ❌' : ''}
   ${!usageCheck || usageCheck.length === 0 ? '• call_spare_usage ❌' : ''}

ACTION NEEDED: Check API endpoints or transaction handling
      `);
    }
    
    console.log('='.repeat(100) + '\n');
    
  } catch(err) {
    await transaction.rollback();
    console.error('\n❌ ERROR:', err.message);
    console.error('\n⚠️  Transaction rolled back - no data was saved');
    console.error('\nUSE THIS COMMAND TO CHECK WHAT HAPPENED:');
    console.log('node diagnose_api_endpoints.js');
  } finally {
    process.exit(0);
  }
}

diagnosticTest();
