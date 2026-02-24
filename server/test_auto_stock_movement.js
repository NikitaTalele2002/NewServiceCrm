/**
 * Test: Auto stock_movement creation when DN is created in SAP
 * 
 * Flow:
 * 1. REST call to sync-sap endpoint (simulates DN being created in SAP)
 * 2. Verify stock_movement is auto-created with correct DN
 * 3. Call receive-delivery to confirm physical receipt
 * 4. Verify inventory is updated correctly
 */

import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';
import sql from 'mssql';

const JWT_SECRET = 'supersecret_jwt_key_change_me';
const BASE_URL = 'http://localhost:5000';

const dbConfig = {
  server: 'localhost',
  user: 'crm_user',
  password: 'StrongPassword123!',
  database: 'ServiceCrm',
  options: {
    instanceName: 'SQLEXPRESS',
    encrypt: false,
    trustServerCertificate: true,
  }
};

function generateToken(role = 'rsm') {
  const payload = {
    id: 1,
    username: role === 'rsm' ? 'test_rsm' : 'test_asc',
    role: role,
    centerId: role === 'service_center' ? 4 : undefined,
    service_center_id: role === 'service_center' ? 4 : undefined
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

async function test() {
  console.log('\n✅ === TEST: AUTO STOCK_MOVEMENT CREATION ===\n');

  const pool = new sql.ConnectionPool(dbConfig);
  await pool.connect();

  // Find an approved spare request
  console.log('📋 Step 1: Finding approved spare request...');
  const reqResult = await pool.request().query(`
    SELECT TOP 1 
      sr.request_id, 
      sr.requested_source_id as asc_id,
      sr.status_id,
      st.status_name
    FROM spare_requests sr
    LEFT JOIN status st ON st.status_id = sr.status_id
    WHERE st.status_name = 'approved_by_rsm'
    ORDER BY sr.request_id DESC
  `);

  if (!reqResult.recordset.length) {
    console.log('❌ No approved requests found');
    await pool.close();
    return;
  }

  const request = reqResult.recordset[0];
  console.log(`✅ Found Request ${request.request_id} (approved)`);
  console.log(`   ASC ID: ${request.asc_id}\n`);

  // Call sync-sap to create DN and auto-create stock_movement
  console.log('📋 Step 2: Calling sync-sap endpoint...');
  const rsmToken = generateToken('rsm');
  
  try {
    const syncResponse = await fetch(`${BASE_URL}/api/logistics/sync-sap`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${rsmToken}`
      },
      body: JSON.stringify({
        requestId: request.request_id
      })
    });

    const syncData = await syncResponse.json();
    if (!syncResponse.ok) {
      console.log(`❌ sync-sap failed: ${syncData.error}`);
      await pool.close();
      return;
    }

    console.log(`✅ sync-sap succeeded (201)\n`);

    // Get the created DN
    let dnDocument = null;
    for (const doc of syncData.documents) {
      if (doc.document_type === 'DN') {
        dnDocument = doc;
        break;
      }
    }

    if (!dnDocument) {
      console.log('❌ No DN document returned');
      await pool.close();
      return;
    }

    console.log(`📌 Created DN: ${dnDocument.document_number}`);
    console.log(`   Status: ${dnDocument.status}\n`);

    // Verify stock_movement was auto-created
    console.log('📋 Step 3: Verifying auto-created stock_movement...');
    const smResult = await pool.request().query(`
      SELECT TOP 1 
        movement_id, 
        reference_no, 
        reference_type,
        status, 
        total_qty,
        source_location_id,
        destination_location_id,
        created_at
      FROM stock_movement
      WHERE reference_no = '${dnDocument.document_number}'
      ORDER BY movement_id DESC
    `);

    if (!smResult.recordset.length) {
      console.log(`❌ Stock movement NOT auto-created for DN ${dnDocument.document_number}`);
      await pool.close();
      return;
    }

    const stockMovement = smResult.recordset[0];
    console.log(`✅ Stock movement auto-created: ID=${stockMovement.movement_id}`);
    console.log(`   reference_no: ${stockMovement.reference_no}`);
    console.log(`   Status: ${stockMovement.status}`);
    console.log(`   Qty: ${stockMovement.total_qty}\n`);

    // Verify DN and stock_movement have matching DNs
    if (stockMovement.reference_no === dnDocument.document_number) {
      console.log(`✅ MATCH: DN in logistics_documents == reference_no in stock_movement`);
    } else {
      console.log(`❌ MISMATCH:`);
      console.log(`   Logistics DN: ${dnDocument.document_number}`);
      console.log(`   Stock Movement reference_no: ${stockMovement.reference_no}`);
    }
    console.log();

    // Get inventory before receive-delivery
    console.log('📋 Step 4: Checking inventory before receive-delivery...');
    const invBefore = await pool.request().query(`
      SELECT spare_id, location_type, location_id, qty_good
      FROM spare_inventory
      WHERE location_type IN ('branch', 'service_center')
        AND location_id IN (1, ${request.asc_id})
      ORDER BY location_type DESC
    `);
    
    const plantQtyBefore = invBefore.recordset.find(i => i.location_type === 'branch')?.qty_good || 0;
    const ascQtyBefore = invBefore.recordset.find(i => i.location_type === 'service_center')?.qty_good || 0;
    
    console.log(`   Plant (Location 1): ${plantQtyBefore} units`);
    console.log(`   ASC (Location ${request.asc_id}): ${ascQtyBefore} units\n`);

    // Call receive-delivery to confirm receipt
    console.log('📋 Step 5: Calling receive-delivery to confirm receipt...');
    const ascToken = generateToken('service_center');
    
    const recvResponse = await fetch(`${BASE_URL}/api/logistics/receive-delivery`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ascToken}`
      },
      body: JSON.stringify({
        requestId: request.request_id,
        documentType: 'DN',
        documentNumber: dnDocument.document_number,  // Can send correct or wrong DN - backend should handle
        ascId: request.asc_id,
        items: [{
          spare_id: 0,  // Assuming we had spares
          qty: stockMovement.total_qty
        }]
      })
    });

    const recvData = await recvResponse.json();
    if (recvResponse.ok) {
      console.log(`✅ receive-delivery succeeded (201)\n`);
    } else {
      console.log(`⚠️ receive-delivery returned ${recvResponse.status}: ${recvData.error}`);
    }

    // Verify stock_movement status changed to completed
    console.log('📋 Step 6: Verifying stock_movement status...');
    const smAfter = await pool.request().query(`
      SELECT movement_id, status FROM stock_movement WHERE movement_id = ${stockMovement.movement_id}
    `);

    const finalStatus = smAfter.recordset[0]?.status;
    console.log(`   Status: ${finalStatus}`);
    
    if (finalStatus === 'completed') {
      console.log(`   ✅ Status correctly changed to completed\n`);
    } else {
      console.log(`   ⚠️ Status is ${finalStatus} (expected completed)\n`);
    }

    // Verify inventory was updated
    console.log('📋 Step 7: Checking inventory after receive-delivery...');
    const invAfter = await pool.request().query(`
      SELECT spare_id, location_type, location_id, qty_good
      FROM spare_inventory
      WHERE location_type IN ('branch', 'service_center')
        AND location_id IN (1, ${request.asc_id})
    `);
    
    const plantQtyAfter = invAfter.recordset.find(i => i.location_type === 'branch')?.qty_good || 0;
    const ascQtyAfter = invAfter.recordset.find(i => i.location_type === 'service_center')?.qty_good || 0;
    
    console.log(`   Plant: ${plantQtyBefore} → ${plantQtyAfter} (change: ${plantQtyAfter - plantQtyBefore})`);
    console.log(`   ASC: ${ascQtyBefore} → ${ascQtyAfter} (change: ${ascQtyAfter - ascQtyBefore})\n`);

    console.log('✅ === TEST COMPLETE ===\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  await pool.close();
}

try {
  await test();
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
