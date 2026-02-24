/**
 * Test to verify DN and qty are correct in stock_movement table
 */

import jwt from 'jsonwebtoken';
import sql from 'mssql';

const JWT_SECRET = 'supersecret_jwt_key_change_me';
const BASE_URL = 'http://localhost:5000';

function generateToken(userRole = 'admin', ascId = 4) {
  const payload = {
    id: 1,
    username: userRole === 'service_center' ? 'test_asc_user' : 'test_admin',
    role: userRole,
    centerId: ascId,
    service_center_id: ascId
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

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

async function testDNAndQty() {
  console.log('\n✅ === VERIFYING DN AND QTY IN STOCK_MOVEMENT ===\n');

  const requestId = 24;
  const ascId = 4;
  const plantId = 1;
  
  // Get DN document
  const pool = new sql.ConnectionPool(dbConfig);
  await pool.connect();

  const docResult = await pool.request().query(
    `SELECT document_number FROM logistics_documents 
     WHERE document_type = 'DN' AND reference_id = ${requestId} AND reference_type = 'SPARE_REQUEST'`
  );

  const dnNumber = docResult.recordset[0].document_number;
  console.log(`📋 DN Document: ${dnNumber}`);

  const token = generateToken('service_center', ascId);
  
  // Send receive-delivery with CORRECT qty (approved qty)
  console.log(`\n📤 Step 1: Sending receive-delivery request with approved qty...\n`);
  
  let apiResponse = null;
  try {
    const response = await fetch(`${BASE_URL}/api/logistics/receive-delivery`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        requestId: requestId,
        documentType: 'DN',
        documentNumber: dnNumber,
        items: [{
          spare_id: 0,
          qty: 2, // Approved qty
          carton_number: `CTN-DN-TEST-${Date.now()}`,
          condition: 'good'
        }]
      })
    });

    const data = await response.json();
    apiResponse = data;
    
    if (response.status === 201 && data.ok) {
      console.log('✅ API returned 201 Created\n');
    } else {
      console.log(`❌ API Error: ${response.status} - ${data.error}\n`);
      await pool.close();
      return;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    await pool.close();
    return;
  }

  // Wait for database to settle
  await new Promise(r => setTimeout(r, 1000));

  // Query stock_movement to verify DN and qty
  console.log('📊 Step 2: Checking stock_movement table...\n');
  
  const movementResult = await pool.request().query(
    `SELECT TOP 5 movement_id, reference_no, total_qty, movement_type, 
            source_location_id, destination_location_id, status
     FROM stock_movement 
     WHERE reference_type = 'spare_request'
     ORDER BY created_at DESC`
  );

  console.log('📋 Latest stock_movement records:');
  for (const movement of movementResult.recordset) {
    console.log(`\n  movement_id: ${movement.movement_id}`);
    console.log(`  reference_no: ${movement.reference_no}`);
    console.log(`  Expected DN: ${dnNumber}`);
    console.log(`  ✅ Match: ${movement.reference_no === dnNumber ? 'YES ✅' : 'NO ❌'}`);
    console.log(`  total_qty: ${movement.total_qty} (expected 2)`);
    console.log(`  ✅ Qty Match: ${movement.total_qty === 2 ? 'YES ✅' : 'NO ❌'}`);
    console.log(`  movement_type: ${movement.movement_type}`);
    console.log(`  Plant → ASC: ${movement.source_location_id} → ${movement.destination_location_id}`);
  }

  // Check goods_movement_items qty
  console.log('\n\n📋 goods_movement_items (Item-level qty):');
  
  const itemsResult = await pool.request().query(
    `SELECT TOP 5 movement_item_id, movement_id, spare_part_id, qty, condition
     FROM goods_movement_items 
     ORDER BY created_at DESC`
  );

  for (const item of itemsResult.recordset) {
    console.log(`\n  movement_item_id: ${item.movement_item_id}`);
    console.log(`  movement_id: ${item.movement_id}`);
    console.log(`  spare_part_id: ${item.spare_part_id}`);
    console.log(`  qty: ${item.qty} (expected 2)`);
    console.log(`  ✅ Qty Match: ${item.qty === 2 ? 'YES ✅' : 'NO ❌'}`);
    console.log(`  condition: ${item.condition}`);
  }

  // Check inventory updates
  console.log('\n\n📊 Step 3: Checking inventory updates...\n');
  
  const invResult = await pool.request().query(
    `SELECT spare_id, location_type, location_id, qty_good 
     FROM spare_inventory 
     WHERE spare_id = 0 AND location_id IN (1, 4)`
  );

  console.log('📋 Current Inventory:');
  for (const row of invResult.recordset) {
    console.log(`  Spare ${row.spare_id} at ${row.location_type}-${row.location_id}: ${row.qty_good} units`);
  }

  await pool.close();

  console.log('\n✅ Test Complete!\n');
}

testDNAndQty();
