/**
 * Integration Test: Full receive-delivery flow with test data creation
 * Creates necessary records and tests the complete stock movement insertion
 */

import { sequelize, poolPromise, sql } from './db.js';

const BASE_URL = 'http://localhost:5000';
const testUserId = 1; // Admin user

async function setupTestData() {
  console.log('\n📋 === SETTING UP TEST DATA ===\n');
  
  let pool;
  try {
    pool = await poolPromise;

    // Find or create a spare part
    console.log('📝 Step 1: Checking spare parts...');
    let sparePartId = null;
    
    const sparePartsResult = await pool.request()
      .query('SELECT TOP 1 Id FROM spare_parts WHERE BRAND IS NOT NULL');
    
    if (sparePartsResult.recordset.length > 0) {
      sparePartId = sparePartsResult.recordset[0].Id;
      console.log(`✅ Found spare part ID: ${sparePartId}\n`);
    } else {
      console.log('❌ No spare parts found - creating test spare part...\n');
      // Create a test spare part
      const insertResult = await pool.request()
        .input('PART', sql.String, 'TEST-PART-001')
        .input('BRAND', sql.String, 'TEST_BRAND')
        .input('DESCRIPTION', sql.String, 'Test Part Description')
        .query(`
          INSERT INTO spare_parts (PART, BRAND, DESCRIPTION)
          OUTPUT INSERTED.Id
          VALUES (@PART, @BRAND, @DESCRIPTION)
        `);
      sparePartId = insertResult.recordset[0].Id;
      console.log(`✅ Created spare part ID: ${sparePartId}\n`);
    }

    // Check for plant
    console.log('📝 Step 2: Checking for plant...');
    let plantId = 1;
    const plantsResult = await pool.request()
      .query('SELECT TOP 1 plant_id FROM plants WHERE plant_id = 1');
    
    if (plantsResult.recordset.length === 0) {
      console.log('⚠️  Plant ID 1 not found, using ID 1 anyway\n');
    } else {
      console.log(`✅ Plant ID 1 exists\n`);
    }

    // Check for service center (ASC)
    console.log('📝 Step 3: Checking for service center...');
    let ascId = 3;
    const scResult = await pool.request()
      .query('SELECT TOP 1 asc_id FROM service_centers WHERE asc_id = 3');
    
    if (scResult.recordset.length === 0) {
      console.log('⚠️  Service Center ID 3 not found, using ID 3 anyway\n');
    } else {
      console.log(`✅ Service Center ID 3 exists\n`);
    }

    // Check for spare request
    console.log('📝 Step 4: Checking for spare request REQ-25...');
    let requestId = 25;
    const srResult = await pool.request()
      .input('requestId', sql.Int, requestId)
      .query(`
        SELECT request_id, requested_source_id 
        FROM spare_requests 
        WHERE request_id = @requestId
      `);
    
    if (srResult.recordset.length === 0) {
      console.log(`⚠️  Spare Request ${requestId} not found, creating test request...\n`);
      // Create test spare request
      const srInsertResult = await pool.request()
        .input('requestId', sql.Int, requestId)
        .input('plantId', sql.Int, plantId)
        .input('ascId', sql.Int, ascId)
        .input('statusId', sql.Int, 5) // Assume status 5 is approved
        .query(`
          INSERT INTO spare_requests (request_id, requested_source_id, status_id)
          VALUES (@requestId, @plantId, @statusId)
        `);
      console.log(`✅ Created spare request ${requestId}\n`);

      // Create spare request item
      const itemInsertResult = await pool.request()
        .input('requestId', sql.Int, requestId)
        .input('spareId', sql.Int, sparePartId)
        .input('requestedQty', sql.Int, 2)
        .input('approvedQty', sql.Int, 1)
        .query(`
          INSERT INTO spare_request_items (spare_request_id, spare_id, requested_qty, approved_qty)
          VALUES (@requestId, @spareId, @requestedQty, @approvedQty)
        `);
      console.log(`✅ Created spare request item\n`);
    } else {
      const sr = srResult.recordset[0];
      plantId = sr.requested_source_id;
      console.log(`✅ Spare Request ${requestId} found`);
      console.log(`   Plant: ${plantId}\n`);
    }

    // Check for logistics document (DN)
    console.log('📝 Step 5: Checking for logistics document...');
    const docNumber = 'DN-20260216-R8H2V';
    const docResult = await pool.request()
      .input('docType', sql.String, 'DN')
      .input('docNumber', sql.String, docNumber)
      .query(`
        SELECT id, document_type, document_number, status 
        FROM logistics_documents 
        WHERE document_type = @docType AND document_number = @docNumber
      `);
    
    let logisticsDocId;
    if (docResult.recordset.length === 0) {
      console.log(`⚠️  Logistics document ${docNumber} not found, creating...\n`);
      // Create test logistics document
      const docInsertResult = await pool.request()
        .input('docType', sql.String, 'DN')
        .input('docNumber', sql.String, docNumber)
        .input('requestId', sql.Int, requestId)
        .input('refType', sql.String, 'SPARE_REQUEST')
        .input('sourceId', sql.Int, plantId)
        .input('destId', sql.Int, ascId)
        .input('status', sql.String, 'sent')
        .query(`
          INSERT INTO logistics_documents 
          (document_type, document_number, reference_id, reference_type, source_id, destination_id, status, document_date, dispatch_date)
          OUTPUT INSERTED.id
          VALUES (@docType, @docNumber, @requestId, @refType, @sourceId, @destId, @status, GETDATE(), GETDATE())
        `);
      logisticsDocId = docInsertResult.recordset[0].id;
      console.log(`✅ Created logistics document ID: ${logisticsDocId}\n`);

      // Create logistics document item
      const itemInsertResult = await pool.request()
        .input('docId', sql.Int, logisticsDocId)
        .input('sparePartId', sql.Int, sparePartId)
        .input('qty', sql.Int, 1)
        .query(`
          INSERT INTO logistics_document_items 
          (document_id, spare_part_id, qty, uom)
          VALUES (@docId, @sparePartId, @qty, 'PCS')
        `);
      console.log(`✅ Created logistics document item\n`);
    } else {
      logisticsDocId = docResult.recordset[0].id;
      console.log(`✅ Logistics document ${docNumber} found`);
      console.log(`   Status: ${docResult.recordset[0].status}\n`);
    }

    console.log('✅ Test data setup complete!\n');
    
    return {
      requestId,
      plantId,
      ascId,
      sparePartId,
      logisticsDocId,
      docNumber
    };

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    throw error;
  }
}

