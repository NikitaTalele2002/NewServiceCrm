/**
 * Updated Seed Script for Spare Return Data 
 * Uses REAL call IDs, REAL technician-ASC assignments, and REAL spare parts
 * Technicians submit returns to their assigned ASC (Service Center), not warehouse
 * 
 * Implementation:
 * 1. Gets real calls with their assigned technician IDs
 * 2. Gets the service center assigned to each technician
 * 3. Uses spare parts from actual inventory
 * 4. Creates realistic return requests
 * 
 * Usage: cd server && node seed_spare_return_updated.js
 */

import { sequelize, connectDB } from './db.js';
import { SpareRequest, SpareRequestItem, Calls, Technicians, ServiceCenter, SparePart, Users, Status } from './models/index.js';
import { QueryTypes } from 'sequelize';

const seedSpareReturnData = async () => {
  try {
    console.log('\n✅ Connecting to database...');
    await connectDB();
    console.log('✅ Database connected\n');
    
    console.log('========== SEEDING SPARE RETURN DATA WITH REAL DATA ==========\n');

    // Get real calls from database
    const calls = await Calls.findAll({ limit: 10 });
    if (calls.length === 0) {
      console.error('❌ No calls found in database. Please create some calls first.');
      process.exit(1);
    }
    console.log(`✓ Found ${calls.length} calls\n`);

    // Get spare parts from database
    const spareParts = await SparePart.findAll({ limit: 15 });
    if (spareParts.length === 0) {
      console.error('❌ No spare parts found in database.');
      process.exit(1);
    }
    console.log(`✓ Found ${spareParts.length} spare parts`);

    // Get status
    const status = await Status.findOne({ where: { status_name: 'Pending' } }) || await Status.findOne();
    if (!status) {
      console.error('❌ No status records found.');
      process.exit(1);
    }
    console.log(`✓ Found status: ${status.status_name}\n`);

    // Store successful inserts
    const insertedReturns = [];

    // Process each call and create a return for it
    for (let i = 0; i < Math.min(calls.length, 6); i++) {
      const call = calls[i];
      
      // Check if call has technician and service center assigned
      if (!call.assigned_tech_id || !call.assigned_asc_id) {
        console.log(`⏭️  Skipping Call ${call.call_id} - No technician/SC assigned\n`);
        continue;
      }

      const technicianId = call.assigned_tech_id;
      const serviceCenterId = call.assigned_asc_id;

      const technician = await Technicians.findByPk(technicianId);
      const serviceCenter = await ServiceCenter.findByPk(serviceCenterId);

      if (!technician || !serviceCenter) {
        console.log(`⏭️  Skipping Call ${call.call_id} - Missing technician or service center\n`);
        continue;
      }

      // Get random spare parts for this return
      const spare1 = spareParts[i % spareParts.length];
      const spare2 = spareParts[(i + 1) % spareParts.length];
      const spare3 = spareParts[(i + 2) % spareParts.length];

      // Create different types of returns based on call number
      let returnType, requestSource, requestDestination, reason, defectRemarks;

      if (i === 0) {
        returnType = 'TECH_RETURN_DEFECTIVE';
        requestSource = 'technician';
        requestDestination = 'service_center';
        reason = 'defect';
        defectRemarks = `Defective ${spare1.spare_part_name || 'spare'} - not working properly`;
      } else if (i === 1) {
        returnType = 'TECH_RETURN_DEFECTIVE';
        requestSource = 'technician';
        requestDestination = 'service_center';
        reason = 'defect';
        defectRemarks = `Multiple defective spares collected from customer`;
      } else if (i === 2) {
        returnType = 'TECH_RETURN_EXCESS';
        requestSource = 'technician';
        requestDestination = 'service_center';
        reason = 'excess';
        defectRemarks = `Excess/unused spares from technician`;
      } else if (i === 3) {
        returnType = 'ASC_RETURN_DEFECTIVE';
        requestSource = 'service_center';
        requestDestination = 'plant';
        reason = 'defect';
        defectRemarks = `Defective spares collected from technician - returning to plant`;
      } else if (i === 4) {
        returnType = 'ASC_RETURN_EXCESS';
        requestSource = 'service_center';
        requestDestination = 'plant';
        reason = 'excess';
        defectRemarks = `Over-allocated spares not used - returning to plant`;
      } else {
        returnType = 'TECH_RETURN_DEFECTIVE';
        requestSource = 'technician';
        requestDestination = 'service_center';
        reason = 'defect';
        defectRemarks = `Mixed defective items from technician`;
      }

      console.log(`\n📝 Creating Return for Call ${call.call_id}:`);
      console.log(`   Technician: ${technician.technician_name || 'Tech ' + technician.technician_id}`);
      console.log(`   Service Center: ${serviceCenter.asc_name || 'ASC ' + serviceCenter.asc_id}`);
      console.log(`   Return Type: ${returnType} → ${reason.toUpperCase()}`);
      console.log(`   From: ${requestSource === 'technician' ? 'Technician' : 'Service Center'}`);
      console.log(`   To: ${requestDestination === 'service_center' ? 'Service Center' : 'Plant'}`);

      // Determine who is creating the request
      const createdByUser = requestSource === 'technician' ? technicianId : serviceCenterId;

      // Get destination ID based on type
      let destinationId;
      if (requestDestination === 'service_center') {
        destinationId = serviceCenterId;
      } else if (requestDestination === 'plant') {
        // Get the plant assigned to this service center
        const [plantInfo] = await sequelize.query(
          'SELECT TOP 1 plant_id FROM service_centers WHERE asc_id = ?',
          { replacements: [serviceCenterId], type: QueryTypes.SELECT }
        );
        destinationId = plantInfo?.plant_id || 1; // Default to plant ID 1 if not assigned
        console.log(`   ✓ ASC's Assigned Plant: ${destinationId}`);
      }

      // Create the return request
      const returnRequest = await SpareRequest.create({
        request_type: 'consignment_return',
        spare_request_type: returnType,
        call_id: call.call_id,
        requested_source_type: requestSource,
        requested_source_id: requestSource === 'technician' ? technicianId : serviceCenterId,
        // DYNAMIC: Technician returns to ASC, ASC returns to assigned Plant
        requested_to_type: requestDestination,
        requested_to_id: destinationId,
        request_reason: reason, // Dynamic: 'defect' or 'excess'
        status_id: status.status_id,
        remarks: defectRemarks,
        created_by: createdByUser,
        updated_by: createdByUser,
      });

      // Add first item
      await SpareRequestItem.create({
        request_id: returnRequest.request_id,
        spare_id: spare1.Id,
        requested_qty: 1,
        approved_qty: 0,
        remarks: `${spare1.spare_part_name || 'Spare'} - ${returnType === 'TECH_RETURN_DEFECTIVE' ? 'Defective' : 'Excess'}`,
      });

      // Add second item (if not single item return)
      if (i !== 0 && i !== 3) {
        await SpareRequestItem.create({
          request_id: returnRequest.request_id,
          spare_id: spare2.Id,
          requested_qty: returnType === 'ASC_RETURN_EXCESS' ? 3 : 2,
          approved_qty: 0,
          remarks: `${spare2.spare_part_name || 'Spare'} - ${returnType === 'TECH_RETURN_DEFECTIVE' ? 'Defective' : 'Excess'}`,
        });
      }

      // Add third item for mixed returns
      if (i === 5) {
        await SpareRequestItem.create({
          request_id: returnRequest.request_id,
          spare_id: spare3.Id,
          requested_qty: 2,
          approved_qty: 0,
          remarks: `${spare3.spare_part_name || 'Spare'} - Defective`,
        });
      }

      insertedReturns.push({
        returnId: returnRequest.request_id,
        callId: call.call_id,
        technician: technician.technician_name || 'Tech ' + technician.technician_id,
        serviceCenter: serviceCenter.asc_name || 'ASC ' + serviceCenter.asc_id,
        type: returnType,
      });

      console.log(`   ✓ Return ID: ${returnRequest.request_id}`);
      console.log(`   ✓ Type: ${returnType}\n`);
    }

    console.log('\n========== SEEDING COMPLETE ==========\n');
    console.log('✅ Sample spare return data created successfully!\n');
    console.log('📊 CREATED RETURNS:\n');
    insertedReturns.forEach((ret, idx) => {
      console.log(`${idx + 1}. Return ID ${ret.returnId} | Call ${ret.callId}`);
      console.log(`   Technician: ${ret.technician}`);
      console.log(`   Service Center: ${ret.serviceCenter}`);
      console.log(`   Type: ${ret.type}\n`);
    });

    console.log('🚀 WHAT YOU CAN DO NOW:');
    console.log('  1. Query the database to see real returns with real call IDs');
    console.log('  2. Service Centers can now see returns for their assigned technicians');
    console.log('  3. Process returns through the approval workflow');
    console.log('  4. Track inventory updates when items are approved\n');

    console.log('💾 Verify in SQL:');
    console.log('   SELECT * FROM spare_requests WHERE request_type = "consignment_return"');
    console.log('   SELECT sr.*, sri.spare_id, sri.requested_qty');
    console.log('   FROM spare_requests sr');
    console.log('   LEFT JOIN spare_request_items sri ON sr.request_id = sri.request_id');
    console.log('   WHERE sr.call_id IN (SELECT call_id FROM calls WHERE call_id > 0)\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding data:', error.message);
    console.error(error);
    process.exit(1);
  }
};

// Run the seeding
seedSpareReturnData();
