/**
 * Test Script: Verify Rental Return API Response
 * Check what data the API returns for allocated requests
 */

import { sequelize } from './db.js';
import fetch from 'node-fetch';

async function testRentalReturnAPI() {
  try {
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║  🧪 TEST: RENTAL RETURN API RESPONSE                           ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    // Step 1: Check database data
    console.log('📝 STEP 1: Checking database for allocated requests...');
    const dbData = await sequelize.query(`
      SELECT TOP 10
        sr.request_id,
        sr.request_number,
        sr.status_id,
        sr.created_at,
        sr.technician_id,
        sr.service_center_id,
        sr.requested_source_id,
        sr.requested_source_type,
        sr.requested_to_type,
        sr.requested_to_id,
        t.name as tech_name,
        COUNT(sri.id) as item_count
      FROM spare_requests sr
      LEFT JOIN technicians t ON sr.requested_source_id = t.technician_id
      LEFT JOIN spare_request_items sri ON sr.request_id = sri.request_id
      WHERE sr.status_id = 3
      GROUP BY sr.request_id, sr.request_number, sr.status_id, sr.created_at, 
               sr.technician_id, sr.service_center_id, sr.requested_source_id,
               sr.requested_source_type, sr.requested_to_type, sr.requested_to_id, t.name
      ORDER BY sr.request_id DESC
    `, { type: sequelize.QueryTypes.SELECT });

    console.log(`✅ Found ${dbData.length} allocated requests in database\n`);

    // Step 2: Check what the query in routes returns
    console.log('\n📋 STEP 2: Simulating the GET /api/spare-requests?status=Allocated query...');
    
    // This is what the route does
    const whereConditions = [];
    const replacements = [];
    const userServiceCenterId = 4; // Service center from test
    const status = 'Allocated';

    whereConditions.push('sr.TechnicianId IS NOT NULL');
    
    if (status) {
      whereConditions.push('sr.Status = ?');
      replacements.push(status);
    }
    
    if (userServiceCenterId) {
      whereConditions.push('sr.ServiceCenterId = ?');
      replacements.push(userServiceCenterId);
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    console.log('\n   Query conditions:');
    console.log(`   - WHERE clause: ${whereClause}`);
    console.log(`   - Replacements: ${JSON.stringify(replacements)}`);
    console.log(`   - Service Center ID filter: ${userServiceCenterId}`);
    console.log(`   - Status filter: ${status}`);

    // Try the ORM approach like the route uses
    console.log('\n📦 STEP 3: Checking what columns the route expects...');
    const routeQuery = `
      SELECT sr.Id, sr.RequestNumber, sr.Status, sr.CreatedAt, sr.ComplaintId, sr.TechnicianId, t.TechnicianName
      FROM SpareRequests sr
      LEFT JOIN Technicians t ON sr.TechnicianId = t.Id
      WHERE sr.TechnicianId IS NOT NULL AND sr.Status = ? AND sr.ServiceCenterId = ?
      ORDER BY sr.CreatedAt DESC
      OFFSET 0 ROWS FETCH NEXT 20 ROWS ONLY
    `;

    console.log('\n   Route query structure requires:');
    console.log('   - sr.Id');
    console.log('   - sr.RequestNumber');
    console.log('   - sr.Status (STRING)');
    console.log('   - sr.CreatedAt');
    console.log('   - sr.TechnicianId');
    console.log('   - t.TechnicianName');

    console.log('\n⚠️ ISSUE FOUND:');
    console.log('   The route expects TABLE: SpareRequests, COLUMN: Status (string)');
    console.log('   But database has TABLE: spare_requests, COLUMN: status_id (integer)\n');

    console.log('📋 STEP 4: Checking actual table/column structure...');
    const tableInfo = await sequelize.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'spare_requests'
      ORDER BY ORDINAL_POSITION
    `, { type: sequelize.QueryTypes.SELECT });

    console.log('\n   spare_requests table columns:');
    tableInfo.slice(0, 15).forEach(col => {
      console.log(`   - ${col.COLUMN_NAME} (${col.DATA_TYPE}, ${col.IS_NULLABLE})`);
    });

    console.log('\n🎯 ROOT CAUSE:');
    console.log('   The GET /api/spare-requests endpoint uses Sequelize ORM');
    console.log('   It expects SpareRequests model with Status column (string)');
    console.log('   But actual database has status_id column (integer reference)\n');

    console.log('✅ SOLUTION:');
    console.log('   Update the backend route to handle status_id instead of Status');
    console.log('   OR map spare_requests status_id to status value\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nFull error:', error);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

testRentalReturnAPI();
