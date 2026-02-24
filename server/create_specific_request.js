import { sequelize } from './db.js';

/**
 * Script to:
 * 1. Create a new spare request with specific spare parts
 * 2. Fix requested_to_type column for all requests
 */

async function createRequestWithSpareParts() {
  try {
    console.log('🔄 Creating new spare request with specific spare parts...\n');

    // Get the spare part IDs by their codes
    const spareCodes = ['000000FCSMNBRNE045', '000000FCSMNBRNE148'];
    
    const spares = await sequelize.query(`
      SELECT Id, PART, DESCRIPTION FROM spare_parts 
      WHERE PART IN ('000000FCSMNBRNE045', '000000FCSMNBRNE148')
    `, { type: sequelize.QueryTypes.SELECT });

    console.log('📦 Found spare parts:');
    spares.forEach(s => console.log(`   - ID: ${s.Id}, PART: ${s.PART}, DESC: ${s.DESCRIPTION}`));

    if (spares.length !== 2) {
      console.log(`❌ Expected 2 spare parts, found ${spares.length}`);
      return;
    }

    // Get a technician
    const technicians = await sequelize.query(`
      SELECT TOP 1 technician_id, service_center_id FROM technicians
    `, { type: sequelize.QueryTypes.SELECT });

    if (!technicians.length) {
      console.log('❌ No technicians found');
      return;
    }

    const technician = technicians[0];
    console.log(`\n👤 Using technician: ID ${technician.technician_id}, SC ID: ${technician.service_center_id}`);

    // Get pending status ID
    const pendingStatus = await sequelize.query(`
      SELECT status_id FROM [status] WHERE status_name = 'pending'
    `, { type: sequelize.QueryTypes.SELECT });

    if (!pendingStatus.length) {
      console.log('❌ Pending status not found');
      return;
    }

    const pendingStatusId = pendingStatus[0].status_id;

    // Create spare_request with requested_to_type = 'service_center'
    console.log('\n📝 Creating spare request...');
    const requestResult = await sequelize.query(`
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
    `, { 
      replacements: [technician.technician_id, technician.service_center_id, pendingStatusId],
      type: sequelize.QueryTypes.SELECT 
    });

    const requestId = requestResult[0]?.request_id;
    console.log(`✅ Request created: REQ-${requestId}`);

    // Add items
    for (const spare of spares) {
      const quantity = 2; // Default quantity
      await sequelize.query(`
        INSERT INTO spare_request_items (
          request_id,
          spare_id,
          requested_qty,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, GETDATE(), GETDATE())
      `, { replacements: [requestId, spare.Id, quantity] });

      console.log(`✅ Item added: ${spare.PART} (ID: ${spare.Id}) - Qty: ${quantity}`);
    }

    // Now fix all existing requests' requested_to_type
    console.log('\n🔧 Fixing requested_to_type for all existing requests...');
    const updateResult = await sequelize.query(`
      UPDATE spare_requests 
      SET requested_to_type = 'service_center'
      WHERE requested_to_type IS NULL
    `);

    console.log(`✅ Updated ${updateResult[0]} requests`);

    // Verify the update
    const allRequests = await sequelize.query(`
      SELECT request_id, requested_to_id, requested_to_type FROM spare_requests 
      WHERE request_id IN (39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60,? )
    `, { type: sequelize.QueryTypes.SELECT });

    console.log('\n📋 Updated requests:');
    allRequests.forEach(r => {
      console.log(`   REQ-${r.request_id}: To SC ${r.requested_to_id}, Type: ${r.requested_to_type}`);
    });

    console.log('\n✅ All done! Request is ready for allocation.');

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

createRequestWithSpareParts();
