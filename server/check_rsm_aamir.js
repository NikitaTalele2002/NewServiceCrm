/**
 * Check RSM Aamir Setup
 */

import { sequelize } from './db.js';
import { QueryTypes } from 'sequelize';

async function checkAamirSetup() {
  try {
    console.log('Checking RSM Aamir setup...\n');

    // Find RSM Aamir user
    const aamirUser = await sequelize.query(`
      SELECT user_id, name FROM users 
      WHERE name LIKE '%Aamir%' OR name LIKE '%aamir%'
      ORDER BY user_id
    `, { type: QueryTypes.SELECT });

    console.log('✅ Found RSM Users:');
    aamirUser.forEach(u => {
      console.log(`  - ID: ${u.user_id}, Name: ${u.name}`);
    });

    if (aamirUser.length === 0) {
      console.log('❌ No RSM Aamir found!');
      process.exit(0);
    }

    // Check each potential RSM Aamir
    for (const user of aamirUser) {
      console.log(`\n📋 Checking User ID ${user.user_id} (${user.username}):`);

      // Check RSM mapping
      const rsmData = await sequelize.query(`
        SELECT rsm_id, rsm_name FROM rsms WHERE user_id = ?
      `, { replacements: [user.user_id], type: QueryTypes.SELECT });

      if (rsmData.length === 0) {
        console.log(`  ❌ No RSM mapping found`);
        continue;
      }

      const rsm = rsmData[0];
      console.log(`  ✅ RSM ID: ${rsm.rsm_id}, Name: ${rsm.rsm_name}`);

      // Check state mapping
      const stateMapping = await sequelize.query(`
        SELECT DISTINCT state_id FROM rsm_state_mapping 
        WHERE rsm_user_id = ? AND is_active = 1
      `, { replacements: [rsm.rsm_id], type: QueryTypes.SELECT });

      const stateIds = stateMapping.map(s => s.state_id);
      console.log(`  📍 Assigned States: ${stateIds.join(', ')}`);

      // Check plants for those states
      if (stateIds.length > 0) {
        const placeholders = stateIds.map(() => '?').join(',');
        const plants = await sequelize.query(`
          SELECT plant_id, plant_code FROM plants 
          WHERE state_id IN (${placeholders})
        `, { replacements: stateIds, type: QueryTypes.SELECT });

        console.log(`  🏭 Plants in those states:`);
        plants.forEach(p => {
          console.log(`     - Plant ID: ${p.plant_id}, Code: ${p.plant_code}`);
        });

        // Check return requests for each plant
        if (plants.length > 0) {
          const plantIds = plants.map(p => p.plant_id);
          const plantPlaceholders = plantIds.map(() => '?').join(',');
          
          const returnRequests = await sequelize.query(`
            SELECT 
              sr.request_id,
              sr.request_type,
              sr.requested_source_id as asc_id,
              sr.requested_to_id as plant_id,
              s.status_name,
              sc.asc_name
            FROM spare_requests sr
            LEFT JOIN status s ON sr.status_id = s.status_id
            LEFT JOIN service_centers sc ON sr.requested_source_id = sc.asc_id
            WHERE sr.requested_to_id IN (${plantPlaceholders})
              AND sr.request_type = 'consignment_return'
              AND UPPER(s.status_name) = 'PENDING'
            ORDER BY sr.created_at DESC
          `, { replacements: plantIds, type: QueryTypes.SELECT });

          if (returnRequests.length === 0) {
            console.log(`  ⚠️  No pending return requests found for these plants!`);
          } else {
            console.log(`  📦 Found ${returnRequests.length} pending return request(s):`);
            returnRequests.forEach(req => {
              console.log(`     - Request ID: ${req.request_id}, Type: ${req.request_type}, Status: ${req.status_name}, From: ${req.asc_name}, To Plant: ${req.plant_id}`);
            });
          }
        }
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message || error);
    if (error.original && error.original.errors) {
      console.error('  Database Errors:');
      error.original.errors.forEach((err, i) => {
        console.error(`    ${i + 1}. ${err.message}`);
      });
    }
  } finally {
    process.exit(0);
  }
}

checkAamirSetup();
