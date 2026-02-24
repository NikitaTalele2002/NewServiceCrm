import { sequelize } from './db.js';

async function testNewRequest() {
  try {
    console.log('🔄 Creating new test request...\n');

    // Get spares
    const spares = await sequelize.query(`
      SELECT Id, PART FROM spare_parts 
      WHERE PART IN ('000000FCSMNBRNE045', '000000FCSMNBRNE148')
    `, { type: sequelize.QueryTypes.SELECT });

    if (spares.length !== 2) {
      console.log(`❌ Could not find both spares`);
      await sequelize.close();
      return;
    }

    // Get technician
    const techs = await sequelize.query(`
      SELECT TOP 1 technician_id, service_center_id 
      FROM technicians
      WHERE service_center_id = 4
    `, { type: sequelize.QueryTypes.SELECT });

    if (!techs.length) {
      console.log('❌ No technician found');
      await sequelize.close();
      return;
    }

    const tech = techs[0];
    console.log(`✅ Using Technician ID: ${tech.technician_id}, Service Center: ${tech.service_center_id}`);

    // Get pending status
    const status = await sequelize.query(`
      SELECT status_id FROM [status] WHERE status_name = 'pending'
    `, { type: sequelize.QueryTypes.SELECT });

    const statusId = status[0].status_id;

    // Create request
    const reqResult = await sequelize.query(`
      INSERT INTO spare_requests (
        request_type,
        requested_source_id,
        requested_source_type,
        requested_to_id,
        requested_to_type,
        status_id,
        created_at,
        updated_at
      )
      OUTPUT inserted.request_id
      VALUES (
        'normal',
        ?,
        'technician',
        ?,
        'service_center',
        ?,
        GETDATE(),
        GETDATE()
      )
    `, { replacements: [tech.technician_id, tech.service_center_id, statusId], type: sequelize.QueryTypes.SELECT });

    const requestId = reqResult[0].request_id;
    console.log(`✅ Request created: REQ-${requestId}`);

    // Add items
    for (const spare of spares) {
      await sequelize.query(`
        INSERT INTO spare_request_items (
          request_id,
          spare_id,
          requested_qty,
          created_at,
          updated_at
        )
        VALUES (?, ?, 2, GETDATE(), GETDATE())
      `, { replacements: [requestId, spare.Id] });
    }

    console.log(`✅ Added 2 items to request\n`);
    console.log(`Created REQ-${requestId} ready for approval`);
    console.log(`Technician ID: ${tech.technician_id}`);
    console.log(`Service Center ID: ${tech.service_center_id}`);

    await sequelize.close();
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error('Stack:', err.stack);
    process.exit(1);
  }
}

testNewRequest();
