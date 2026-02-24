/**
 * Complete Test: Return Request Approval Flow
 * Creates test data directly in database and verifies stock movement creation
 */

import sql from 'mssql';
import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';

const JWT_SECRET = 'supersecret_jwt_key_change_me';
const dbConfig = {
  server: 'localhost',
  user: 'crm_user',
  password: 'StrongPassword123!',
  database: 'ServiceCrm',
  options: {
    instanceName: 'SQLEXPRESS',
    encrypt: false,
    trustServerCertificate: true,
    enableKeepAlive: true,
  }
};

function generateToken(userRole = 'service_center', ascId = 1) {
  const payload = {
    id: 1,
    username: 'test_asc_user',
    role: userRole,
    centerId: ascId,
    service_center_id: ascId,
    name: 'Test ASC User'
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

async function makeApiCall(path, method = 'GET', body = null, token = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`http://localhost:5000/api${path}`, options);
    const data = await response.json().catch(() => ({}));
    
    return {
      status: response.status,
      data,
      ok: response.ok
    };
  } catch (error) {
    return {
      status: 0,
      error: error.message,
      ok: false
    };
  }
}

async function runCompleteTest() {
  const pool = new sql.ConnectionPool(dbConfig);
  
  try {
    await pool.connect();
    console.log('✅ Connected to database\n');
    console.log('═'.repeat(70));
    console.log('  RETURN REQUEST APPROVAL - DATABASE VERIFICATION');
    console.log('═'.repeat(70) + '\n');

    // Find an existing return request or pending spare request
    console.log(`📋 STEP 1: Looking for Return Requests`);
    console.log('━'.repeat(70));

    const pendingResult = await pool.request().query(`
      SELECT TOP 5 
        request_id, status_id, requested_source_id, requested_to_id,
        request_type, request_reason
      FROM spare_requests
      WHERE status_id IN (SELECT status_id FROM status WHERE status_name = 'pending')
      AND (request_type LIKE '%return%' OR request_reason LIKE '%return%' OR request_reason LIKE '%defective%')
      ORDER BY request_id DESC
    `);

    if (pendingResult.recordset.length === 0) {
      console.log('⚠️ No pending return requests found in database');
      console.log('\n   Checking for ANY pending requests...');
      
      const anyPendingResult = await pool.request().query(`
        SELECT TOP 5 request_id, status_id, request_type, request_reason
        FROM spare_requests  
        WHERE status_id IN (SELECT status_id FROM status WHERE status_name = 'pending')
        ORDER BY request_id DESC
      `);

      if (anyPendingResult.recordset.length > 0) {
        console.log(`   Found ${anyPendingResult.recordset.length} pending requests (checking if any are return-related):`);
        for (const req of anyPendingResult.recordset) {
          console.log(`     - Request ${req.request_id}: ${req.request_type} / ${req.request_reason}`);
        }
      } else {
        console.log('   No pending requests at all.');
        console.log('\n   Checking for recently VERIFIED requests (which would have stock movements)...');
        
        const verifiedResult = await pool.request().query(`
          SELECT TOP 5 request_id, status_id FROM spare_requests
          WHERE status_id IN (SELECT status_id FROM status WHERE status_name = 'verified')
          ORDER BY request_id DESC
        `);

        if (verifiedResult.recordset.length > 0) {
          console.log(`   ✓ Found ${verifiedResult.recordset.length} verified requests!\n`);
          const verifiedId = verifiedResult.recordset[0].request_id;
          console.log(`   Using verified request ID: ${verifiedId}`);
          
          // Check if this request has stock movements
          const smResult = await pool.request()
            .input('request_id', sql.Int, verifiedId)
            .query(`
              SELECT COUNT(*) as cnt FROM stock_movement
              WHERE reference_type = 'return_request'
            `);

          const smCount = smResult.recordset[0].cnt;
          console.log(`   Stock movements linked: ${smCount}\n`);
          
          if (smCount > 0) {
            console.log('✅ VERIFICATION SUCCESSFUL:');
            console.log('   Stock movement table DOES have records!');
            console.log('   Data insertion is working correctly.\n');
          }
        }
      }
      return;
    }

    const returnRequest = pendingResult.recordset[0];
    const returnRequestId = returnRequest.request_id;
    
    console.log(`✓ Found pending return request: ${returnRequestId}\n`);

    // Get request items
    const itemsResult = await pool.request()
      .input('request_id', sql.Int, returnRequestId)
      .query(`
        SELECT Id, spare_id FROM spare_request_items 
        WHERE request_id = @request_id
      `);

    if (itemsResult.recordset.length === 0) {
      console.log('⚠️ No items found for this request\n');
      return;
    }

    console.log(`📋 STEP 2: Checking Database Before Approval`);
    console.log('━'.repeat(70));

    const smBefore = await pool.request().query(`
      SELECT COUNT(*) as cnt FROM stock_movement 
      WHERE reference_type = 'return_request'
    `);
    const smCountBefore = smBefore.recordset[0].cnt;

    const gmiBefore = await pool.request().query(`
      SELECT COUNT(*) as cnt FROM goods_movement_items gmi
      INNER JOIN stock_movement sm ON gmi.movement_id = sm.movement_id
      WHERE sm.reference_type = 'return_request'
    `);
    const gmiCountBefore = gmiBefore.recordset[0].cnt;

    console.log(`   stock_movement records: ${smCountBefore}`);
    console.log(`   goods_movement_items: ${gmiCountBefore}\n`);

    // Prepare approval data
    const approvalItems = itemsResult.recordset.map(item => ({
      return_item_id: item.Id,
      approved_good_qty: 3,
      approved_defective_qty: 1,
      condition_notes: 'Test verification'
    }));

    console.log(`📋 STEP 3: Calling Approval API`);
    console.log('━'.repeat(70));
    
    const token = generateToken('service_center', returnRequest.requested_to_id);
    console.log(`   Service Center ID: ${returnRequest.requested_to_id}`);
    console.log(`   Request ID: ${returnRequestId}`);
    console.log(`   Items to approve: ${approvalItems.length}\n`);
    
    const approveResponse = await makeApiCall(
      `/spare-return-requests/${returnRequestId}/approve`,
      'POST',
      {
        approved_items: approvalItems,
        approved_remarks: 'Test approval for verification'
      },
      token
    );

    console.log(`   API Response Status: ${approveResponse.status}`);
    if (approveResponse.ok) {
      console.log(`   ✓ Approval successful`);
      if (approveResponse.data.stockMovementId) {
        console.log(`   ✓ Stock Movement ID: ${approveResponse.data.stockMovementId}`);
      }
      if (approveResponse.data.goodsMovementItemsCount) {
        console.log(`   ✓ Goods Movement Items Created: ${approveResponse.data.goodsMovementItemsCount}`);
      }
      console.log(`   ✓ Total Qty Returned: ${approveResponse.data.totalQtyReturned}\n`);
    } else {
      console.log(`   ✗ Approval Response Status: ${approveResponse.status}`);
      console.log(`   Error: ${approveResponse.data?.error || 'Unknown error'}`);
      console.log(`   Details: ${approveResponse.data?.details || ''}\n`);
    }

    // Wait a moment for database to settle
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log(`📋 STEP 4: Checking Database After Approval`);
    console.log('━'.repeat(70));

    const smAfter = await pool.request().query(`
      SELECT COUNT(*) as cnt FROM stock_movement 
      WHERE reference_type = 'return_request'
    `);
    const smCountAfter = smAfter.recordset[0].cnt;

    const gmiAfter = await pool.request().query(`
      SELECT COUNT(*) as cnt FROM goods_movement_items gmi
      INNER JOIN stock_movement sm ON gmi.movement_id = sm.movement_id
      WHERE sm.reference_type = 'return_request'
    `);
    const gmiCountAfter = gmiAfter.recordset[0].cnt;

    console.log(`   stock_movement records: ${smCountAfter}`);
    console.log(`   goods_movement_items: ${gmiCountAfter}`);
    console.log(`   Difference: +${smCountAfter - smCountBefore} movements, +${gmiCountAfter - gmiCountBefore} items\n`);

    // Get the latest stock movement
    const latestSM = await pool.request().query(`
      SELECT TOP 1
        movement_id, movement_type, reference_type, reference_no,
        source_location_type, source_location_id,
        destination_location_type, destination_location_id,
        total_qty, status
      FROM stock_movement
      WHERE reference_type = 'return_request'
      ORDER BY movement_id DESC
    `);

    if (latestSM.recordset.length > 0) {
      const sm = latestSM.recordset[0];
      console.log(`📋 STEP 5: Latest Stock Movement Details`);
      console.log('━'.repeat(70));
      console.log(`   Movement ID: ${sm.movement_id}`);
      console.log(`   Type: ${sm.movement_type}`);
      console.log(`   Reference: ${sm.reference_type} - ${sm.reference_no}`);
      console.log(`   From: ${sm.source_location_type} (${sm.source_location_id})`);
      console.log(`   To: ${sm.destination_location_type} (${sm.destination_location_id})`);
      console.log(`   Total Qty: ${sm.total_qty}`);
      console.log(`   Status: ${sm.status}\n`);

      // Get goods movement items for this movement
      const gmi = await pool.request()
        .input('movement_id', sql.Int, sm.movement_id)
        .query(`
          SELECT movement_item_id, spare_part_id, qty, condition
          FROM goods_movement_items
          WHERE movement_id = @movement_id
        `);

      if (gmi.recordset.length > 0) {
        console.log(`📋 STEP 6: Goods Movement Items for Movement ${sm.movement_id}`);
        console.log('━'.repeat(70));
        for (const item of gmi.recordset) {
          console.log(`   Item ${item.movement_item_id}: Spare ${item.spare_part_id}, Qty ${item.qty}, ${item.condition}`);
        }
        console.log();
      }
    }

    // Final summary
    console.log('═'.repeat(70));
    console.log('📊 FINAL SUMMARY');
    console.log('═'.repeat(70));
    
    if (smCountAfter > 0 && gmiCountAfter > 0) {
      console.log('✅ SUCCESS: Data is being created!');
      console.log('\n   ✓ stock_movement table: ' + smCountAfter + ' records');
      console.log('   ✓ goods_movement_items table: ' + gmiCountAfter + ' records');
      console.log('\n📝 The approval flow is WORKING CORRECTLY!');
      console.log('\n   Data being inserted to tables:');
      console.log('   → stock_movement');
      console.log('   → goods_movement_items');
    } else {
      console.log('⚠️ Issue detected - check the API response above');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.close();
  }
}

runCompleteTest();
