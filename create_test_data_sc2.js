import { sequelize } from './db.js';
import { QueryTypes } from 'sequelize';

async function createTestDataForSC2() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🧪 CREATING TEST DATA FOR SERVICE CENTER 2');
    console.log('='.repeat(80) + '\n');

    // Step 1: Find technician for SC 2
    console.log('📌 Step 1: Finding technician assigned to Service Center 2...');
    const techList = await sequelize.query(`
      SELECT TOP 5 
        t.technician_id,
        t.name,
        t.service_center_id,
        sc.asc_name,
        t.user_id
      FROM technicians t
      LEFT JOIN service_centers sc ON t.service_center_id = sc.asc_id
      WHERE t.service_center_id = 2 OR sc.asc_id = 2
      ORDER BY t.technician_id
    `, { type: QueryTypes.SELECT });

    if (!techList.length) {
      console.log('⚠️  No technicians found for SC 2, checking all service centers...');
      const allTechs = await sequelize.query(`
        SELECT TOP 5 
          t.technician_id,
          t.name,
          t.service_center_id,
          sc.asc_name
        FROM technicians t
        LEFT JOIN service_centers sc ON t.service_center_id = sc.asc_id
        ORDER BY t.technician_id
      `, { type: QueryTypes.SELECT });
      console.log('Available technicians:');
      allTechs.forEach(t => {
        console.log(`  - ${t.name} (ID: ${t.technician_id}) - SC: ${t.service_center_id}`);
      });
      process.exit(1);
    }

    const technician = techList[0];
    console.log(`✅ Found technician: ${technician.name} (ID: ${technician.technician_id})`);
    console.log(`   Service Center: ${technician.asc_name} (ID: ${technician.service_center_id})\n`);

    // Step 2: Get pending status
    console.log('📌 Step 2: Getting pending status...');
    const statusResult = await sequelize.query(`
      SELECT status_id FROM [status] WHERE status_name = 'pending'
    `, { type: QueryTypes.SELECT });

    if (!statusResult.length) {
      console.log('❌ Pending status not found!');
      process.exit(1);
    }
    const statusId = statusResult[0].status_id;
    console.log(`✅ Pending status ID: ${statusId}\n`);

    // Step 3: Get some spare parts
    console.log('📌 Step 3: Getting spare parts...');
    const spares = await sequelize.query(`
      SELECT TOP 3 Id, PART, DESCRIPTION FROM spare_parts WHERE Id > 0
    `, { type: QueryTypes.SELECT });

    if (!spares.length) {
      console.log('❌ No spare parts found!');
      process.exit(1);
    }
    console.log(`✅ Found ${spares.length} spare parts\n`);

    // Step 4: Create spare request
    console.log('📌 Step 4: Creating spare request...');
    const requestResult = await sequelize.query(`
      INSERT INTO spare_requests (
        request_type,
        spare_request_type,
        call_id,
        requested_source_type,
        requested_source_id,
        requested_to_type,
        requested_to_id,
        request_reason,
        status_id,
        created_by,
        created_at,
        updated_at
      )
      OUTPUT inserted.request_id
      VALUES (
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        GETDATE(),
        GETDATE()
      )
    `, {
      replacements: [
        'TECH_ISSUE',
        'TECH_ISSUE',
        null,
        'technician',
        technician.technician_id,
        'service_center',
        technician.service_center_id,
        'Customer reported issue - spare parts needed',
        statusId,
        technician.user_id || 1
      ],
      type: QueryTypes.SELECT
    });

    if (!requestResult.length) {
      console.log('❌ Failed to create request!');
      process.exit(1);
    }

    const requestId = requestResult[0].request_id;
    console.log(`✅ Spare request created: REQ-${requestId}\n`);

    // Step 5: Create request items
    console.log('📌 Step 5: Creating request items...');
    for (let i = 0; i < spares.length; i++) {
      const spare = spares[i];
      const itemResult = await sequelize.query(`
        INSERT INTO spare_request_items (
          request_id,
          spare_id,
          requested_qty,
          created_at,
          updated_at
        )
        OUTPUT inserted.id
        VALUES (?, ?, ?, GETDATE(), GETDATE())
      `, {
        replacements: [requestId, spare.Id, 2 + i],
        type: QueryTypes.SELECT
      });

      if (itemResult.length) {
        console.log(`   ✅ Item ${i + 1}: ${spare.PART} (Qty: ${2 + i})`);
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ TEST DATA CREATED SUCCESSFULLY');
    console.log('='.repeat(80));
    console.log(`
📋 Request Summary:
   - Request ID: REQ-${requestId}
   - Technician: ${technician.name}
   - Service Center: ${technician.asc_name} (ID: ${technician.service_center_id})
   - Status: Pending (ID: ${statusId})
   - Items: ${spares.length}

👉 Next: Reload the rental allocation page in the browser
   You should now see this request in the list!
`);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

createTestDataForSC2();
