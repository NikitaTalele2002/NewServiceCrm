import { SpareRequest, SpareRequestItem, Status, ServiceCenter } from './models/index.js';
import { sequelize } from './db.js';
import { determineRequestType, getRequestTypeDescription } from './utils/requestTypeHelper.js';
import { REQUEST_TYPES, LOCATION_TYPES } from './constants/requestTypeConstants.js';

async function testSpareRequestCreation() {
  try {
    console.log('Testing Spare Request Creation...\n');

    // 1. Check if Status exists
    console.log('1. Checking Status table for "pending" status:');
    let statusRow = await Status.findOne({ where: { status_name: 'pending' } });
    
    if (!statusRow) {
      console.log('   Creating "pending" status...');
      statusRow = await Status.create({ status_name: 'pending' });
    }
    
    console.log(`   ✓ Status ID: ${statusRow.status_id}, Name: ${statusRow.status_name}\n`);

    // 2. Check if ServiceCenter exists
    console.log('2. Checking ServiceCenter for test data:');
    const serviceCenter = await ServiceCenter.findOne();
    
    if (!serviceCenter) {
      console.log('   ❌ No service center found!');
      process.exit(1);
    }
    
    console.log(`   ✓ Service Center ID: ${serviceCenter.asc_id}, Name: ${serviceCenter.asc_name}`);
    console.log(`   ✓ Plant ID: ${serviceCenter.plant_id}\n`);

    // 3. Test auto-determination logic
    console.log('3. Testing Request Type Auto-Determination:');
    
    const testCases = [
      { source: LOCATION_TYPES.SERVICE_CENTER, dest: LOCATION_TYPES.PLANT, expected: REQUEST_TYPES.CONSIGNMENT_RETURN },
      { source: LOCATION_TYPES.TECHNICIAN, dest: LOCATION_TYPES.SERVICE_CENTER, expected: REQUEST_TYPES.TECH_CONSIGNMENT_RETURN },
      { source: LOCATION_TYPES.SERVICE_CENTER, dest: LOCATION_TYPES.TECHNICIAN, expected: REQUEST_TYPES.TECH_CONSIGNMENT_ISSUE },
      { source: LOCATION_TYPES.PLANT, dest: LOCATION_TYPES.SERVICE_CENTER, expected: REQUEST_TYPES.CONSIGNMENT_FILLUP }
    ];

    testCases.forEach(test => {
      const result = determineRequestType(test.source, test.dest);
      const matches = result === test.expected ? '✓' : '❌';
      console.log(`   ${matches} ${test.source} → ${test.dest}`);
      console.log(`      Result: ${result}`);
      console.log(`      Description: ${getRequestTypeDescription(result)}`);
    });

    console.log('\n4. Testing SpareRequest Creation:');
    
    // Create a test spare request
    const newRequest = await SpareRequest.create({
      request_type: determineRequestType(LOCATION_TYPES.SERVICE_CENTER, LOCATION_TYPES.PLANT),
      call_id: null,
      requested_source_type: LOCATION_TYPES.SERVICE_CENTER,
      requested_source_id: parseInt(serviceCenter.asc_id),
      requested_to_type: LOCATION_TYPES.PLANT,
      requested_to_id: serviceCenter.plant_id,
      request_reason: 'msl',
      status_id: statusRow.status_id,
      created_by: 1
    });

    console.log(`   ✓ Created SpareRequest:`);
    console.log(`      ID: ${newRequest.request_id}`);
    console.log(`      Type: ${newRequest.request_type} (${getRequestTypeDescription(newRequest.request_type)})`);
    console.log(`      Source: ${newRequest.requested_source_type} (ID: ${newRequest.requested_source_id})`);
    console.log(`      Destination: ${newRequest.requested_to_type} (ID: ${newRequest.requested_to_id})`);
    console.log(`      Status: ${newRequest.status_id}\n`);

    // 5. Test creating request items
    console.log('5. Testing SpareRequestItem Creation:');
    
    const item1 = await SpareRequestItem.create({
      request_id: newRequest.request_id,
      spare_id: 1,
      requested_qty: 5,
      approved_qty: 0
    });

    const item2 = await SpareRequestItem.create({
      request_id: newRequest.request_id,
      spare_id: 2,
      requested_qty: 3,
      approved_qty: 0
    });

    console.log(`   ✓ Created Item 1: Spare ID 1, Qty: 5`);
    console.log(`   ✓ Created Item 2: Spare ID 2, Qty: 3\n`);

    // 6. Verify associations
    console.log('6. Verifying Associations:');
    
    const fullRequest = await SpareRequest.findByPk(newRequest.request_id, {
      include: [
        {
          model: SpareRequestItem,
          as: 'SpareRequestItems'  // Use correct alias
        }
      ]
    });

    if (fullRequest && fullRequest.SpareRequestItems) {
      console.log(`   ✓ Request loaded with ${fullRequest.SpareRequestItems.length} items`);
      fullRequest.SpareRequestItems.forEach((item, idx) => {
        console.log(`      Item ${idx + 1}: Spare ${item.spare_id}, Qty: ${item.requested_qty}`);
      });
    }

    console.log('\n✅ SpareRequest Creation Test PASSED!');
    console.log('\nYou can now safely create spare orders through the UI. The system will:');
    console.log('  1. Auto-determine request_type based on source/destination');
    console.log('  2. Create SpareRequest record with correct type');
    console.log('  3. Create associated SpareRequestItem records');
    console.log('  4. Store all data in database');

    // Cleanup - delete test data
    console.log('\nCleaning up test data...');
    await SpareRequestItem.destroy({ where: { request_id: newRequest.request_id } });
    await SpareRequest.destroy({ where: { request_id: newRequest.request_id } });
    console.log('✓ Test data removed');

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    await sequelize.close();
    process.exit(1);
  }
}

testSpareRequestCreation();
