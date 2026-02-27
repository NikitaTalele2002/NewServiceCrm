/**
 * Seed Script for TechnicianSpareReturn Test Data
 * Creates sample spare return requests with various statuses for testing
 * 
 * Usage: cd server && node seed_spare_return_data.js
 */

import { sequelize, connectDB } from './db.js';
import { TechnicianSpareReturn, TechnicianSpareReturnItem, Technicians, ServiceCenter, SparePart, Users } from './models/index.js';

const seedData = async () => {
  try {
    console.log('\n✅ Connecting to database...');
    await connectDB();
    console.log('✅ Database connected\n');
    
    console.log('========== SEEDING SPARE RETURN DATA ==========\n');

    // Get existing IDs from database
    const technicians = await Technicians.findAll({ limit: 5 });
    const serviceCenters = await ServiceCenter.findAll({ limit: 2 });
    const spareParts = await SparePart.findAll({ limit: 10 });
    const users = await Users.findAll({ limit: 3 });

    if (technicians.length === 0 || serviceCenters.length === 0 || spareParts.length === 0) {
      console.error('❌ Not enough test data in database. Please ensure technicians, service centers, and spare parts exist.');
      process.exit(1);
    }

    console.log(`✓ Found ${technicians.length} technicians`);
    console.log(`✓ Found ${serviceCenters.length} service centers`);
    console.log(`✓ Found ${spareParts.length} spare parts`);
    console.log(`✓ Found ${users.length} users\n`);

    const tech1 = technicians[0];
    const tech2 = technicians.length > 1 ? technicians[1] : technicians[0];
    const sc1 = serviceCenters[0];
    const sc2 = serviceCenters.length > 1 ? serviceCenters[1] : serviceCenters[0];
    const user1 = users[0];
    const spare1 = spareParts[0];
    const spare2 = spareParts.length > 1 ? spareParts[1] : spareParts[0];
    const spare3 = spareParts.length > 2 ? spareParts[2] : spareParts[0];

    // Sample 1: Draft Status (Technician is creating - can edit before submit)
    console.log('📝 Creating Sample 1: DRAFT (In-Progress - Not Submitted)...');
    const draftReturn = await TechnicianSpareReturn.create(
      {
        technician_id: tech1.technician_id,
        service_center_id: sc1.asc_id,
        return_number: `TSR-DRAFT-${Date.now()}-001`,
        return_status: 'draft',
        remarks: 'Collecting spares before submitting',
        created_by: user1.user_id,
      },
      { transaction: undefined }
    );

    await TechnicianSpareReturnItem.create({
      return_id: draftReturn.return_id,
      spare_id: spare1.Id,
      item_type: 'defective',
      requested_qty: 2,
      defect_reason: 'Display not working',
      remarks: 'Collected from customer at location A',
    });

    console.log(`  ✓ Return ID: ${draftReturn.return_id} | Status: DRAFT\n`);

    // Sample 2: Submitted Status (Awaiting SC to receive)
    console.log('📤 Creating Sample 2: SUBMITTED (Awaiting Service Center)...');
    const submittedReturn = await TechnicianSpareReturn.create({
      technician_id: tech1.technician_id,
      service_center_id: sc1.asc_id,
      call_id: 1001,
      return_number: `TSR-SUBMIT-${Date.now()}-002`,
      return_status: 'submitted',
      return_date: new Date(),
      remarks: 'Defective spare collected from customer visit. Unused spare not used in call.',
      created_by: user1.user_id,
    });

    await TechnicianSpareReturnItem.create({
      return_id: submittedReturn.return_id,
      spare_id: spare1.Id,
      item_type: 'defective',
      requested_qty: 1,
      defect_reason: 'Motor not running',
      remarks: 'Original spare failed after 2 days',
    });

    await TechnicianSpareReturnItem.create({
      return_id: submittedReturn.return_id,
      spare_id: spare2.Id,
      item_type: 'unused',
      requested_qty: 2,
      remarks: 'Was allocated but not needed for this call',
    });

    console.log(`  ✓ Return ID: ${submittedReturn.return_id} | Status: SUBMITTED`);
    console.log(`  ✓ Items: 1 Defective + 1 Unused\n`);

    // Sample 3: Received Status (SC has received items, awaiting verification)
    console.log('📦 Creating Sample 3: RECEIVED (SC Received - Awaiting Verification)...');
    const receivedReturn = await TechnicianSpareReturn.create({
      technician_id: tech2.technician_id,
      service_center_id: sc1.asc_id,
      call_id: 1002,
      return_number: `TSR-RECV-${Date.now()}-003`,
      return_status: 'received',
      return_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      received_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      remarks: 'Return submitted for defective compressor',
      received_remarks: 'Received 1 defective compressor in damaged packaging',
      created_by: user1.user_id,
      received_by: user1.user_id,
    });

    const receivedItem = await TechnicianSpareReturnItem.create({
      return_id: receivedReturn.return_id,
      spare_id: spare1.Id,
      item_type: 'defective',
      requested_qty: 1,
      received_qty: 1,
      defect_reason: 'Compressor not starting',
      condition_on_receipt: 'damaged',
      remarks: 'Packaging damaged but item intact',
    });

    console.log(`  ✓ Return ID: ${receivedReturn.return_id} | Status: RECEIVED`);
    console.log(`  ✓ Items Received: ${receivedItem.received_qty}/${receivedItem.requested_qty}\n`);

    // Sample 4: Verified Status (SC has verified and inventory is updated)
    console.log('✅ Creating Sample 4: VERIFIED (SC Verified - Inventory Updated)...');
    const verifiedReturn = await TechnicianSpareReturn.create({
      technician_id: tech2.technician_id,
      service_center_id: sc2.asc_id,
      call_id: 1003,
      return_number: `TSR-VERIFY-${Date.now()}-004`,
      return_status: 'verified',
      return_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      received_date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
      verified_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      remarks: 'Multiple defective spares from customer replacement',
      received_remarks: 'All items received in good condition',
      verified_remarks: 'Verified and inventoried. 2 defective added to defect inventory.',
      created_by: user1.user_id,
      received_by: user1.user_id,
      verified_by: user1.user_id,
    });

    await TechnicianSpareReturnItem.create({
      return_id: verifiedReturn.return_id,
      spare_id: spare2.Id,
      item_type: 'defective',
      requested_qty: 2,
      received_qty: 2,
      verified_qty: 2,
      defect_reason: 'Bearing failure',
      condition_on_receipt: 'good',
      remarks: 'Both units defective, verified and moved to defect storage',
    });

    await TechnicianSpareReturnItem.create({
      return_id: verifiedReturn.return_id,
      spare_id: spare3.Id,
      item_type: 'unused',
      requested_qty: 1,
      received_qty: 1,
      verified_qty: 1,
      condition_on_receipt: 'good',
      remarks: 'Unused spare, added back to inventory',
    });

    console.log(`  ✓ Return ID: ${verifiedReturn.return_id} | Status: VERIFIED`);
    console.log(`  ✓ Items Verified: Defective=2, Unused=1\n`);

    // Sample 5: Cancelled Status
    console.log('❌ Creating Sample 5: CANCELLED (Cancelled Return)...');
    const cancelledReturn = await TechnicianSpareReturn.create({
      technician_id: tech1.technician_id,
      service_center_id: sc1.asc_id,
      return_number: `TSR-CANCEL-${Date.now()}-005`,
      return_status: 'cancelled',
      return_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      remarks: 'Cancelled - Wrong spare was added, will resubmit',
      created_by: user1.user_id,
    });

    await TechnicianSpareReturnItem.create({
      return_id: cancelledReturn.return_id,
      spare_id: spare1.Id,
      item_type: 'defective',
      requested_qty: 1,
      defect_reason: 'Wrong part number',
    });

    console.log(`  ✓ Return ID: ${cancelledReturn.return_id} | Status: CANCELLED\n`);

    // Sample 6: Multiple Items Return
    console.log('📋 Creating Sample 6: SUBMITTED (Multiple Items)...');
    const multiItemReturn = await TechnicianSpareReturn.create({
      technician_id: tech1.technician_id,
      service_center_id: sc1.asc_id,
      call_id: 1004,
      return_number: `TSR-MULTI-${Date.now()}-006`,
      return_status: 'submitted',
      return_date: new Date(),
      remarks: 'Multiple spares from today\'s visit',
      created_by: user1.user_id,
    });

    // Add 3 different items
    await TechnicianSpareReturnItem.create({
      return_id: multiItemReturn.return_id,
      spare_id: spare1.Id,
      item_type: 'defective',
      requested_qty: 1,
      defect_reason: 'Overheating issue',
      remarks: 'Failed during customer testing',
    });

    await TechnicianSpareReturnItem.create({
      return_id: multiItemReturn.return_id,
      spare_id: spare2.Id,
      item_type: 'unused',
      requested_qty: 3,
      remarks: 'Over-allocated for this site, not needed',
    });

    await TechnicianSpareReturnItem.create({
      return_id: multiItemReturn.return_id,
      spare_id: spare3.Id,
      item_type: 'defective',
      requested_qty: 2,
      defect_reason: 'Physical damage',
      remarks: 'Damaged during installation',
    });

    console.log(`  ✓ Return ID: ${multiItemReturn.return_id} | Status: SUBMITTED`);
    console.log(`  ✓ Items: 2 Defective + 1 Unused (3 items total)\n`);

    console.log('\n========== SEEDING COMPLETE ==========\n');
    console.log('✅ Sample data created successfully!\n');
    console.log('📊 SUMMARY:');
    console.log('  • Sample 1 (ID ' + draftReturn.return_id + '): DRAFT status - Not yet submitted');
    console.log('  • Sample 2 (ID ' + submittedReturn.return_id + '): SUBMITTED - Awaiting SC receipt');
    console.log('  • Sample 3 (ID ' + receivedReturn.return_id + '): RECEIVED - Awaiting verification');
    console.log('  • Sample 4 (ID ' + verifiedReturn.return_id + '): VERIFIED - Complete flow');
    console.log('  • Sample 5 (ID ' + cancelledReturn.return_id + '): CANCELLED - Shows cancellation');
    console.log('  • Sample 6 (ID ' + multiItemReturn.return_id + '): SUBMITTED - Multiple items\n');
    
    console.log('🚀 YOU CAN NOW TEST:');
    console.log('  1. Get all returns: GET /api/technician-spare-returns');
    console.log('  2. Get return details: GET /api/technician-spare-returns/[return_id]');
    console.log('  3. SC View returns: GET /api/returns/technician-spare-returns/list');
    console.log('  4. Receive items: POST /api/technician-spare-returns/[return_id]/receive');
    console.log('  5. Verify return: POST /api/technician-spare-returns/[return_id]/verify\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding data:', error.message);
    console.error(error);
    process.exit(1);
  }
};

// Run the seeding
seedData();