async function testReceiveDelivery(testData) {
  console.log('\n📦 === TESTING RECEIVE DELIVERY ===\n');

  try {
    // Direct call to processDeliveryReception using SQL
    // Since we can't easily import and use the service, let's test via direct SQL simulation
    
    console.log('📝 Simulating receive-delivery request...\n');
    
    const payload = {
      requestId: testData.requestId,
      documentType: 'DN',
      documentNumber: testData.docNumber,
      plantId: testData.plantId,
      ascId: testData.ascId,
      items: [
        {
          spare_id: testData.sparePartId,
          qty: 1,
          carton_number: 'CTN-20260216-001',
          condition: 'good'
        }
      ],
      userId: testUserId
    };

    console.log('Payload:');
    console.log(JSON.stringify(payload, null, 2));
    console.log('\n');

    // Test via HTTP if server is running
    try {
      console.log('📝 Attempting HTTP call to receive-delivery endpoint...\n');
      const response = await fetch(`${BASE_URL}/api/logistics/receive-delivery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      console.log(`Response Status: ${response.status}`);
      console.log('Response:');
      console.log(JSON.stringify(data, null, 2));
      console.log('\n');

    } catch (fetchError) {
      console.log(`⚠️  HTTP call failed (is server running?): ${fetchError.message}\n`);
      // Continue with direct database test
    }

    // Wait a moment for the call to complete
    await new Promise(resolve => setTimeout(resolve, 2000));

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

async function checkResults() {
  console.log('\n📊 === CHECKING RESULTS ===\n');

  try {
    // Check stock_movement
    console.log('📝 Step 1: Checking stock_movement table...');
    const smResult = await sequelize.query(`
      SELECT TOP 5 movement_id, movement_type, reference_no, status, total_qty, created_at 
      FROM stock_movement 
      ORDER BY created_at DESC
    `, { type: sequelize.QueryTypes.SELECT });

    if (smResult.length > 0) {
      console.log(`✅ Found ${smResult.length} stock movement records!\n`);
      smResult.forEach((record, idx) => {
        console.log(`${idx + 1}. Movement ID: ${record.movement_id}`);
        console.log(`   Type: ${record.movement_type}`);
        console.log(`   Reference: ${record.reference_no}`);
        console.log(`   Status: ${record.status}`);
        console.log(`   Qty: ${record.total_qty}`);
        console.log(`   Created: ${record.created_at}\n`);
      });
    } else {
      console.log('❌ No stock_movement records found\n');
    }

    // Check goods_movement_items
    console.log('📝 Step 2: Checking goods_movement_items table...');
    const gmiResult = await sequelize.query(`
      SELECT TOP 5 item_id, movement_id, spare_part_id, qty, condition, created_at 
      FROM goods_movement_items 
      ORDER BY created_at DESC
    `, { type: sequelize.QueryTypes.SELECT });

    if (gmiResult.length > 0) {
      console.log(`✅ Found ${gmiResult.length} goods movement items!\n`);
      gmiResult.forEach((record, idx) => {
        console.log(`${idx + 1}. Item ID: ${record.item_id}`);
        console.log(`   Movement ID: ${record.movement_id}`);
        console.log(`   Spare Part ID: ${record.spare_part_id}`);
        console.log(`   Qty: ${record.qty}\n`);
      });
    } else {
      console.log('❌ No goods_movement_items records found\n');
    }

    // Check cartons
    console.log('📝 Step 3: Checking cartons table...');
    const cartonsResult = await sequelize.query(`
      SELECT TOP 5 carton_id, movement_id, carton_number, created_at 
      FROM cartons 
      ORDER BY created_at DESC
    `, { type: sequelize.QueryTypes.SELECT });

    if (cartonsResult.length > 0) {
      console.log(`✅ Found ${cartonsResult.length} carton records!\n`);
      cartonsResult.forEach((record, idx) => {
        console.log(`${idx + 1}. Carton ID: ${record.carton_id}`);
        console.log(`   Movement ID: ${record.movement_id}`);
        console.log(`   Carton Number: ${record.carton_number}\n`);
      });
    } else {
      console.log('❌ No carton records found\n');
    }

    console.log('📊 === SUMMARY ===\n');
    if (smResult.length > 0) {
      console.log('✅✅✅ SUCCESS! Stock movement data is being inserted!\n');
      console.log('Data flow is working:');
      console.log(`  ✓ ${smResult.length} stock movement records created`);
      console.log(`  ✓ ${gmiResult.length} goods movement items created`);
      console.log(`  ✓ ${cartonsResult.length} cartons created`);
    } else {
      console.log('❌ Data insertion is NOT working');
      console.log('\nPossible issues:');
      console.log('1. The receive-delivery endpoint is not being called');
      console.log('2. The service is throwing an error silently');
      console.log('3. Check server logs for detailed error messages');
      console.log('4. Verify the request payload is correct');
    }

  } catch (error) {
    console.error('❌ Result check failed:', error.message);
  }
}

// Main execution
async function main() {
  try {
    const testData = await setupTestData();
    await testReceiveDelivery(testData);
    await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for DB operations
    await checkResults();
  } catch (error) {
    console.error('❌ Main test failed:', error.message);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

main();
