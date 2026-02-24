/**
 * Check what return requests exist
 */

import { sequelize } from './db.js';
import { QueryTypes } from 'sequelize';

async function checkReturns() {
  try {
    console.log('Checking return requests in database...\n');

    // Check all spare_requests with possible return reasons
    const requests = await sequelize.query(`
      SELECT TOP 20 
        request_id, request_type, request_reason, status_id, requested_to_id, created_at
      FROM spare_requests
      WHERE request_reason LIKE '%return%' OR request_type LIKE '%return%'
      ORDER BY request_id DESC
    `, { type: QueryTypes.SELECT });

    console.log(`Found ${requests.length} requests with 'return' in reason/type:`);
    if (requests.length > 0) {
      console.log(JSON.stringify(requests.slice(0, 5), null, 2));
    }

    // Check what status_id = 'pending' is
    console.log('\n\nChecking status values...');
    const statuses = await sequelize.query(`
      SELECT status_id, status_name
      FROM status
      WHERE status_name LIKE '%pending%' OR status_name LIKE '%return%'
    `, { type: QueryTypes.SELECT });

    console.log('Status values:');
    console.log(JSON.stringify(statuses, null, 2));

    // Check all spare_requests where requested_to_id = 1
    console.log('\n\nAll spare_requests for plant_id = 1:');
    const all = await sequelize.query(`
      SELECT TOP 10
        sr.request_id, sr.request_type, sr.request_reason, s.status_name, sr.requested_to_id
      FROM spare_requests sr
      LEFT JOIN status s ON sr.status_id = s.status_id  
      WHERE sr.requested_to_id = 1
      ORDER BY sr.request_id DESC
    `, { type: QueryTypes.SELECT });

    console.log(JSON.stringify(all, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
}

checkReturns();
