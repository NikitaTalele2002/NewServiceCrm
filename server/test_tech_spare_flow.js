/**
 * Complete Test: Technician Spare Request Flow
 * Tests: Create request → ASC Approval → Stock Movement Creation
 */

import { sequelize } from './db.js';
import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';
let rsmToken = null;
let ascToken = null;
let ascId = null;
let technicianId = null;
let callId = null;
let spareId = null;

async function testCompleteFlow() {
  try {
    console.log('\n🎯 TECHNICIAN SPARE REQUEST COMPLETE FLOW TEST\n');

    // Step 1: Get ASC User (Service Center)
    console.log('STEP 1: Getting ASC User...');
    const ascUser = await sequelize.query(`
      SELECT TOP 1 user_id, username, centerId FROM users 
      WHERE role LIKE '%service_center%' AND centerId IS NOT NULL
      ORDER BY user_id DESC
    `, { type: sequelize.QueryTypes.SELECT });
    
    if (!ascUser || ascUser.length === 0) {
      console.log('❌ No ASC user found. Creating one...');
      await sequelize.query(`
        INSERT INTO users (username, password, email, role, centerId, created_at)
        VALUES ('asc_user', 'password123', 'asc@test.com', 'service_center', 1, GETDATE())
      `);
      const newUser = await sequelize.query(`
        SELECT TOP 1 user_id, username, centerId FROM users 
        WHERE username = 'asc_user'
      `, { type: sequelize.QueryTypes.SELECT });
      ascId = newUser[0].centerId;
    } else {
      ascId = ascUser[0].centerId;
    }
    console.log(`✅ ASC ID: ${ascId}`);

    // Step 2: Get or Create Technician
    console.log('\nSTEP 2: Getting/Creating Technician...');
    const tech = await sequelize.query(`
      SELECT TOP 1 technician_id FROM technicians
      WHERE service_center_id = ?
    `, { replacements: [ascId], type: sequelize.QueryTypes.SELECT });

    if (!tech || tech.length === 0) {
      console.log('❌ No technician found. Creating one...');
      const result = await sequelize.query(`
        INSERT INTO technicians (name, mobile_no, service_center_id, created_at)
        OUTPUT INSERTED.technician_id
        VALUES ('Test Technician', '9999999999', ?, GETDATE())
      `, { replacements: [ascId] });
      technicianId = result[0].technician_id;
    } else {
      technicianId = tech[0].technician_id;
    }
    console.log(`✅ Technician ID: ${technicianId}`);

    // Step 3: Get or Create Call
    console.log('\nSTEP 3: Getting/Creating Call...');
    const call = await sequelize.query(`
      SELECT TOP 1 call_id FROM calls
      WHERE assigned_technician_id = ?
      ORDER BY call_id DESC
    `, { replacements: [technicianId], type: sequelize.QueryTypes.SELECT });

    if (!call || call.length === 0) {
      console.log('❌ No call found. Creating one...');
      const result = await sequelize.query(`
        INSERT INTO calls (assigned_technician_id, call_status, created_at)
        OUTPUT INSERTED.call_id
        VALUES (?, 'pending', GETDATE())
      `, { replacements: [technicianId] });
      callId = result[0].call_id;
    } else {
      callId = call[0].call_id;
    }
    console.log(`✅ Call ID: ${callId}`);

    // Step 4: Get spare with inventory at ASC
    console.log('\nSTEP 4: Getting spare with inventory at ASC...');
    const spare = await sequelize.query(`
      SELECT TOP 1 sp.Id, sp.PART, sp.DESCRIPTION, si.qty_good
      FROM spare_parts sp
      INNER JOIN spare_inventory si ON sp.Id = si.spare_id
      WHERE si.location_type = 'service_center' 
      AND si.location_id = ? 
      AND si.qty_good > 0
      ORDER BY sp.Id DESC
    `, { replacements: [ascId], type: sequelize.QueryTypes.SELECT });

    if (!spare || spare.length === 0) {
      console.log('❌ No spare with inventory found at ASC. Adding inventory...');
      
      // Get first spare part
      const allSpares = await sequelize.query(`
        SELECT TOP 1 Id, PART, DESCRIPTION FROM spare_parts
      `, { type: sequelize.QueryTypes.SELECT });

      if (allSpares.length === 0) {
        console.log('❌ No spare parts exist in database');
        return;
      }

      spareId = allSpares[0].Id;
      console.log(`Using spare: ${allSpares[0].PART} (ID: ${spareId})`);

      // Add inventory
      await sequelize.query(`
        IF NOT EXISTS (SELECT 1 FROM spare_inventory WHERE spare_id = ? AND location_type = 'service_center' AND location_id = ?)
        BEGIN
          INSERT INTO spare_inventory (spare_id, location_type, location_id, qty_good, qty_defective, created_at)
          VALUES (?, 'service_center', ?, 10, 0, GETDATE())
        END
        ELSE
        BEGIN
          UPDATE spare_inventory SET qty_good = 10
          WHERE spare_id = ? AND location_type = 'service_center' AND location_id = ?
        END
      `, { replacements: [spareId, ascId, spareId, ascId, spareId, ascId] });
      console.log(`✅ Added inventory: 10 units at ASC`);
    } else {
      spareId = spare[0].Id;
      console.log(`✅ Found spare: ${spare[0].PART} with ${spare[0].qty_good} units at ASC`);
    }

    // Step 5: Create Spare Request from Technician to ASC
    console.log('\nSTEP 5: Creating Spare Request...');
    const requestResult = await sequelize.query(`
      INSERT INTO spare_requests (
        requested_source_type, 
        requested_source_id, 
        requested_to_type, 
        requested_to_id, 
        call_id,
        request_type,
        request_reason,
        status_id,
        created_at
      )
      OUTPUT INSERTED.request_id
      VALUES (
        'technician', 
        ?, 
        'service_center', 
        ?, 
        ?,
        'normal',
        'defect',
        (SELECT status_id FROM [status] WHERE status_name = 'pending'),
        GETDATE()
      )
    `, { replacements: [technicianId, ascId, callId] });

    const requestId = requestResult[0].request_id;
    console.log(`✅ Created Request ID: ${requestId}`);

    // Step 6: Add items to request
    console.log('\nSTEP 6: Adding spare items to request...');
    const itemResult = await sequelize.query(`
      INSERT INTO spare_request_items (request_id, spare_id, requested_qty, created_at)
      OUTPUT INSERTED.id
      VALUES (?, ?, 5, GETDATE())
    `, { replacements: [requestId, spareId] });

    const itemId = itemResult[0].id;
    console.log(`✅ Added item ID: ${itemId}, Spare ID: ${spareId}, Requested Qty: 5`);

    // Step 7: Approve Request via API (simulating ASC approval)
    console.log('\nSTEP 7: Approving request (simulating ASC approval)...');
    console.log(`📧 Request: POST /api/technician-spare-requests/${requestId}/approve`);

    const approveResponse = await fetch(`${BASE_URL}/api/technician-spare-requests/${requestId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer test-token`
      },
      body: JSON.stringify({
        approvedItems: [
          {
            spare_request_item_id: itemId,
            approvedQty: 5,
            remarks: 'Approved from inventory'
          }
        ]
      })
    });

    if (!approveResponse.ok) {
      const errText = await approveResponse.text();
      console.log(`❌ Approval failed: ${approveResponse.status}`);
      console.log(`Error: ${errText}`);
      return;
    }

    const approveResult = await approveResponse.json();
    console.log(`✅ Approval Response: ${JSON.stringify(approveResult, null, 2)}`);

    // Step 8: Verify Stock Movement Created
    console.log('\nSTEP 8: Verifying Stock Movement...');
    const movement = await sequelize.query(`
      SELECT TOP 1 
        movement_id, 
        movement_type, 
        reference_no, 
        source_location_id,
        destination_location_id, 
        total_qty,
        status
      FROM stock_movement
      WHERE reference_type = 'spare_request' AND reference_no = ?
      ORDER BY movement_id DESC
    `, { replacements: [`REQ-${requestId}`], type: sequelize.QueryTypes.SELECT });

    if (!movement || movement.length === 0) {
      console.log('❌ ⚠️ NO STOCK MOVEMENT CREATED!');
      console.log('This is the issue - the approval endpoint is not creating stock movements');
      console.log('Expected: Stock movement should be created from ASC to Technician');
    } else {
      console.log(`✅ Stock Movement Created:`);
      console.log(`   ID: ${movement[0].movement_id}`);
      console.log(`   Type: ${movement[0].movement_type}`);
      console.log(`   Reference: ${movement[0].reference_no}`);
      console.log(`   From: Location ${movement[0].source_location_id}`);
      console.log(`   To: Location ${movement[0].destination_location_id}`);
      console.log(`   Qty: ${movement[0].total_qty}`);
      console.log(`   Status: ${movement[0].status}`);
    }

    // Step 9: Verify Goods Movement Items
    console.log('\nSTEP 9: Verifying Goods Movement Items...');
    const items = await sequelize.query(`
      SELECT movement_id, spare_part_id, qty, condition
      FROM goods_movement_items
      WHERE spare_part_id = ?
      ORDER BY movement_item_id DESC
    `, { replacements: [spareId], type: sequelize.QueryTypes.SELECT });

    if (items && items.length > 0) {
      console.log(`✅ Found ${items.length} goods movement items`);
      items.forEach(item => {
        console.log(`   Movement: ${item.movement_id}, Spare: ${item.spare_part_id}, Qty: ${item.qty}, Condition: ${item.condition}`);
      });
    } else {
      console.log('❌ No goods movement items found');
    }

    // Step 10: Summary
    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY:');
    console.log('='.repeat(60));
    console.log(`Request ID: ${requestId}`);
    console.log(`Technician ID: ${technicianId}`);
    console.log(`ASC ID: ${ascId}`);
    console.log(`Spare ID: ${spareId}`);
    console.log(`Item ID: ${itemId}`);
    if (movement && movement.length > 0) {
      console.log(`✅ Stock Movement: YES (ID: ${movement[0].movement_id})`);
    } else {
      console.log(`❌ Stock Movement: NO - NEEDS FIX!`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    await sequelize.close();
  }
}

testCompleteFlow();
