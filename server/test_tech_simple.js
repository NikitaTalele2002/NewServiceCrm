/**
 * Simple Test: Create Service Center Spare Request to Check Stock Movement
 */

import { sequelize, sql, poolPromise } from './db.js';

async function testFlow() {
  const pool = await poolPromise;
  try {
    console.log('\n🎯 TECHNICIAN SPARE REQUEST TEST\n');

    // 1. Get or create ASC
    console.log('STEP 1: Setting up ASC...');
    let result = await pool.request()
      .query(`SELECT TOP 1 centerId FROM service_centers WHERE centerId IS NOT NULL`);
    
    let ascId = 2; // Use a default ASC ID
    if (result.recordset.length > 0) {
      ascId = result.recordset[0].centerId;
    }
    console.log(`✅ Using ASC ID: ${ascId}`);

    // 2. Get or create Technician
    console.log('\nSTEP 2: Setting up Technician...');
    result = await pool.request()
      .input('ascId', sql.Int, ascId)
      .query(`SELECT TOP 1 technician_id FROM technicians WHERE service_center_id = @ascId`);
    
    let technicianId = null;
    if (result.recordset.length === 0) {
      result = await pool.request()
        .input('ascId', sql.Int, ascId)
        .query(`
          INSERT INTO technicians (name, mobile_no, service_center_id, created_at)
          OUTPUT INSERTED.technician_id
          VALUES ('Test Tech', '9999999999', @ascId, GETDATE())
        `);
      technicianId = result.recordset[0].technician_id;
    } else {
      technicianId = result.recordset[0].technician_id;
    }
    console.log(`✅ Technician ID: ${technicianId}`);

    // 3. Get or create Call
    console.log('\nSTEP 3: Setting up Call...');
    result = await pool.request()
      .input('techId', sql.Int, technicianId)
      .query(`SELECT TOP 1 call_id FROM calls WHERE assigned_technician_id = @techId`);
    
    let callId = null;
    if (result.recordset.length === 0) {
      result = await pool.request()
        .input('techId', sql.Int, technicianId)
        .query(`
          INSERT INTO calls (assigned_technician_id, call_status, created_at)
          OUTPUT INSERTED.call_id
          VALUES (@techId, 'pending', GETDATE())
        `);
      callId = result.recordset[0].call_id;
    } else {
      callId = result.recordset[0].call_id;
    }
    console.log(`✅ Call ID: ${callId}`);

    // 4. Get spare with inventory at ASC
    console.log('\nSTEP 4: Getting spare with inventory at ASC...');
    result = await pool.request()
      .input('ascId', sql.Int, ascId)
      .query(`
        SELECT TOP 1 sp.Id, sp.PART, sp.DESCRIPTION, ISNULL(si.qty_good, 0) as qty_good
        FROM spare_parts sp
        LEFT JOIN spare_inventory si ON sp.Id = si.spare_id
        WHERE si.location_type = 'service_center' AND si.location_id = @ascId AND si.qty_good > 0
        ORDER BY NEWID()
      `);
    
    let spareId = null;
    if (result.recordset.length === 0) {
      console.log('❌ No spare with inventory found. Creating...');
      
      // Get first spare
      result = await pool.request()
        .query(`SELECT TOP 1 Id, PART, DESCRIPTION FROM spare_parts`);
      
      if (result.recordset.length === 0) {
        console.log('❌ No spare parts in database');
        return;
      }

      spareId = result.recordset[0].Id;
      console.log(`Using spare: ${result.recordset[0].PART}`);

      // Add inventory
      await pool.request()
        .input('spareId', sql.Int, spareId)
        .input('ascId', sql.Int, ascId)
        .query(`
          IF NOT EXISTS (SELECT 1 FROM spare_inventory WHERE spare_id = @spareId AND location_type = 'service_center' AND location_id = @ascId)
          BEGIN
            INSERT INTO spare_inventory (spare_id, location_type, location_id, qty_good, qty_defective, created_at)
            VALUES (@spareId, 'service_center', @ascId, 10, 0, GETDATE())
          END
          ELSE
          BEGIN
            UPDATE spare_inventory SET qty_good = 10
            WHERE spare_id = @spareId AND location_type = 'service_center' AND location_id = @ascId
          END
        `);
      console.log(`✅ Created inventory: 10 units`);
    } else {
      spareId = result.recordset[0].Id;
      console.log(`✅ Found spare: ${result.recordset[0].PART} with ${result.recordset[0].qty_good} units`);
    }

    // 5. Create Spare Request
    console.log('\nSTEP 5: Creating Spare Request...');
    result = await pool.request()
      .input('techId', sql.Int, technicianId)
      .input('ascId', sql.Int, ascId)
      .input('callId', sql.Int, callId)
      .query(`
        INSERT INTO spare_requests (
          requested_source_type, requested_source_id,
          requested_to_type, requested_to_id,
          call_id, request_type, request_reason, status_id, created_at
        )
        OUTPUT INSERTED.request_id
        VALUES (
          'technician', @techId,
          'service_center', @ascId,
          @callId, 'normal', 'defect',
          (SELECT TOP 1 status_id FROM [status] WHERE status_name = 'pending'),
          GETDATE()
        )
      `);
    
    const requestId = result.recordset[0].request_id;
    console.log(`✅ Created Request ID: ${requestId}`);

    // 6. Add spare item to request
    console.log('\nSTEP 6: Adding spare item to request...');
    result = await pool.request()
      .input('reqId', sql.Int, requestId)
      .input('spareId', sql.Int, spareId)
      .query(`
        INSERT INTO spare_request_items (request_id, spare_id, requested_qty, created_at)
        OUTPUT INSERTED.id
        VALUES (@reqId, @spareId, 5, GETDATE())
      `);
    
    const itemId = result.recordset[0].id;
    console.log(`✅ Added item ID: ${itemId}`);

    // 7. Check request details before approval
    console.log('\nSTEP 7: Request Details Before Approval:');
    result = await pool.request()
      .input('reqId', sql.Int, requestId)
      .query(`
        SELECT sr.request_id, sr.status_id, st.status_name
        FROM spare_requests sr
        LEFT JOIN [status] st ON sr.status_id = st.status_id
        WHERE sr.request_id = @reqId
      `);
    
    if (result.recordset.length > 0) {
      console.log(`  Status: ${result.recordset[0].status_name}`);
    }

    // 8.  Simulate approval (raw SQL - like the current route does)
    console.log('\nSTEP 8: Approving request (current implementation)...');
    
    // Create approval record (like current route does)
    await pool.request()
      .input('itemId', sql.Int, itemId)
      .input('userId', sql.Int, 1)
      .query(`
        INSERT INTO approvals (spare_request_item_id, approver_id, approval_status, remarks, approved_at)
        VALUES (@itemId, @userId, 'approved', 'Test approval', GETDATE())
      `);

    // Update status (like current route does)
    await pool.request()
      .input('reqId', sql.Int, requestId)
      .query(`
        UPDATE spare_requests 
        SET status_id = (SELECT status_id FROM [status] WHERE status_name = 'approved')
        WHERE request_id = @reqId
      `);

    console.log(`✅ Request approved`);

    // 9. Check if stock movement was created
    console.log('\nSTEP 9: Checking Stock Movement...');
    result = await pool.request()
      .input('refNo', sql.NVarChar, `REQ-${requestId}`)
      .query(`
        SELECT movement_id, movement_type, status, total_qty
        FROM stock_movement
        WHERE reference_type = 'spare_request' AND reference_no = @refNo
      `);
    
    if (result.recordset.length > 0) {
      console.log(`✅ Stock Movement CREATED (ID: ${result.recordset[0].movement_id})`);
      console.log(`   Type: ${result.recordset[0].movement_type}`);
      console.log(`   Status: ${result.recordset[0].status}`);
      console.log(`   Qty: ${result.recordset[0].total_qty}`);
    } else {
      console.log(`❌ NO STOCK MOVEMENT CREATED`);
      console.log(`\n⚠️  ISSUE IDENTIFIED:`);
      console.log(`   The current approval endpoint does NOT create stock movements!`);
      console.log(`   It only creates approval records and updates status.`);
    }

    // 10. Summary
    console.log('\n' + '='.repeat(60));
    console.log('TEST SUMMARY:');
    console.log('='.repeat(60));
    console.log(`✅ Request created successfully`);
    console.log(`✅ Request approved successfully`);
    if (result.recordset.length > 0) {
      console.log(`✅ Stock movement created (GOOD!)`);
    } else {
      console.log(`❌ Stock movement NOT created (BUG!)`);
      console.log(`\n📋 Data for reference:`);
      console.log(`   Technician ID: ${technicianId}`);
      console.log(`   ASC ID: ${ascId}`);
      console.log(`   Request ID: ${requestId}`);
      console.log(`   Spare ID: ${spareId}`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await pool.close();
    await sequelize.close();
  }
}

testFlow();
