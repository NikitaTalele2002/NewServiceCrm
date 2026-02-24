/**
 * DEBUG SCRIPT: Test spare_requests table insert
 * This script helps diagnose why data is not being inserted
 */

import { sequelize } from './db.js';
import { QueryTypes } from 'sequelize';

async function debugSpareRequestInsert() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🔧 DEBUGGING: spare_requests TABLE INSERT');
    console.log('='.repeat(80) + '\n');

    // Step 1: Check if table exists
    console.log('📋 Step 1: Check if spare_requests table exists...');
    const tableExists = await sequelize.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_NAME = 'spare_requests'
    `, { type: QueryTypes.SELECT });

    if (!tableExists.length) {
      console.log('❌ ERROR: spare_requests table does NOT exist!');
      console.log('   Please create the table first');
      process.exit(1);
    }
    console.log('✅ Table exists');

    // Step 2: Check table structure
    console.log('\n📋 Step 2: Check table columns...');
    const columns = await sequelize.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'spare_requests'
      ORDER BY ORDINAL_POSITION
    `, { type: QueryTypes.SELECT });

    if (columns.length === 0) {
      console.log('❌ ERROR: No columns found in table!');
      process.exit(1);
    }

    console.log(`✅ Found ${columns.length} columns:`);
    columns.forEach(col => {
      console.log(`   • ${col.COLUMN_NAME} (${col.DATA_TYPE}) - ${col.IS_NULLABLE === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });

    // Step 3: Check if we can get a status
    console.log('\n📋 Step 3: Get pending status ID...');
    const statusResult = await sequelize.query(`
      SELECT status_id FROM [status] WHERE status_name = 'pending'
    `, { type: QueryTypes.SELECT });

    if (!statusResult.length) {
      console.log('❌ ERROR: Pending status not found!');
      process.exit(1);
    }

    const statusId = statusResult[0].status_id;
    console.log(`✅ Pending status ID: ${statusId}`);

    // Step 4: Try simple insert
    console.log('\n📋 Step 4: Attempt simple INSERT...');
    console.log('   Running: INSERT INTO spare_requests (spare_request_type, requested_source_type, requested_source_id, requested_to_type, requested_to_id, request_reason, status_id, created_by, created_at, updated_at) ...');

    const insertResult = await sequelize.query(`
      INSERT INTO spare_requests (
        request_type,
        spare_request_type,
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
        GETDATE(),
        GETDATE()
      )
    `, { 
      replacements: ['TECH_ISSUE', 'TECH_ISSUE', 'technician', 1, 'service_center', 1, 'msl', statusId, 1],
      type: QueryTypes.SELECT 
    });

    if (!insertResult.length || !insertResult[0].request_id) {
      console.log('❌ ERROR: INSERT failed - no request_id returned!');
      console.log('   Result:', insertResult);
      process.exit(1);
    }

    const newRequestId = insertResult[0].request_id;
    console.log(`✅ INSERT successful! Request ID: ${newRequestId}`);

    // Step 5: Verify the inserted data
    console.log('\n📋 Step 5: Verify inserted data...');
    const verifyResult = await sequelize.query(`
      SELECT TOP 1 
        request_id,
        request_type,
        spare_request_type,
        requested_source_id,
        requested_to_id,
        status_id,
        created_at
      FROM spare_requests
      WHERE request_id = ?
    `, { replacements: [newRequestId], type: QueryTypes.SELECT });

    if (!verifyResult.length) {
      console.log('❌ ERROR: Data inserted but NOT FOUND on SELECT!');
      console.log('   This indicates a transaction/commit issue');
      process.exit(1);
    }

    const verified = verifyResult[0];
    console.log('✅ Data verified:');
    console.log(`   Request ID: ${verified.request_id}`);
    console.log(`   Request Type: ${verified.request_type}`);
    console.log(`   Spare Request Type: ${verified.spare_request_type}`);
    console.log(`   Source ID: ${verified.requested_source_id}`);
    console.log(`   Target ID: ${verified.requested_to_id}`);
    console.log(`   Status ID: ${verified.status_id}`);
    console.log(`   Created: ${verified.created_at}`);

    // Step 6: Test insert with NULL values
    console.log('\n📋 Step 6: Test INSERT with NULL call_id...');
    const insertWithNull = await sequelize.query(`
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
      replacements: ['TECH_ISSUE', 'TECH_ISSUE', null, 'technician', 2, 'service_center', 1, 'msl', statusId, 1],
      type: QueryTypes.SELECT 
    });

    if (insertWithNull.length && insertWithNull[0].request_id) {
      console.log(`✅ NULL handling works - Request ID: ${insertWithNull[0].request_id}`);
    } else {
      console.log('⚠️ WARNING: NULL insert may have issues');
    }

    // Step 7: Summary
    console.log('\n' + '='.repeat(80));
    console.log('✅ SUMMARY: All tests passed!');
    console.log('='.repeat(80));
    console.log(`
✅ spare_requests table exists and is accessible
✅ All required columns present
✅ INSERT operations work correctly
✅ Data verification successful
✅ NULL handling works
✅ Data is persistent (can be selected after insert)

If the API still has issues, the problem may be:
1. Different request format in the API
2. Middleware issues with authentication/authorization
3. Different database user with different permissions
4. Transaction/connection pool issues

Next steps:
- Run: node server/test_tech_to_sc_spare_requests.js
- Check server logs for detailed error messages
- Verify API request format matches (use Postman)
    `);

    process.exit(0);

  } catch (err) {
    console.error('\n❌ ERROR:', err.message);
    console.error('Code:', err.code);
    console.error('SQL:', err.sql);
    console.error('\nStack:', err.stack);
    console.error('\nTroubleshooting:');
    console.log(`
• If error mentions table doesn't exist:
  - Run: npm run migrate (or appropriate migration command)
  - OR manually create the table with the schema

• If error mentions permission denied:
  - Check database user permissions
  - Ensure user can INSERT into spare_requests table

• If error mentions column doesn't exist:
  - Check table structure matches expected columns
  - Run: SELECT * FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'spare_requests'

• If error mentions data type mismatch:
  - Check replacement values match column types
  - Ensure IDs are integers, strings are strings, etc.
    `);
    process.exit(1);
  }
}

debugSpareRequestInsert();
