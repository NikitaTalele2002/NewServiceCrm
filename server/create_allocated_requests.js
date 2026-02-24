/**
 * Create Allocated Spare Requests for Rental Return Testing
 * Uses raw SQL queries to create test data with "Allocated" status
 */

import { sequelize } from './db.js';

async function createAllocatedData() {
  try {
    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║  🧪 CREATE ALLOCATED SPARE REQUESTS FOR RENTAL RETURN         ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    // Step 1: Get service center ID and technicians
    console.log('📝 STEP 1: Fetching service centers and technicians...');
    const serviceCenters = await sequelize.query(`
      SELECT TOP 1 asc_id, asc_name FROM service_centers WHERE asc_id IS NOT NULL
    `, { type: sequelize.QueryTypes.SELECT });

    if (!serviceCenters || serviceCenters.length === 0) {
      throw new Error('No service centers found');
    }

    const scId = serviceCenters[0].asc_id;
    const scName = serviceCenters[0].asc_name || 'Service Center';
    console.log(`✅ Found service center: ${scName} (ID: ${scId})`);

    const technicians = await sequelize.query(`
      SELECT TOP 3 technician_id, name, service_center_id
      FROM technicians
      WHERE service_center_id = ?
      ORDER BY NEWID()
    `, { 
      replacements: [scId],
      type: sequelize.QueryTypes.SELECT 
    });

    if (!technicians || technicians.length === 0) {
      throw new Error(`No technicians found for service center ${scId}`);
    }

    console.log(`✅ Found ${technicians.length} technicians`);
    technicians.forEach(t => {
      console.log(`   - ${t.name} (ID: ${t.technician_id})`);
    });

    // Step 2: Get spare parts
    console.log('\n📦 STEP 2: Fetching spare parts...');
    const spareParts = await sequelize.query(`
      SELECT TOP 10 Id, PART as sku, DESCRIPTION as name
      FROM spare_parts
      WHERE DESCRIPTION IS NOT NULL
      ORDER BY NEWID()
    `, { type: sequelize.QueryTypes.SELECT });

    if (!spareParts || spareParts.length === 0) {
      throw new Error('No spare parts found');
    }

    console.log(`✅ Found ${spareParts.length} spare parts`);

    // Step 3: Get Allocated status ID
    console.log('\n📋 STEP 3: Fetching status values...');
    const allocatedStatus = await sequelize.query(`
      SELECT status_id FROM status WHERE status_name = 'Allocated' OR status_name = 'allocated'
    `, { type: sequelize.QueryTypes.SELECT });

    let allocatedStatusId = null;
    if (allocatedStatus && allocatedStatus.length > 0) {
      allocatedStatusId = allocatedStatus[0].status_id;
      console.log(`✅ Found 'Allocated' status (ID: ${allocatedStatusId})`);
    } else {
      console.log('⚠️ "Allocated" status not found, trying first available status...');
      const anyStatus = await sequelize.query(`
        SELECT TOP 1 status_id FROM status
      `, { type: sequelize.QueryTypes.SELECT });
      if (anyStatus && anyStatus.length > 0) {
        allocatedStatusId = anyStatus[0].status_id;
        console.log(`✅ Using status ID: ${allocatedStatusId}`);
      } else {
        throw new Error('No status found in database');
      }
    }

    // Step 4: Create allocated spare requests
    console.log('\n🎲 STEP 4: Creating allocated spare requests...\n');

    let createdCount = 0;

    for (let i = 0; i < 3; i++) {
      const technician = technicians[i % technicians.length];
      const randomSpares = spareParts.sort(() => Math.random() - 0.5).slice(0, 2 + Math.floor(Math.random() * 2));

      // Create request with Allocated status
      const insertResult = await sequelize.query(`
        INSERT INTO spare_requests 
        (request_type, request_reason, requested_source_type, requested_source_id, 
         requested_to_type, requested_to_id, status_id, created_at, created_by)
        VALUES ('normal', 'bulk', 'technician', ?, 'service_center', ?, ?, GETDATE(), NULL)
        
        SELECT SCOPE_IDENTITY() as request_id
      `, { 
        replacements: [
          technician.technician_id,
          scId,
          allocatedStatusId
        ],
        type: sequelize.QueryTypes.SELECT
      });

      if (!insertResult || !insertResult[0]) {
        throw new Error('Failed to create request');
      }

      const requestId = insertResult[0].request_id;
      console.log(`   📌 Allocated Request #${requestId}`);
      console.log(`      Technician: ${technician.name}`);
      console.log(`      Status: Allocated (ID: ${allocatedStatusId})`);

      // Add items to request
      for (const spare of randomSpares) {
        const qty = 2 + Math.floor(Math.random() * 3);
        await sequelize.query(`
          INSERT INTO spare_request_items
          (request_id, spare_id, requested_qty, approved_qty, created_at)
          VALUES (?, ?, ?, ?, GETDATE())
        `, {
          replacements: [
            requestId,
            spare.Id,
            qty,
            qty
          ],
          type: sequelize.QueryTypes.INSERT
        });

        console.log(`      ├─ ${spare.name} (Qty: ${qty})`);
      }

      createdCount++;
    }

    console.log('\n✅ Allocated requests created successfully!\n');

    // Step 5: Verify
    console.log('📋 STEP 5: Verifying allocated requests...\n');
    const verify = await sequelize.query(`
      SELECT 
        sr.request_id as Id, 
        sr.request_type,
        sr.status_id,
        sr.created_at,
        t.name as TechnicianName,
        COUNT(sri.id) as ItemCount
      FROM spare_requests sr
      LEFT JOIN technicians t ON sr.requested_source_id = t.technician_id
      LEFT JOIN spare_request_items sri ON sr.request_id = sri.request_id
      WHERE sr.status_id = ?
      GROUP BY sr.request_id, sr.request_type, sr.status_id, sr.created_at, t.name
      ORDER BY sr.request_id DESC
    `, { 
      replacements: [allocatedStatusId],
      type: sequelize.QueryTypes.SELECT 
    });

    console.log(`✅ Found ${verify.length} allocated requests:\n`);
    verify.slice(0, 5).forEach(req => {
      console.log(`   Request #${req.Id}: ${req.RequestNumber}`);
      console.log(`   Technician: ${req.TechnicianName || 'Unknown'}`);
      console.log(`   Items: ${req.ItemCount}`);
      console.log(`   Status: ${req.Status}\n`);
    });

    console.log('\n🎉 Test data ready!\n');
    console.log('📌 To view on rental return page:');
    console.log('   1. Hard refresh browser (Ctrl+Shift+R)');
    console.log('   2. Navigate to: Service Center → Inventory → Rental Return\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

createAllocatedData();
