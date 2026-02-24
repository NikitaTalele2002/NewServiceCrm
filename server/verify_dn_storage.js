/**
 * Comprehensive verification that DN number is stored in reference_no field
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

async function verifyDNStorage() {
  console.log('\n✅ === DN NUMBER STORAGE VERIFICATION ===\n');

  const requestId = 24;
  const ascId = 4;
  
  // Get DN document
  const pool = new sql.ConnectionPool(dbConfig);
  await pool.connect();

  const docResult = await pool.request().query(
    `SELECT document_number FROM logistics_documents 
     WHERE document_type = 'DN' AND reference_id = ${requestId} AND reference_type = 'SPARE_REQUEST'`
  );

  const dnNumber = docResult.recordset[0].document_number;
  console.log(`📋 SAP-Generated DN Number: ${dnNumber}\n`);

  const token = generateToken('service_center', ascId);
  
  // Send receive-delivery request
  console.log('📤 Sending receive-delivery request...\n');
  
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
          qty: 2,
          carton_number: `CTN-VERIFY-${Date.now()}`,
          condition: 'good'
        }]
      })
    });

    const data = await response.json();
    
    if (response.status === 201 && data.ok) {
      console.log('✅ API returned 201 Created\n');
    } else {
      console.log(`❌ API Error: ${response.status}\n`);
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

  // Query the latest stock_movement record
  console.log('🔍 Checking stock_movement table...\n');
  
  const movementResult = await pool.request().query(
    `SELECT TOP 1 movement_id, reference_no, movement_type, source_location_id, 
            destination_location_id, total_qty, reference_type, status, created_at
     FROM stock_movement 
     WHERE reference_type = 'spare_request' 
     AND reference_no = '${dnNumber}'
     ORDER BY movement_id DESC`
  );

  if (movementResult.recordset.length === 0) {
    console.log('❌ No stock_movement record found for this DN\n');
    await pool.close();
    return;
  }

  const movement = movementResult.recordset[0];

  console.log('📊 Stock Movement Record Details:');
  console.log('━'.repeat(60));
  console.log(`  movement_id:        ${movement.movement_id}`);
  console.log(`  reference_type:     ${movement.reference_type}`);
  console.log(`  reference_no (DN):  ${movement.reference_no}`);
  console.log(`  Expected DN:        ${dnNumber}`);
  console.log(`  ✅ DN Match:        ${movement.reference_no === dnNumber ? 'YES ✅' : 'NO ❌'}`);
  console.log('━'.repeat(60));
  console.log(`  movement_type:      ${movement.movement_type}`);
  console.log(`  source:             Plant ${movement.source_location_id} (branch)`);
  console.log(`  destination:        ASC ${movement.destination_location_id} (service_center)`);
  console.log(`  total_qty:          ${movement.total_qty} units`);
  console.log(`  status:             ${movement.status}`);
  console.log(`  created_at:         ${movement.created_at}`);
  console.log('━'.repeat(60));

  // Check goods_movement_items for this movement
  console.log('\n📋 Associated Goods Movement Items:');
  
  const itemsResult = await pool.request().query(
    `SELECT movement_item_id, spare_part_id, qty, condition
     FROM goods_movement_items 
     WHERE movement_id = ${movement.movement_id}`
  );

  console.log('');
  for (const item of itemsResult.recordset) {
    console.log(`  Item ${item.movement_item_id}: Spare ${item.spare_part_id}, Qty: ${item.qty}, Condition: ${item.condition}`);
  }

  // Verify inventory changes
  console.log('\n📊 Inventory Changes:');
  
  const invResult = await pool.request().query(
    `SELECT location_type, location_id, qty_good 
     FROM spare_inventory 
     WHERE spare_id = 0 AND location_id IN (1, 4)
     ORDER BY location_id`
  );

  for (const row of invResult.recordset) {
    const location = row.location_type === 'branch' ? `Plant ${row.location_id}` : `ASC ${row.location_id}`;
    console.log(`  ${location}: ${row.qty_good} units`);
  }

  await pool.close();

  console.log('\n✅ DN Number Successfully Stored in reference_no Field!\n');
}

verifyDNStorage().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
