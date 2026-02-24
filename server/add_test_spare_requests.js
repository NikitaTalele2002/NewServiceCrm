import { sequelize } from './db.js';

/**
 * Script to add test spare requests for AVAILABLE spares in ASC inventory
 * Creates requests for spares that are actually available with qty > 0
 */

async function addTestSpareRequests() {
  try {
    console.log('\n═════════════════════════════════════════════════════════════');
    console.log('📌 Adding Test Spare Requests with Available Spares');
    console.log('═════════════════════════════════════════════════════════════\n');

    // Step 1: Get available spares with good quantity
    console.log('Step 1: Finding available spares with good quantities...\n');
    const availableSpares = await sequelize.query(`
      SELECT TOP 10
        sp.Id as spare_id,
        sp.PART as part_code,
        sp.DESCRIPTION,
        SUM(CASE WHEN si.location_type = 'service_center' THEN si.qty_good ELSE 0 END) as asc_good_qty
      FROM spare_parts sp
      INNER JOIN spare_inventory si ON sp.Id = si.spare_id
      WHERE si.location_type = 'service_center' AND si.qty_good > 0
      GROUP BY sp.Id, sp.PART, sp.DESCRIPTION
      ORDER BY asc_good_qty DESC
    `, { type: sequelize.QueryTypes.SELECT });

    if (availableSpares.length === 0) {
      console.log('❌ No available spares found. Please add some spares to ASC inventory first.');
      await sequelize.close();
      return;
    }

    console.log(`✅ Found ${availableSpares.length} available spares:\n`);
    availableSpares.forEach((sp, idx) => {
      console.log(`  ${idx + 1}. Part: ${sp.part_code}`);
      console.log(`     Description: ${sp.DESCRIPTION}`);
      console.log(`     Available: ${sp.asc_good_qty} units\n`);
    });

    // Step 2: Get technicians to request for
    console.log('\nStep 2: Finding technicians...\n');
    const technicians = await sequelize.query(`
      SELECT TOP 5
        technician_id,
        name,
        service_center_id
      FROM technicians
      WHERE service_center_id IS NOT NULL
      ORDER BY NEWID()
    `, { type: sequelize.QueryTypes.SELECT });

    if (!technicians.length) {
      console.log('❌ No technician found. Please create a technician first.');
      await sequelize.close();
      return;
    }

    console.log(`✅ Found ${technicians.length} technicians\n`);
    technicians.forEach((t, idx) => {
      console.log(`  ${idx + 1}. ${t.name} (ID: ${t.technician_id})`);
    });

    // Step 3: Create test requests
    console.log('\nStep 3: Creating test spare requests...\n');
    const createdRequests = [];

    for (let i = 0; i < Math.min(5, availableSpares.length); i++) {
      const spare = availableSpares[i];
      const technician = technicians[i % technicians.length];
      const requestedQty = Math.floor(Math.random() * 3) + 1; // Random 1-3 quantity
      const requestReason = i % 2 === 0 ? null : 'replacement'; // Some normal, some replacement

      try {
        // Get pending status
        const statusResult = await sequelize.query(`
          SELECT status_id FROM [status] WHERE status_name = 'pending'
        `, { type: sequelize.QueryTypes.SELECT });

        if (!statusResult || statusResult.length === 0) {
          console.error(`  ❌ Error: Pending status not found`);
          continue;
        }

        const statusId = statusResult[0].status_id;

        // Create spare request
        const result = await sequelize.query(`
          INSERT INTO spare_requests (
            request_type,
            request_reason,
            requested_source_id,
            requested_source_type,
            requested_to_id,
            status_id,
            created_at,
            updated_at
          )
          OUTPUT INSERTED.request_id
          VALUES (?, ?, ?, 'technician', ?, ?, GETDATE(), GETDATE())
        `, { replacements: ['normal', requestReason, technician.technician_id, technician.service_center_id, statusId], type: sequelize.QueryTypes.SELECT });

        if (!result || result.length === 0) {
          console.error(`  ❌ Error: Could not create request`);
          continue;
        }

        const requestId = result[0].request_id;

        // Create request item
        await sequelize.query(`
          INSERT INTO spare_request_items (
            request_id,
            spare_id,
            requested_qty,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, GETDATE(), GETDATE())
        `, { replacements: [requestId, spare.spare_id, requestedQty] });

        createdRequests.push({
          requestId,
          technician: technician.name,
          spare: spare.part_code,
          description: spare.DESCRIPTION,
          requestedQty,
          availableQty: spare.asc_good_qty,
          reason: requestReason || 'normal'
        });

        console.log(`  ✅ Request #${requestId} created`);
        console.log(`     For: ${technician.name}`);
        console.log(`     Spare: ${spare.part_code} (${spare.DESCRIPTION})`);
        console.log(`     Requested: ${requestedQty} units (Available: ${spare.asc_good_qty})`);
        console.log(`     Type: ${requestReason || 'normal'}\n`);

      } catch (err) {
        console.error(`  ❌ Error creating request: ${err.message}`);
        console.error(`     Full error:`, err);
      }
    }

    // Step 4: Display summary
    console.log('\n═════════════════════════════════════════════════════════════');
    console.log('📊 Summary of Created Test Requests');
    console.log('═════════════════════════════════════════════════════════════\n');

    console.log(`Total Requests Created: ${createdRequests.length}\n`);

    console.log('Request Details:\n');
    createdRequests.forEach((req, idx) => {
      console.log(`${idx + 1}. Request #${req.requestId}`);
      console.log(`   Technician: ${req.technician}`);
      console.log(`   Spare Part: ${req.spare}`);
      console.log(`   Description: ${req.description}`);
      console.log(`   Requested: ${req.requestedQty} units`);
      console.log(`   Available in ASC: ${req.availableQty} units`);
      console.log(`   Request Type: ${req.reason}\n`);
    });

    console.log('═════════════════════════════════════════════════════════════');
    console.log('✅ Test Data Added Successfully!');
    console.log('═════════════════════════════════════════════════════════════\n');

    console.log('NEXT STEPS:');
    console.log('──────────');
    console.log(`1. Go to Rental Allocation page`);
    console.log(`2. You'll see ${createdRequests.length} pending requests`);
    console.log(`3. Approve them to allocate spares to technicians`);
    console.log(`4. Spares will be moved to technician inventory`);
    console.log(`5. From Return Request page, technician can return defective spares\n`);

    await sequelize.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    await sequelize.close();
  }
}

addTestSpareRequests();
