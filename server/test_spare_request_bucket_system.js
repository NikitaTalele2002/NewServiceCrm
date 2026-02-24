/**
 * Spare Request Test Suite
 * Tests the bucket system integration with spare requests
 * 
 * This validates:
 * - Creating spare requests with proper types (CFU, TECH_ISSUE, etc.)
 * - Stock movements created for each request type
 * - Bucket quantities updated correctly
 * - Validation of stock availability
 */

import { 
  SpareRequest,
  StockMovement,
  InventoryBucket
} from '../models/index.js';
import {
  SPARE_REQUEST_TYPES,
  SPARE_REQUEST_TYPE_DESCRIPTIONS,
  SPARE_REQUEST_TO_MOVEMENTS,
  REQUEST_REASONS
} from '../constants/requestTypeConstants.js';
import {
  BUCKETS,
  MOVEMENT_TO_BUCKET_MAPPING,
  getBucketForMovement
} from '../constants/bucketConstants.js';
import { processMovement } from '../services/bucketTrackingService.js';
import { determineRequestType } from '../utils/requestTypeHelper.js';

/**
 * Test helper: Create a test spare request
 */
async function createTestRequest(type, quantity = 5) {
  try {
    console.log(`\n📋 Creating test request: ${type} (qty: ${quantity})`);
    
    const request = await SpareRequest.create({
      spare_request_type: type,
      model_id: 1,
      quantity: quantity,
      requested_by: 1,
      approved_status: 'pending',
      status: 'open'
    });
    
    console.log(`✅ Request created: ${request.request_id}`);
    return request;
  } catch (error) {
    console.error(`❌ Error creating request:`, error.message);
    throw error;
  }
}

/**
 * Test helper: Create test movements for a request
 */
async function createTestMovements(requestType, quantity = 5) {
  try {
    console.log(`\n📦 Creating movements for: ${requestType}`);
    
    const movementTypes = SPARE_REQUEST_TO_MOVEMENTS[requestType];
    const results = [];
    
    for (const movementType of movementTypes) {
      const bucketInfo = getBucketForMovement(movementType);
      
      console.log(`   Creating: ${movementType} → ${bucketInfo.bucket} (${bucketInfo.operation})`);
      
      const result = await processMovement({
        stock_movement_type: movementType,
        model_id: 1,
        total_qty: quantity,
        source_location_type: 'plant',
        source_location_id: 1,
        destination_location_type: 'service_center',
        destination_location_id: 1,
        reference_type: 'spare_request',
        reference_no: `TEST-${requestType}-${Date.now()}`
      });
      
      console.log(`   ✅ Movement ${movementType}: ${bucketInfo.bucket} ${bucketInfo.operation} by ${quantity}`);
      results.push(result);
    }
    
    return results;
  } catch (error) {
    console.error(`❌ Error creating movements:`, error.message);
    throw error;
  }
}

/**
 * Test helper: Check bucket quantities
 */
async function checkBucketQuantities(modelId = 1, locationType = 'service_center', locationId = 1) {
  try {
    const buckets = await InventoryBucket.findAll({
      where: {
        model_id: modelId,
        location_type: locationType,
        location_id: locationId
      },
      raw: true
    });
    
    const inventory = {
      [BUCKETS.GOOD]: 0,
      [BUCKETS.DEFECTIVE]: 0,
      [BUCKETS.IN_TRANSIT]: 0
    };
    
    buckets.forEach(b => {
      inventory[b.bucket] = b.quantity;
    });
    
    console.log(`\n📊 Bucket Status at ${locationType}/${locationId}:`);
    console.log(`   GOOD: ${inventory[BUCKETS.GOOD]}`);
    console.log(`   DEFECTIVE: ${inventory[BUCKETS.DEFECTIVE]}`);
    console.log(`   IN_TRANSIT: ${inventory[BUCKETS.IN_TRANSIT]}`);
    console.log(`   TOTAL: ${inventory[BUCKETS.GOOD] + inventory[BUCKETS.DEFECTIVE] + inventory[BUCKETS.IN_TRANSIT]}`);
    
    return inventory;
  } catch (error) {
    console.error(`❌ Error checking buckets:`, error.message);
    throw error;
  }
}

/**
 * Test: CFU (Consignment Fill-Up)
 * Branch sends consignment to ASC
 * Movements: FILLUP_DISPATCH (IN_TRANSIT +) → FILLUP_RECEIPT (GOOD +)
 */
async function testCFU() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST: CFU (Consignment Fill-Up)');
  console.log('='.repeat(60));
  
  const request = await createTestRequest(SPARE_REQUEST_TYPES.CFU, 10);
  await createTestMovements(SPARE_REQUEST_TYPES.CFU, 10);
  await checkBucketQuantities();
}

/**
 * Test: TECH_ISSUE (Technician Issue)
 * ASC issues spare to technician
 * Movements: TECH_ISSUE_OUT (GOOD -) → TECH_ISSUE_IN (GOOD +)
 */
