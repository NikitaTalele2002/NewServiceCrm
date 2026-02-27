/**
 * Seed Script for Spare Return Data (Using existing SpareRequest Tables)
 * Creates sample spare return requests using the spare_request and spare_request_item tables
 * 
 * Request Types Used:
 * - spare_request_type: 'TECH_RETURN_DEFECTIVE' (for defective items from technician)
 * - spare_request_type: 'TECH_RETURN_EXCESS' (for unused items from technician)
 * - requested_source_type: 'technician'
 * 
 * Usage: cd server && node seed_spare_return_using_spare_request.js
 */

import { sequelize, connectDB } from './db.js';
import { SpareRequest, SpareRequestItem, Technicians, ServiceCenter, SparePart, Users, Status } from './models/index.js';

const seedSpareReturnData = async () => {
  try {
    console.log('\n✅ Connecting to database...');
    await connectDB();
    console.log('✅ Database connected\n');
    
    console.log('========== SEEDING SPARE RETURN DATA ==========\n');

    // Get existing data from database
    const technicians = await Technicians.findAll({ limit: 5 });
    const serviceCenters = await ServiceCenter.findAll({ limit: 2 });
    const spareParts = await SparePart.findAll({ limit: 10 });
    const users = await Users.findAll({ limit: 3 });
    const status = await Status.findOne({ where: { status_name: 'Pending' } }) || await Status.findOne();

    if (technicians.length === 0 || serviceCenters.length === 0 || spareParts.length === 0 || !status) {
      console.error('❌ Not enough test data in database. Status record needed.');
      if (technicians.length === 0) console.error('   - No technicians found');
      if (serviceCenters.length === 0) console.error('   - No service centers found');
      if (spareParts.length === 0) console.error('   - No spare parts found');
      if (!status) console.error('   - No status records found');
      process.exit(1);
    }

    console.log(`✓ Found ${technicians.length} technicians`);
    console.log(`✓ Found ${serviceCenters.length} service centers`);
    console.log(`✓ Found ${spareParts.length} spare parts`);
    console.log(`✓ Found status: ${status.status_name} (ID: ${status.status_id})\n`);

    const tech1 = technicians[0];
    const tech2 = technicians.length > 1 ? technicians[1] : technicians[0];
    const sc1 = serviceCenters[0];
    const spare1 = spareParts[0];
    const spare2 = spareParts.length > 1 ? spareParts[1] : spareParts[0];
    const spare3 = spareParts.length > 2 ? spareParts[2] : spareParts[0];

    // Sample 1: Defective Spare Return - Pending
    console.log('📝 Creating Sample 1: Defective Spare Return (PENDING)...');
    const defectiveReturn1 = await SpareRequest.create({
      request_type: 'consignment_return',
      spare_request_type: 'TECH_RETURN_DEFECTIVE',
      call_id: 1001,
      requested_source_type: 'technician',
      requested_source_id: tech1.technician_id,
      requested_to_type: 'warehouse',
      requested_to_id: 1, // Default warehouse
      request_reason: 'defect',
      status_id: status.status_id,
      remarks: 'Motor failed - customer replacement done. Returning defective unit.',
      created_by: tech1.technician_id,
      updated_by: tech1.technician_id,
    });

    await SpareRequestItem.create({
      request_id: defectiveReturn1.request_id,
      spare_id: spare1.Id,
      requested_qty: 1,
      approved_qty: 0,
      remarks: 'Defective motor - not working',
    });

    console.log(`  ✓ Return ID: ${defectiveReturn1.request_id} | Status: PENDING`);
    console.log(`  ✓ Type: DEFECTIVE | Spare: ${spare1.spare_part_name}\n`);

    // Sample 2: Multiple Defective Items - Pending
    console.log('📤 Creating Sample 2: Multiple Defective Items (PENDING)...');
    const defectiveReturn2 = await SpareRequest.create({
      request_type: 'consignment_return',
      spare_request_type: 'TECH_RETURN_DEFECTIVE',
      call_id: 1002,
      requested_source_type: 'technician',
      requested_source_id: tech2.technician_id,
      requested_to_type: 'warehouse',
      requested_to_id: 1,
      request_reason: 'defect',
      status_id: status.status_id,
      remarks: 'Two defective bearings collected from customer. Both failed due to manufacturing defect.',
      created_by: tech2.technician_id,
      updated_by: tech2.technician_id,
    });

    await SpareRequestItem.create({
      request_id: defectiveReturn2.request_id,
      spare_id: spare2.Id,
      requested_qty: 2,
      approved_qty: 0,
      remarks: 'Bearing failure - making noise',
    });

    console.log(`  ✓ Return ID: ${defectiveReturn2.request_id} | Status: PENDING`);
    console.log(`  ✓ Type: DEFECTIVE | Items: 2\n`);

    // Sample 3: Excess Spare Return (Unused) - Pending
    console.log('📦 Creating Sample 3: Excess Spare Return (PENDING)...');
    const excessReturn = await SpareRequest.create({
      request_type: 'consignment_return',
      spare_request_type: 'ASC_RETURN_EXCESS',
      requested_source_type: 'technician',
      requested_source_id: tech1.technician_id,
      requested_to_type: 'warehouse',
      requested_to_id: 1,
      request_reason: 'bulk',
      status_id: status.status_id,
      remarks: 'Over-allocated spares from previous consignment. Not needed for recent calls.',
      created_by: tech1.technician_id,
      updated_by: tech1.technician_id,
    });

    await SpareRequestItem.create({
      request_id: excessReturn.request_id,
      spare_id: spare3.Id,
      requested_qty: 3,
      approved_qty: 0,
      remarks: 'Excess stock - return to inventory',
    });

    console.log(`  ✓ Return ID: ${excessReturn.request_id} | Status: PENDING`);
    console.log(`  ✓ Type: EXCESS | Items: 3\n`);

    // Sample 4: Approved Return - Completed
    console.log('✅ Creating Sample 4: Approved Return (COMPLETED)...');
    const approvedReturn = await SpareRequest.create({
      request_type: 'consignment_return',
      spare_request_type: 'TECH_RETURN_DEFECTIVE',
      call_id: 1003,
      requested_source_type: 'technician',
      requested_source_id: tech2.technician_id,
      requested_to_type: 'warehouse',
      requested_to_id: 1,
      request_reason: 'defect',
      status_id: status.status_id,
      remarks: 'Defective compressor - customer reported overheating',
      created_by: tech2.technician_id,
      updated_by: tech2.technician_id,
    });

    await SpareRequestItem.create({
      request_id: approvedReturn.request_id,
      spare_id: spare1.Id,
      requested_qty: 1,
      approved_qty: 1,
      remarks: 'Compressor overheating - verified and approved for return',
    });

    console.log(`  ✓ Return ID: ${approvedReturn.request_id} | Status: APPROVED\n`);

    // Sample 5: Rejected Return
    console.log('❌ Creating Sample 5: Rejected Return (REJECTED)...');
    const rejectedReturn = await SpareRequest.create({
      request_type: 'consignment_return',
      spare_request_type: 'TECH_RETURN_DEFECTIVE',
      call_id: 1004,
      requested_source_type: 'technician',
      requested_source_id: tech1.technician_id,
      requested_to_type: 'warehouse',
      requested_to_id: 1,
      request_reason: 'defect',
      status_id: status.status_id,
      remarks: 'Return request for spare that does not match our database records',
      created_by: tech1.technician_id,
      updated_by: tech1.technician_id,
    });

    await SpareRequestItem.create({
      request_id: rejectedReturn.request_id,
      spare_id: spare2.Id,
      requested_qty: 1,
      approved_qty: 0,
      rejection_reason: 'Spare part does not match vehicle model records',
      remarks: 'Incorrect spare returned - not approved',
    });

    console.log(`  ✓ Return ID: ${rejectedReturn.request_id} | Status: REJECTED\n`);

    // Sample 6: Mix of Defective and Excess - Pending
    console.log('📋 Creating Sample 6: Mixed Return (PENDING)...');
    const mixedReturn = await SpareRequest.create({
      request_type: 'consignment_return',
      spare_request_type: 'TECH_RETURN_DEFECTIVE',
      call_id: 1005,
      requested_source_type: 'technician',
      requested_source_id: tech1.technician_id,
      requested_to_type: 'warehouse',
      requested_to_id: 1,
      request_reason: 'defect',
      status_id: status.status_id,
      remarks: 'Mixed return: 1 defective unit + 2 excess units',
      created_by: tech1.technician_id,
      updated_by: tech1.technician_id,
    });

    // Defective item in mixed request
    await SpareRequestItem.create({
      request_id: mixedReturn.request_id,
      spare_id: spare1.Id,
      requested_qty: 1,
      approved_qty: 0,
      remarks: 'Defective - compressor not working',
    });

    // Excess item in mixed request
    await SpareRequestItem.create({
      request_id: mixedReturn.request_id,
      spare_id: spare2.Id,
      requested_qty: 2,
      approved_qty: 0,
      remarks: 'Excess - not used in call',
    });

    console.log(`  ✓ Return ID: ${mixedReturn.request_id} | Status: PENDING`);
    console.log(`  ✓ Items: 1 Defective + 1 Excess (2 items total)\n`);

    console.log('\n========== SEEDING COMPLETE ==========\n');
    console.log('✅ Sample spare return data created successfully!\n');
    console.log('📊 SUMMARY:');
    console.log('  • Sample 1 (ID ' + defectiveReturn1.request_id + '): Single defective return (PENDING)');
    console.log('  • Sample 2 (ID ' + defectiveReturn2.request_id + '): Multiple defective items (PENDING)');
    console.log('  • Sample 3 (ID ' + excessReturn.request_id + '): Excess/unused items (PENDING)');
    console.log('  • Sample 4 (ID ' + approvedReturn.request_id + '): Approved return (COMPLETED)');
    console.log('  • Sample 5 (ID ' + rejectedReturn.request_id + '): Rejected return (REJECTED)');
    console.log('  • Sample 6 (ID ' + mixedReturn.request_id + '): Mixed defective + excess (PENDING)\n');
    
    console.log('🚀 YOU CAN NOW TEST:');
    console.log('  1. View returns by status (pending/approved/rejected)');
    console.log('  2. Details for each return with items');
    console.log('  3. Track defective items vs excess items');
    console.log('  4. Check approval workflow\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding data:', error.message);
    console.error(error);
    process.exit(1);
  }
};

// Run the seeding
seedSpareReturnData();
