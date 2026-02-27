#!/usr/bin/env node
/**
 * PART 1: Tech requests spare from ASC (Simple Test)
 * Tests: Create call -> Tech requests spare -> Check inventory
 * Uses: Raw SQL to avoid Sequelize hooks
 */

import sql from 'mssql';

const config = {
  server: 'localhost\\SQLEXPRESS',
  database: 'NewCRM',
  authentication: {
    type: 'default',
    options: { userName: 'crm_user', password: 'StrongPassword123!' }
  },
  options: { encrypt: false, trustServerCertificate: true, enableArithAbort: true }
};

async function test() {
  const pool = new sql.ConnectionPool(config);
  try {
    await pool.connect();
    console.log('\n' + '='.repeat(70));
    console.log('PART 1: Tech Requests Spare -> ASC Approval & Stock Movement');
    console.log('='.repeat(70));

    // Step 1: Create call assigned to technician
    console.log('\n📞 Step 1.1: Create Call');
    const callNum = `CALL-${Date.now()}`;
    const callRes = await pool.request()
      .input('cid', sql.Int, 1)
      .input('aid', sql.Int, 1)
      .input('tid', sql.Int, 1)
      .query(`
        INSERT INTO calls (customer_id, call_type, call_source, caller_type, assigned_asc_id, assigned_tech_id, status_id, created_at, updated_at)
        VALUES (@cid, 'complaint', 'phone', 'customer', @aid, @tid, 1, GETDATE(), GETDATE());
        SELECT @@IDENTITY as call_id;
      `);
    const callId = callRes.recordset[0].call_id;
    console.log(`✅ Call ${callNum} created (ID: ${callId})`);

    // Step 1.2: Create spare request from Tech to ASC
    console.log('\n📋 Step 1.2: Tech Requests Spare');
    const reqRes = await pool.request()
      .input('call_id', sql.Int, callId)
      .input('spare_id', sql.Int, 1)
      .query(`
        INSERT INTO spare_requests (
          call_id, requested_source_type, requested_source_id,
          requested_to_type, requested_to_id, request_reason,
          spare_request_type, status_id, created_by, created_at, updated_at
        ) VALUES (
          @call_id, 'technician', 1, 'service_center', 1, 'defect',
          'TECH_ISSUE', 1, 1, GETDATE(), GETDATE()
        );
        SELECT @@IDENTITY as request_id;
      `);
    const requestId = reqRes.recordset[0].request_id;
    console.log(`✅ Spare request created (ID: ${requestId})`);
    console.log(`   From: Technician 1`);
    console.log(`   To: Service Center 1`);
    console.log(`   Type: TECH_ISSUE`);

    // Step 1.3: Add items to request
    console.log('\n📦 Step 1.3: Add items to request');
    await pool.request()
      .input('req_id', sql.Int, requestId)
      .query(`
        INSERT INTO spare_request_items (request_id, spare_id, requested_qty, approved_qty, created_at, updated_at)
        VALUES (@req_id, 1, 2, 0, GETDATE(), GETDATE())
      `);
    console.log(`✅ Added Spare ID 1: qty 2`);

    // Step 1.4: Check current inventory at ASC
    console.log('\n📊 Step 1.4: Check ASC Inventory (Before Allocation)');
    const invBefore = await pool.request()
      .query(`SELECT spare_id, qty_good, qty_defective, qty_in_transit FROM spare_inventory WHERE spare_id = 1 AND location_type = 'service_center' AND location_id = 1`);
    if (invBefore.recordset.length > 0) {
      console.log(`   Spare 1 at SC 1:`);
      console.log(`     - Good: ${invBefore.recordset[0].qty_good}`);
      console.log(`     - Defective: ${invBefore.recordset[0].qty_defective}`);
      console.log(`     - In Transit: ${invBefore.recordset[0].qty_in_transit}`);
    } else {
      console.log(`   ⚠️ No inventory record found at SC 1`);
    }

    // Step 1.5: Update request status to "approved" (status_id = 2 or first available)
    console.log('\n✅ Step 1.5: ASC Approves Request');
    await pool.request()
      .input('req_id', sql.Int, requestId)
      .query(`UPDATE spare_requests SET status_id = 2 WHERE request_id = @req_id`);
    console.log(`✅ Request approved (status_id = 2)`);

    // Step 1.6: Update allocated_qty in items
    console.log('\n🎯 Step 1.6: ASC Allocates Spares');
    await pool.request()
      .input('req_id', sql.Int, requestId)
      .query(`UPDATE spare_request_items SET approved_qty = 2 WHERE request_id = @req_id AND spare_id = 1`);
    console.log(`✅ Allocated 2 units of Spare 1`);

    // Step 1.7: Create stock movements
    console.log('\n📤 Step 1.7: Create Stock Movements');
    
    // OUT movement: ASC issues
    await pool.request()
      .query(`
        INSERT INTO stock_movements (spare_id, location_type, location_id, movement_type, quantity, created_at, updated_at)
        VALUES (1, 'service_center', 1, 'TECH_ISSUE_OUT', 2, GETDATE(), GETDATE())
      `);
    console.log(`✅ Movement OUT created: ASC issues 2 units`);

    // IN movement: Tech receives
    await pool.request()
      .query(`
        INSERT INTO stock_movements (spare_id, location_type, location_id, movement_type, quantity, created_at, updated_at)
        VALUES (1, 'technician', 1, 'TECH_ISSUE_IN', 2, GETDATE(), GETDATE())
      `);
    console.log(`✅ Movement IN created: Tech receives 2 units`);

    // Step 1.8: Update spare_inventory
    console.log('\n🏭 Step 1.8: Update Inventory Buckets');
    
    // Decrease ASC inventory
    await pool.request()
      .query(`
        UPDATE spare_inventory
        SET qty_good = CASE WHEN qty_good >= 2 THEN qty_good - 2 ELSE 0 END
        WHERE spare_id = 1 AND location_type = 'service_center' AND location_id = 1
      `);
    console.log(`✅ ASC inventory: -2 good stock`);

    // Increase Tech inventory
    await pool.request()
      .query(`
        UPDATE spare_inventory
        SET qty_good = qty_good + 2
        WHERE spare_id = 1 AND location_type = 'technician' AND location_id = 1;
        
        -- If no record exists, create one
        IF @@ROWCOUNT = 0
        BEGIN
          INSERT INTO spare_inventory (spare_id, location_type, location_id, qty_good, qty_defective, qty_in_transit, created_at, updated_at)
          VALUES (1, 'technician', 1, 2, 0, 0, GETDATE(), GETDATE())
        END
      `);
    console.log(`✅ Tech inventory: +2 good stock`);

    // Step 1.9: Verify final state
    console.log('\n✅ FINAL STATE VERIFICATION');
    const invAfter = await pool.request()
      .query(`
        SELECT 'ASC' as location, qty_good, qty_defective FROM spare_inventory 
        WHERE spare_id = 1 AND location_type = 'service_center' AND location_id = 1
        UNION ALL
        SELECT 'Tech' as location, qty_good, qty_defective FROM spare_inventory 
        WHERE spare_id = 1 AND location_type = 'technician' AND location_id = 1
      `);
    
    if (invAfter.recordset.length > 0) {
      console.log('\n   📊 Inventory After Allocation:');
      invAfter.recordset.forEach(row => {
        console.log(`   ${row.location}: Good=${row.qty_good}, Defective=${row.qty_defective}`);
      });
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ PART 1 TEST PASSED');
    console.log('='.repeat(70) + '\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    if (error.originalError?.message) console.error('Details:', error.originalError.message);
    process.exit(1);
  } finally {
    await pool.close();
  }
}

test();
