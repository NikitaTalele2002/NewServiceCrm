/**
 * Complete Test: Receive Delivery and Verify Stock Movement
 * Tests the entire flow from receiving a DN/Challan to verifying data in stock_movement table
 */

import { sequelize } from './db.js';
import * as StockMovementService from './services/StockMovementService.js';
import { addModelsToSequelize } from './models/associations.js';

// Initialize models
await addModelsToSequelize();

const BASE_URL = 'http://localhost:5000';

// Test data matching user's scenario (REQ-25)
const testData = {
  requestId: 25, // REQ-25
  documentType: 'DN', // DN-20260216-R8H2V
  documentNumber: 'DN-20260216-R8H2V',
  documentDate: '2026-02-19',
  dispatchDate: '2026-02-19',
  plantId: 1, // Source plant
  ascId: 3, // Pimpri ASC (destination)
  items: [
    {
      spare_id: 1, // PART-0
      qty: 1, // Dispatched quantity
      carton_number: 'CTN-20260216-001',
      condition: 'good'
    }
  ]
};

// Mock user token (you may need to adjust based on your auth setup)
const mockHeaders = {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer test-token' // Adjust as needed
};

async function testReceiveDelivery() {
  console.log('\n🔧 === COMPLETE RECEIVE DELIVERY TEST ===\n');

  try {
    // Step 1: Check if spare request exists
    console.log('📝 Step 1: Checking if spare request exists...\n');
    const spareRequest = await sequelize.models.SpareRequest.findByPk(testData.requestId);
    if (spareRequest) {
      console.log('✅ Spare Request found:');
      console.log(`   ID: ${spareRequest.id}`);
      console.log(`   Source (Plant): ${spareRequest.requested_source_id}`);
      console.log(`   Destination (ASC): ${spareRequest.service_center_id}\n`);
    } else {
      console.log(`❌ Spare Request ${testData.requestId} not found\n`);
      console.log('Creating test data...\n');
      // Create test spare request if it doesn't exist
      await createTestData();
    }

    // Step 2: Check spare inventory before
    console.log('📝 Step 2: Checking inventory BEFORE delivery...\n');
    const partId = testData.items[0].spare_id;
    
    const plantInventory = await sequelize.query(`
      SELECT si.*, sp.PART, sp.BRAND 
      FROM spare_inventory si
      LEFT JOIN spare_parts sp ON si.spare_id = sp.id
      WHERE si.spare_id = ${partId} AND si.location_id = ${testData.plantId}
    `, { type: sequelize.QueryTypes.SELECT });
    
    const ascInventory = await sequelize.query(`
      SELECT si.*, sp.PART, sp.BRAND 
      FROM spare_inventory si
      LEFT JOIN spare_parts sp ON si.spare_id = sp.id
      WHERE si.spare_id = ${partId} AND si.location_id = ${testData.ascId}
    `, { type: sequelize.QueryTypes.SELECT });

    console.log('Plant Inventory (before):');
    console.log(plantInventory.length > 0 ? plantInventory[0] : 'No record');
    console.log('\nASC Inventory (before):');
    console.log(ascInventory.length > 0 ? ascInventory[0] : 'No record\n');

    // Step 3: Check if logistics document exists
    console.log('📝 Step 3: Checking if logistics document exists...\n');
    const logisticsDoc = await sequelize.models.LogisticsDocuments.findOne({
      where: {
        document_type: testData.documentType,
        document_number: testData.documentNumber
      }
    });

    if (logisticsDoc) {
      console.log('✅ Logistics Document found:');
      console.log(`   ID: ${logisticsDoc.id}`);
      console.log(`   Type: ${logisticsDoc.document_type}`);
      console.log(`   Number: ${logisticsDoc.document_number}`);
      console.log(`   Status: ${logisticsDoc.status}\n`);
    } else {
      console.log(`⚠️  Logistics Document not found`);
      console.log(`   Creating mock document: ${testData.documentType} ${testData.documentNumber}\n`);
      await createMockLogisticsDocument();
    }

    // Step 4: Call processDeliveryReception directly
    console.log('📝 Step 4: Calling processDeliveryReception directly...\n');
    const payload = {
      requestId: testData.requestId,
      documentType: testData.documentType,
      documentNumber: testData.documentNumber,
      plantId: testData.plantId,
      ascId: testData.ascId,
      items: testData.items,
      userId: 1
    };

    console.log('Request Payload:');
    console.log(JSON.stringify(payload, null, 2));
    console.log('\n');

    try {
      const response = await StockMovementService.processDeliveryReception(payload);
      
      console.log('✅ processDeliveryReception succeeded');
      console.log('Response Data:');
      console.log(JSON.stringify(response, null, 2));
      console.log('\n');
    } catch (error) {
      console.log('❌ processDeliveryReception failed:');
      console.log(`   Message: ${error.message}`);
      console.log(`   Stack: ${error.stack}\n`);
    }

    // Step 5: Query stock_movement table directly
    console.log('📝 Step 5: Querying stock_movement table...\n');
    const stockMovements = await sequelize.query(`
      SELECT TOP 5 
        movement_id, 
        movement_type, 
        reference_no,
        source_location_id,
        destination_location_id,
        total_qty,
        status,
        created_at
      FROM stock_movement 
      ORDER BY created_at DESC
    `, { type: sequelize.QueryTypes.SELECT });

    console.log(`Found ${stockMovements.length} stock movement records:\n`);
    if (stockMovements.length > 0) {
      stockMovements.forEach((movement, idx) => {
        console.log(`${idx + 1}. Movement ID: ${movement.movement_id}`);
        console.log(`   Type: ${movement.movement_type}`);
        console.log(`   Reference: ${movement.reference_no}`);
        console.log(`   Status: ${movement.status}`);
        console.log(`   Total Qty: ${movement.total_qty}`);
        console.log(`   Created: ${movement.created_at}\n`);
      });
    } else {
      console.log('❌ No stock movement records found\n');
    }

    // Step 6: Query goods_movement_items table
    console.log('📝 Step 6: Querying goods_movement_items table...\n');
    const goodsItems = await sequelize.query(`
      SELECT TOP 5 
        item_id,
        movement_id,
        spare_part_id,
        qty,
        condition,
        created_at
      FROM goods_movement_items
      ORDER BY created_at DESC
    `, { type: sequelize.QueryTypes.SELECT });

    console.log(`Found ${goodsItems.length} goods movement items:\n`);
    if (goodsItems.length > 0) {
      goodsItems.forEach((item, idx) => {
        console.log(`${idx + 1}. Item ID: ${item.item_id}`);
        console.log(`   Movement ID: ${item.movement_id}`);
        console.log(`   Spare Part ID: ${item.spare_part_id}`);
        console.log(`   Qty: ${item.qty}`);
        console.log(`   Condition: ${item.condition}\n`);
      });
    } else {
      console.log('❌ No goods movement items found\n');
    }

    // Step 7: Query cartons table
    console.log('📝 Step 7: Querying cartons table...\n');
    const cartons = await sequelize.query(`
      SELECT TOP 5 
        carton_id,
        movement_id,
        carton_number,
        created_at
      FROM cartons
      ORDER BY created_at DESC
    `, { type: sequelize.QueryTypes.SELECT });

    console.log(`Found ${cartons.length} carton records:\n`);
    if (cartons.length > 0) {
      cartons.forEach((carton, idx) => {
        console.log(`${idx + 1}. Carton ID: ${carton.carton_id}`);
        console.log(`   Movement ID: ${carton.movement_id}`);
        console.log(`   Carton Number: ${carton.carton_number}\n`);
      });
    } else {
      console.log('❌ No carton records found\n');
    }

    // Step 8: Check inventory after
    console.log('📝 Step 8: Checking inventory AFTER delivery...\n');
    
    const plantInventoryAfter = await sequelize.query(`
      SELECT si.*, sp.PART, sp.BRAND 
      FROM spare_inventory si
      LEFT JOIN spare_parts sp ON si.spare_id = sp.id
      WHERE si.spare_id = ${partId} AND si.location_id = ${testData.plantId}
    `, { type: sequelize.QueryTypes.SELECT });
    
    const ascInventoryAfter = await sequelize.query(`
      SELECT si.*, sp.PART, sp.BRAND 
      FROM spare_inventory si
      LEFT JOIN spare_parts sp ON si.spare_id = sp.id
      WHERE si.spare_id = ${partId} AND si.location_id = ${testData.ascId}
    `, { type: sequelize.QueryTypes.SELECT });

    console.log('Plant Inventory (after):');
    console.log(plantInventoryAfter.length > 0 ? plantInventoryAfter[0] : 'No record');
    console.log('\nASC Inventory (after):');
    console.log(ascInventoryAfter.length > 0 ? ascInventoryAfter[0] : 'No record\n');

    // Step 9: Summary
    console.log('📊 === TEST SUMMARY ===\n');
    if (stockMovements.length > 0) {
      console.log('✅ stock_movement table has records');
    } else {
      console.log('❌ stock_movement table is EMPTY - Data not being inserted');
    }

    if (goodsItems.length > 0) {
      console.log('✅ goods_movement_items table has records');
    } else {
      console.log('❌ goods_movement_items table is EMPTY');
    }

    if (cartons.length > 0) {
      console.log('✅ cartons table has records');
    } else {
      console.log('❌ cartons table is EMPTY');
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

async function createTestData() {
  try {
    console.log('Creating test spare request...\n');
    
    // Create spare request
    const spareRequest = await sequelize.models.SpareRequest.create({
      id: testData.requestId,
      requested_from: testData.ascId,
      requested_source_id: testData.plantId,
      service_center_id: testData.ascId,
      status_id: 5 // Assume approved status exists
    });

    console.log('✅ Test spare request created\n');
  } catch (error) {
    console.log(`⚠️  Could not create test data: ${error.message}\n`);
  }
}

async function createMockLogisticsDocument() {
  try {
    console.log('Creating mock logistics document...\n');
    
    const logisticsDoc = await sequelize.models.LogisticsDocuments.create({
      document_type: testData.documentType,
      document_number: testData.documentNumber,
      document_date: new Date(testData.documentDate),
      dispatch_date: new Date(testData.dispatchDate),
      reference_id: testData.requestId,
      reference_type: 'SPARE_REQUEST',
      source_id: testData.plantId,
      destination_id: testData.ascId,
      status: 'sent'
    });

    console.log('✅ Mock logistics document created\n');
  } catch (error) {
    console.log(`⚠️  Could not create mock logistics document: ${error.message}\n`);
  }
}

// Run the test
testReceiveDelivery();