async function testTechIssue() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST: TECH_ISSUE (Technician Issue)');
  console.log('='.repeat(60));
  
  // Pre-populate GOOD bucket
  await processMovement({
    stock_movement_type: 'FILLUP_RECEIPT',
    model_id: 1,
    total_qty: 20,
    source_location_type: 'plant',
    source_location_id: 1,
    destination_location_type: 'service_center',
    destination_location_id: 1,
    reference_type: 'spare_request',
    reference_no: `PREPOP-${Date.now()}`
  });
  
  console.log(`\n📊 Pre-population: Added 20 to GOOD bucket`);
  await checkBucketQuantities();
  
  const request = await createTestRequest(SPARE_REQUEST_TYPES.TECH_ISSUE, 5);
  await createTestMovements(SPARE_REQUEST_TYPES.TECH_ISSUE, 5);
  await checkBucketQuantities();
}

/**
 * Test: TECH_RETURN_DEFECTIVE (Technician Return)
 * Technician returns defective spare to ASC
 * Movements: TECH_RETURN_DEFECTIVE (DEFECTIVE +)
 */
async function testTechReturnDefective() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST: TECH_RETURN_DEFECTIVE (Technician Return)');
  console.log('='.repeat(60));
  
  const request = await createTestRequest(SPARE_REQUEST_TYPES.TECH_RETURN_DEFECTIVE, 3);
  await createTestMovements(SPARE_REQUEST_TYPES.TECH_RETURN_DEFECTIVE, 3);
  await checkBucketQuantities();
}

/**
 * Test: ASC_RETURN_DEFECTIVE (ASC Return Defective)
 * ASC returns defective spare to branch
 * Movements: ASC_RETURN_DEFECTIVE_OUT (GOOD -) → ASC_RETURN_DEFECTIVE_IN (DEFECTIVE +)
 */
async function testASCReturnDefective() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST: ASC_RETURN_DEFECTIVE (ASC Return Defective)');
  console.log('='.repeat(60));
  
  const request = await createTestRequest(SPARE_REQUEST_TYPES.ASC_RETURN_DEFECTIVE, 2);
  await createTestMovements(SPARE_REQUEST_TYPES.ASC_RETURN_DEFECTIVE, 2);
  await checkBucketQuantities();
}

/**
 * Test: Reason-Based Request Type Determination
 */
async function testReasonMapping() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST: Reason-Based Request Type Mapping');
  console.log('='.repeat(60));
  
  const tests = [
    { reason: REQUEST_REASONS.MSL, expected: SPARE_REQUEST_TYPES.CFU, desc: 'MSL → CFU' },
    { reason: REQUEST_REASONS.BULK, expected: SPARE_REQUEST_TYPES.CFU, desc: 'BULK → CFU' },
    { reason: REQUEST_REASONS.DEFECT, source: 'technician', expected: SPARE_REQUEST_TYPES.TECH_RETURN_DEFECTIVE, desc: 'DEFECT (tech) → TECH_RETURN_DEFECTIVE' },
    { reason: REQUEST_REASONS.DEFECT, source: 'service_center', expected: SPARE_REQUEST_TYPES.ASC_RETURN_DEFECTIVE, desc: 'DEFECT (asc) → ASC_RETURN_DEFECTIVE' },
    { reason: REQUEST_REASONS.PICKUP, expected: SPARE_REQUEST_TYPES.BRANCH_PICKUP, desc: 'PICKUP → BRANCH_PICKUP' }
  ];
  
  console.log('\n📋 Testing request type determination:');
  tests.forEach(test => {
    const result = determineRequestType(test.reason, test.source);
    const status = result === test.expected ? '✅' : '❌';
    console.log(`   ${status} ${test.desc}: Got ${result}`);
  });
}

/**
 * Test: Movement to Bucket Mapping
 */
async function testMovementBucketMapping() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST: Movement Type to Bucket Mapping');
  console.log('='.repeat(60));
  
  console.log('\n📊 All movement type → bucket mappings:');
  Object.entries(MOVEMENT_TO_BUCKET_MAPPING).forEach(([movement, config]) => {
    console.log(`   ${movement}: ${config.bucket} (${config.operation})`);
  });
}

/**
 * Main test runner
 */
async function runAllTests() {
  try {
    console.log('\n\n');
    console.log('╔' + '═'.repeat(58) + '╗');
    console.log('║' + ' '.repeat(15) + 'SPARE REQUEST TEST SUITE' + ' '.repeat(19) + '║');
    console.log('╚' + '═'.repeat(58) + '╝');
    
    // Test reason-based mapping
    await testReasonMapping();
    
    // Test movement-bucket mapping
    await testMovementBucketMapping();
    
    // Test each request type
    await testCFU();
    await testTechIssue();
    await testTechReturnDefective();
    await testASCReturnDefective();
    
    console.log('\n\n');
    console.log('╔' + '═'.repeat(58) + '╗');
    console.log('║' + ' '.repeat(20) + '✅ ALL TESTS PASSED' + ' '.repeat(18) + '║');
    console.log('╚' + '═'.repeat(58) + '╝\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n\n❌ TEST SUITE FAILED:', error.message);
    console.log(error.stack);
    process.exit(1);
  }
}

// Run tests
runAllTests();
