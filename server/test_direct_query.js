/**
 * Test Direct Database Query for Pending Returns
 */

import { sequelize } from './db.js';
import { QueryTypes } from 'sequelize';

async function testQuery() {
  try {
    console.log('Testing direct database query...\n');

    const plantId = 1;

    const requests = await sequelize.query(`
      SELECT 
        sr.request_id,
        sr.request_type,
        sr.requested_source_id as serviceCenterId,
        sr.requested_to_id as plantId,
        sr.created_at,
        sr.status_id,
        s.status_name,
        sc.asc_name as serviceCenterName,
        (SELECT COUNT(*) FROM spare_request_items WHERE request_id = sr.request_id) as itemCount
      FROM spare_requests sr
      LEFT JOIN status s ON sr.status_id = s.status_id
      LEFT JOIN service_centers sc ON sr.requested_source_id = sc.asc_id
      WHERE sr.requested_to_id = ?
        AND sr.request_type = 'consignment_return'
        AND UPPER(s.status_name) = 'PENDING'
      ORDER BY sr.created_at DESC
    `, {
      replacements: [plantId],
      type: QueryTypes.SELECT
    });

    console.log(`✅ Found ${requests.length} pending returns for plant ${plantId}`);
    console.log(JSON.stringify(requests, null, 2));

  } catch (error) {
    console.error('❌ Error:', error.message || error);
    if (error.original && error.original.errors) {
      console.error('\nOriginal Errors:');
      error.original.errors.forEach((err, i) => {
        console.error(`  Error ${i + 1}:`, err.message || err);
      });
    }
    console.error('\nSQL:', error.sql);
  } finally {
    process.exit(0);
  }
}

testQuery();
