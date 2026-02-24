/**
 * Test the DN fix: Verify receive-delivery uses database DN, not frontend DN
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

function generateToken(ascId = 4) {
  const payload = {
    id: 1,
    username: 'test_asc_user',
    role: 'service_center',
    centerId: ascId,
    service_center_id: ascId
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

async function testDNFix() {
  console.log('\n✅ === TEST DN FIX ===\n');

  const pool = new sql.ConnectionPool(dbConfig);
  await pool.connect();

  // Get request 31 data
  console.log('📋 Request 31 Details:');
  console.log('━═━━━━━━━━━━━━━━━━━━\n');

  const req31 = await pool.request().query(`
    SELECT TOP 1
      sr.request_id,
      sr.requested_source_id as plant_id,
      srs.requested_source_id as asc_id,
      sri.spare_id,
      sri.requested_qty,
      sri.approved_qty
    FROM spare_requests sr
    CROSS JOIN (SELECT 4 as requested_source_id) srs
    LEFT JOIN spare_request_items sri ON sri.request_id = sr.request_id
    WHERE sr.request_id = 31
  `);

  if (!req31.recordset.length) {
    console.log('❌ Request 31 not found');
    await pool.close();
    return;
  }

  const request = req31.recordset[0];
  console.log(`Request ID: ${request.request_id}`);
  console.log(`From Plant: ${request.plant_id}`);
  console.log(`To ASC: ${request.asc_id}`);
  console.log(`Spare ID: ${request.spare_id}, Qty: ${request.approved_qty}\n`);

  // Get the LATEST DN for request 31
  const dnResult = await pool.request().query(`
    SELECT TOP 1 id, document_number, status
    FROM logistics_documents
    WHERE reference_id = 31 AND document_type = 'DN'
    ORDER BY created_at DESC
  `);

  const dn = dnResult.recordset[0];
  console.log(`📌 SAP-Generated DN (from database): ${dn.document_number}`);
  console.log(`Status: ${dn.status}\n`);

  // Send receive-delivery request with WRONG DN (to test if backend fixes it)
  const wrongDN = 'DN-WRONG-TEST';
  console.log(`📋 Calling receive-delivery with wrong DN: ${wrongDN}`);
  console.log('Expected: Backend should find correct DN from database\n');

  const token = generateToken(4);
  
  try {
    const response = await fetch(`${BASE_URL}/logistics/receive-delivery`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        requestId: 31,
        documentType: 'DN',
        documentNumber: wrongDN,  // WRONG DN - backend should ignore this
        plantId: request.plant_id,
        ascId: request.asc_id,
        items: [{
          spare_id: request.spare_id,
          qty: request.approved_qty
        }]
      })
    });

    const result = await response.json();
    console.log(`Status: ${response.status}`);
    
    if (response.ok) {
      console.log(`✅ Received ${result.data.documentNumber}`);
      console.log(`Expected: ${dn.document_number}`);
      
      if (result.data.documentNumber === dn.document_number) {
        console.log(`✅ CORRECT! Backend returned database DN, not frontend wrong DN\n`);
      } else {
        console.log(`❌ WRONG DN returned!\n`);
      }

      // Check what was stored in stock_movement
      const movementResult = await pool.request().query(`
        SELECT TOP 1 movement_id, reference_no, total_qty, status
        FROM stock_movement
        WHERE reference_no = '${dn.document_number}'
        ORDER BY movement_id DESC
      `);

      if (movementResult.recordset.length > 0) {
        const movement = movementResult.recordset[0];
        console.log(`📌 Stock Movement Created:`);
        console.log(`   ID: ${movement.movement_id}`);
        console.log(`   reference_no: ${movement.reference_no}`);
        console.log(`   Qty: ${movement.total_qty}`);
        console.log(`   Status: ${movement.status}`);
        
        if (movement.reference_no === dn.document_number) {
          console.log(`\n✅ SUCCESS! stock_movement.reference_no = database DN`);
        } else {
          console.log(`\n❌ PROBLEM! reference_no doesn't match`);
        }
      } else {
        console.log(`⚠️ No stock_movement found with DN ${dn.document_number}`);
      }
    } else {
      console.log(`❌ Error: ${result.error}`);
    }
  } catch (error) {
    console.log(`❌ Request failed: ${error.message}`);
  }

  await pool.close();
}

try {
  await testDNFix();
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
