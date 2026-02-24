/**
 * Find Service Centers and Create Return Request
 */

import { sequelize } from './db.js';
import { QueryTypes } from 'sequelize';

async function createTestReturn() {
  try {
    console.log('Finding service centers...\n');

    // Get all service centers
    const centers = await sequelize.query(`
      SELECT TOP 5 asc_id, asc_name, plant_id FROM service_centers
      ORDER BY asc_id DESC
    `, { type: QueryTypes.SELECT });

    console.log('✅ Service Centers:');
    centers.forEach(c => {
      console.log(`  - ID: ${c.asc_id}, Name: ${c.asc_name}, Plant: ${c.plant_id}`);
    });

    // Get plant 1 (FIN_GUWAHATI)
    const plants = await sequelize.query(`
      SELECT plant_id, plant_code FROM plants WHERE plant_id = 1
    `, { type: QueryTypes.SELECT });

    if (plants.length === 0) {
      console.log('❌ Plant 1 not found!');
      process.exit(0);
    }

    const plant = plants[0];
    console.log(`\n🏭 Using Plant: ${plant.plant_id} (${plant.plant_code})\n`);

    // Create a new return request from service center 1,  to plant 1
    console.log('Creating new return request...\n');

    const createResult = await sequelize.query(`
      INSERT INTO spare_requests (request_type, requested_source_id, requested_to_id, status_id, created_at)
      VALUES ('consignment_return', 1, 1, 1, GETUTCDATE())
    `, {
      type: QueryTypes.INSERT
    });

    // Get the newly created request ID
    const newRequest = await sequelize.query(`
      SELECT TOP 1 request_id FROM spare_requests 
      WHERE request_type = 'consignment_return' AND requested_to_id = 1
      ORDER BY request_id DESC
    `, { type: QueryTypes.SELECT });

    if (newRequest.length === 0) {
      console.log('❌ Could not retrieve new request!');
      process.exit(0);
    }

    const requestId = newRequest[0].request_id;
    console.log(`✅ Created Return Request: SPR-${requestId}\n`);

    // Add some items to this request
    const spareParts = await sequelize.query(`
      SELECT TOP 2 Id, PART FROM spare_parts ORDER BY Id DESC
    `, { type: QueryTypes.SELECT });

    for (const sp of spareParts) {
      await sequelize.query(`
        INSERT INTO spare_request_items (request_id, spare_id, requested_qty, created_at)
        VALUES (?, ?, 4, GETUTCDATE())
      `, {
        replacements: [requestId, sp.Id],
        type: QueryTypes.INSERT
      });
      console.log(`  - Added spare ${sp.PART} (Qty: 4)`);
    }

    console.log(`\n✅ Return request SPR-${requestId} is ready for RSM Aamir to approve!`);
    console.log('   From Service Center: ABC Service Center (asc_id=1)');
    console.log('   To Plant: FIN_GUWAHATI (plant_id=1)');
    console.log('   Items: 2 parts with quantities 4 each\n');

  } catch (error) {
    console.error('❌ Error:', error.message || error);
    if (error.original && error.original.errors) {
      error.original.errors.forEach((err, i) => {
        console.error(`  DB Error ${i + 1}:`, err.message);
      });
    }
  } finally {
    process.exit(0);
  }
}

createTestReturn();
