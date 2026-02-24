/**
 * Simple Test: Create and Approve Technician Spare Request
 * Then verify if Stock Movement is created
 */

import { poolPromise, sql } from './db.js';

async function runTest() {
  const pool = await poolPromise;
  try {
    console.log('\n🎯 TEST: TECHNICIAN SPARE REQUEST → STOCK MOVEMENT\n');

    // 1. Get existing technician with service center
    console.log('STEP 1: Getting Technician...');
    let result = await pool.request()
      .query(`SELECT TOP 1 technician_id, service_center_id, name FROM technicians`);
    
    if (result.recordset.length === 0) {
      console.log('❌ No technicians found in system');
      return;
    }

    const technicianId = result.recordset[0].technician_id;
    const serviceCenterId = result.recordset[0].service_center_id;
    const techName = result.recordset[0].name;
    console.log(`✅ Technician: ${techName} (ID: ${technicianId}, SC: ${serviceCenterId})`);

    // 2. Get or create call
    console.log('\nSTEP 2: Getting/Creating Call...');
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
      console.log(`✅ Created Call ID: ${callId}`);
    } else {
      callId = result.recordset[0].call_id;
      console.log(`✅ Using existing Call ID: ${callId}`);
    }

    // 3. Get spare part with inventory at the service center
    console.log('\nSTEP 3: Getting Spare Part with Inventory...');
    result = await pool.request()
      .input('scId', sql.Int, serviceCenterId)
      .query(`
        SELECT TOP 1 sp.Id, sp.PART, sp.DESCRIPTION, ISNULL(si.qty_good, 0) as qty_good
        FROM spare_parts sp
        LEFT JOIN spare_inventory si ON sp.Id = si.spare_id 
          AND si.location_type = 'service_center' 
          AND si.location_id = @scId
        WHERE ISNULL(si.qty_good, 0) > 0
        ORDER BY NEWID()
      `);
    
    let spareId = null;
    if (result.recordset.length === 0) {
      console.log('❌ No spare with inventory found. Adding test inventory...');
      
      // Get first spare
      result = await pool.request()
        .query(`SELECT TOP 1 Id, PART, DESCRIPTION FROM spare_parts`);
      
      if (result.recordset.length === 0) {
        console.log('❌ No spare parts exist');
        return;
      }

      spareId = result.recordset[0].Id;
      const spareName = result.recordset[0].PART;

      // Add inventory
      result = await pool.request()
        .input('spareId', sql.Int, spareId)
        .input('scId', sql.Int, serviceCenterId)
        .query(`
          MERGE spare_inventory AS target
          USING (SELECT @spareId as spare_id, 'service_center' as location_type, @scId as location_id) AS source
          ON target.spare_id = source.spare_id 
            AND target.location_type = source.location_type 
            AND target.location_id = source.location_id
          WHEN MATCHED THEN
            UPDATE SET qty_good = 10, updated_at = GETDATE()
          WHEN NOT MATCHED THEN
            INSERT (spare_id, location_type, location_id, qty_good, qty_defective, created_at)
            VALUES (@spareId, 'service_center', @scId, 10, 0, GETDATE());
        `);

      console.log(`✅ Created inventory: ${spareName} (ID: ${spareId}) - 10 units at SC`);
    } else {
      spareId = result.recordset[0].Id;
      console.log(`✅ Found Spare: ${result.recordset[0].PART} (ID: ${spareId}) - ${result.recordset[0].qty_good} units`);
    }

    // 4. Create Spare Request
    console.log('\nSTEP 4: Creating Spare Request (Technician → Service Center)...');
    result = await pool.request()
      .input('techId', sql.Int, technicianId)
      .input('scId', sql.Int, serviceCenterId)
      .input('callId', sql.Int, callId)
      .query(`
        INSERT INTO spare_requests (
          requested_source_type, requested_source_id,
          requested_to_type, requested_to_id,
          call_id, request_type, request_reason,
          status_id, created_at
        )
        OUTPUT INSERTED.request_id
        VALUES (
          'technician', @techId,
          'service_center', @scId,
          @callId, 'normal', 'defect',
          (SELECT TOP 1 status_id FROM [status] WHERE status_name = 'pending'),
          GETDATE()
        )
      `);
    
    const requestId = result.recordset[0].request_id;
    console.log(`✅ Created Request ID: ${requestId}`);

    // 5. Add spare item
    console.log('\nSTEP 5: Adding Spare Item to Request...');
    result = await pool.request()
      .input('reqId', sql.Int, requestId)
      .input('spareId', sql.Int, spareId)
      .query(`
        INSERT INTO spare_request_items (request_id, spare_id, requested_qty, created_at)
        OUTPUT INSERTED.id
        VALUES (@reqId, @spareId, 5, GETDATE())
      `);
    
    const itemId = result.recordset[0].id;
    console.log(`✅ Item ID: ${itemId}, Requested Qty: 5`);

    // 6. Approve the request (simulating ASC approval)
    console.log('\nSTEP 6: Approving Request (Current Implementation)...');
    
    // This is what the current route does:
    result = await pool.request()
      .input('itemId', sql.Int, itemId)
      .input('userId', sql.Int, 1)
      .query(`
        INSERT INTO approvals (spare_request_item_id, approver_id, approval_status, remarks, approved_at)
        VALUES (@itemId, @userId, 'approved', 'Approved from inventory', GETDATE())
      `);

    result = await pool.request()
      .input('reqId', sql.Int, requestId)
      .query(`
        UPDATE spare_requests 
        SET status_id = (SELECT TOP 1 status_id FROM [status] WHERE status_name = 'approved')
        WHERE request_id = @reqId
      `);

    console.log(`✅ Request approved`);

    // 7. Check for Stock Movement
    console.log('\nSTEP 7: Checking if Stock Movement Was Created...');
    result = await pool.request()
      .input('refNo', sql.NVarChar, `REQ-${requestId}`)
      .query(`
        SELECT movement_id, movement_type, reference_type, status, total_qty,
               source_location_type, destination_location_type
        FROM stock_movement
        WHERE reference_type = 'spare_request' AND reference_no = @refNo
      `);
    
    if (result.recordset.length > 0) {
      const mov = result.recordset[0];
      console.log(`✅ ✅ ✅ STOCK MOVEMENT CREATED! ✅ ✅ ✅`);
      console.log(`\n   Movement ID: ${mov.movement_id}`);
      console.log(`   Reference: ${mov.reference_type} - REQ-${requestId}`);
      console.log(`   Type: ${mov.movement_type}`);
      console.log(`   From: ${mov.source_location_type}`);
      console.log(`   To: ${mov.destination_location_type}`);
      console.log(`   Qty: ${mov.total_qty}`);
      console.log(`   Status: ${mov.status}`);
    } else {
      console.log(`❌ ❌ ❌ NO STOCK MOVEMENT CREATED! ❌ ❌ ❌`);
      console.log(`\n📋 ISSUE SUMMARY:`);
      console.log(`   - Request was created ✅`);
      console.log(`   - Request was approved ✅`);
      console.log(`   - But NO stock movement was created ❌`);
      console.log(`\n🔧 ROOT CAUSE:`);
      console.log(`   The current approval endpoint in technician-spare-requests.js`);
      console.log(`   does NOT call the service function that creates stock movements.`);
      console.log(`   It only creates approval records and updates status.`);
    }

    // 8. Check goods movement items
    if (result.recordset.length > 0) {
      console.log('\nSTEP 8: Checking Goods Movement Items...');
      const movId = result.recordset[0].movement_id;
      result = await pool.request()
        .input('movId', sql.Int, movId)
        .query(`
          SELECT movement_item_id, spare_part_id, qty, condition
          FROM goods_movement_items
          WHERE movement_id = @movId
        `);
      
      if (result.recordset.length > 0) {
        console.log(`✅ Found ${result.recordset.length} goods items`);
        result.recordset.forEach(item => {
          console.log(`   Item: Spare ${item.spare_part_id}, Qty: ${item.qty}, Condition: ${item.condition}`);
        });
      }
    }

    // Final Summary
    console.log('\n' + '='.repeat(70));
    console.log('TEST RESULT:');
    console.log('='.repeat(70));
    console.log(`Request ID: ${requestId}`);
    console.log(`Technician: ${techName} (${technicianId})`);
    console.log(`Service Center: ${serviceCenterId}`);
    console.log(`Spare ID: ${spareId}`);
    console.log(`Requested Qty: 5`);
    
    if (result.recordset.length > 0) {
      console.log(`\n✅ Stock Movement was created successfully!`);
      console.log(`✅ System is working as expected.`);
    } else {
      console.log(`\n❌ Stock Movement was NOT created`);
      console.log(`❌ This is a BUG that needs to be fixed!`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await pool.close();
  }
}

runTest();
