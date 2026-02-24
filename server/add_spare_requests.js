/**
 * Insert Sample Data into spare_requests Table
 * Run: node add_spare_requests.js
 * 
 * This script:
 * 1. Checks existing data in dependent tables
 * 2. Inserts sample spare requests
 * 3. Verifies ID starting point (0 vs 1)
 */

import { sequelize } from './db.js';
import { QueryTypes } from 'sequelize';

async function addSpareRequests() {
  try {
    console.log('\n' + '═'.repeat(80));
    console.log('  ADD SAMPLE DATA TO SPARE_REQUESTS TABLE');
    console.log('═'.repeat(80) + '\n');

    await sequelize.authenticate();
    console.log('✅ Connected to NewCRM database\n');

    // Step 1: Check status data
    console.log('📌 Checking Status table...');
    const statuses = await sequelize.query(
      'SELECT TOP 5 * FROM status',
      { type: QueryTypes.SELECT }
    );

    if (statuses.length === 0) {
      console.log('  ⚠️  No status records found. Inserting sample status...\n');
      
      const statusInserts = [
        'Pending',
        'Approved',
        'Rejected',
      ];

      for (const statusName of statusInserts) {
        await sequelize.query(
          `INSERT INTO status (status_name, created_at, updated_at) 
           VALUES (:name, GETDATE(), GETDATE())`,
          {
            replacements: { name: statusName },
            type: QueryTypes.INSERT
          }
        );
      }
      console.log('  ✅ Inserted 3 sample statuses\n');
    } else {
      console.log(`  ✅ Found ${statuses.length} status records`);
      statuses.slice(0, 3).forEach(s => {
        console.log(`     - ID: ${s.status_id}, Name: ${s.status_name}`);
      });
      console.log('');
    }

    // Step 2: Check users data
    console.log('📌 Checking Users table...');
    const users = await sequelize.query(
      'SELECT TOP 5 * FROM users',
      { type: QueryTypes.SELECT }
    );

    let createdByUserId;
    if (users.length === 0) {
      console.log('  ⚠️  No users found. Inserting sample user...\n');
      
      await sequelize.query(
        `INSERT INTO users (user_name, email, phone_number, role_id, status) 
         VALUES (:name, :email, :phone, :role, :status)`,
        {
          replacements: { 
            name: 'Test User', 
            email: 'test@example.com', 
            phone: '9999999999',
            role: 1,
            status: 1
          },
          type: QueryTypes.INSERT
        }
      );
      
      // Get the newly inserted user
      const newUser = await sequelize.query(
        'SELECT TOP 1 * FROM users ORDER BY user_id DESC',
        { type: QueryTypes.SELECT }
      );
      createdByUserId = newUser[0]?.user_id;
      console.log(`  ✅ Inserted test user with ID: ${createdByUserId}\n`);
    } else {
      console.log(`  ✅ Found ${users.length} user records`);
      users.slice(0, 3).forEach(u => {
        console.log(`     - ID: ${u.user_id}, Name: ${u.user_name}, Email: ${u.email}`);
      });
      createdByUserId = users[0]?.user_id;
      console.log('');
    }

    // Step 3: Check service centers
    console.log('📌 Checking Service Centers...');
    const serviceCenters = await sequelize.query(
      'SELECT TOP 5 * FROM service_centers',
      { type: QueryTypes.SELECT }
    );

    let sourceSCId, toSCId;
    if (serviceCenters.length >= 2) {
      console.log(`  ✅ Found ${serviceCenters.length} service centers`);
      serviceCenters.slice(0, 2).forEach(sc => {
        console.log(`     - ID: ${sc.service_center_id}, Code: ${sc.service_center_code}, Name: ${sc.service_center_name}`);
      });
      sourceSCId = serviceCenters[0]?.service_center_id;
      toSCId = serviceCenters[1]?.service_center_id || sourceSCId;
      console.log('');
    } else if (serviceCenters.length === 1) {
      console.log('  ⚠️  Only 1 service center found. Inserting another...\n');
      sourceSCId = serviceCenters[0]?.service_center_id;
      
      await sequelize.query(
        `INSERT INTO service_centers (service_center_code, service_center_name, region, status) 
         VALUES (:code, :name, :region, :status)`,
        {
          replacements: { 
            code: 'TEST02', 
            name: 'Test Service Center 2', 
            region: 'Test Region',
            status: 1
          },
          type: QueryTypes.INSERT
        }
      );
      
      const newSC = await sequelize.query(
        'SELECT TOP 1 * FROM service_centers ORDER BY service_center_id DESC',
        { type: QueryTypes.SELECT }
      );
      toSCId = newSC[0]?.service_center_id;
      console.log(`  ✅ Inserted new service center with ID: ${toSCId}\n`);
    } else {
      console.log('  ⚠️  No service centers found. Inserting 2 sample service centers...\n');
      
      for (let i = 1; i <= 2; i++) {
        await sequelize.query(
          `INSERT INTO service_centers (service_center_code, service_center_name, region, status) 
           VALUES (:code, :name, :region, :status)`,
          {
            replacements: { 
              code: `TEST0${i}`, 
              name: `Test Service Center ${i}`, 
              region: 'Test Region',
              status: 1
            },
            type: QueryTypes.INSERT
          }
        );
      }
      
      const newSCs = await sequelize.query(
        'SELECT TOP 2 * FROM service_centers ORDER BY service_center_id DESC',
        { type: QueryTypes.SELECT }
      );
      sourceSCId = newSCs[1]?.service_center_id || newSCs[0]?.service_center_id;
      toSCId = newSCs[0]?.service_center_id;
      console.log(`  ✅ Inserted 2 service centers\n`);
    }

    // Step 4: Get status ID
    const statusRecords = await sequelize.query(
      'SELECT TOP 1 status_id FROM status WHERE status_name = :name',
      { 
        replacements: { name: 'Pending' },
        type: QueryTypes.SELECT 
      }
    );
    const statusId = statusRecords[0]?.status_id || 1;

    // Set defaults if not found
    sourceSCId = sourceSCId || 1;
    toSCId = toSCId || 1;
    createdByUserId = createdByUserId || 1;

    // Step 5: Insert spare requests
    console.log('📌 Inserting Sample Spare Requests...\n');

    const requestInserts = [
      {
        request_type: 'consignment_fillup',
        requested_source_type: 'service_center',
        requested_source_id: sourceSCId,
        requested_to_type: 'warehouse',
        requested_to_id: 1,
        request_reason: 'msl',
        status_id: statusId,
        created_by: createdByUserId,
      },
      {
        request_type: 'consignment_fillup',
        requested_source_type: 'branch',
        requested_source_id: 1,
        requested_to_type: 'service_center',
        requested_to_id: toSCId,
        request_reason: 'bulk',
        status_id: statusId,
        created_by: createdByUserId,
      },
      {
        request_type: 'consignment_return',
        requested_source_type: 'service_center',
        requested_source_id: sourceSCId,
        requested_to_type: 'warehouse',
        requested_to_id: 1,
        request_reason: 'defect',
        status_id: statusId,
        created_by: createdByUserId,
      },
    ];

    const insertedRequests = [];
    for (const req of requestInserts) {
      await sequelize.query(
        `INSERT INTO spare_requests 
         (request_type, requested_source_type, requested_source_id, requested_to_type, 
          requested_to_id, request_reason, status_id, created_by, created_at, updated_at) 
         VALUES 
         (:reqType, :srcType, :srcId, :toType, :toId, :reqReason, :statusId, :createdBy, GETDATE(), GETDATE())`,
        {
          replacements: {
            reqType: req.request_type,
            srcType: req.requested_source_type,
            srcId: req.requested_source_id,
            toType: req.requested_to_type,
            toId: req.requested_to_id,
            reqReason: req.request_reason,
            statusId: req.status_id,
            createdBy: req.created_by,
          },
          type: QueryTypes.INSERT
        }
      );
    }

    console.log(`  ✅ Inserted ${requestInserts.length} sample spare requests\n`);

    // Step 6: Check inserted data
    console.log('📌 Fetching Inserted Spare Requests...\n');

    const insertedData = await sequelize.query(
      'SELECT TOP 10 * FROM spare_requests ORDER BY request_id DESC',
      { type: QueryTypes.SELECT }
    );

    console.log('Inserted Spare Requests:');
    insertedData.forEach(req => {
      console.log(`  ID: ${req.request_id} (START: ${req.request_id === 0 ? '⚠️  ZERO' : '✅ VALID'}) | Type: ${req.request_type} | From: ${req.requested_source_type}/${req.requested_source_id} | To: ${req.requested_to_type}/${req.requested_to_id}`);
    });
    console.log('');

    // Step 7: Check for ID = 0
    console.log('📌 Checking for ID = 0...\n');

    const zeroCheck = await sequelize.query(
      'SELECT COUNT(*) as count FROM spare_requests WHERE request_id = 0',
      { type: QueryTypes.SELECT }
    );

    const zeroCount = zeroCheck[0]?.count || 0;

    console.log('═'.repeat(80));
    if (zeroCount > 0) {
      console.log(`  ⚠️  WARNING: Found ${zeroCount} spare requests with ID = 0`);
      console.log('  This indicates identity seed configuration issue');
    } else {
      console.log('  ✅ ALL CHECKS PASSED');
      console.log(`  ✅ Inserted ${insertedData.length} spare requests`);
      console.log('  ✅ All IDs are correctly numbered (no ID = 0)');
      console.log('  ✅ Identity seeds working properly');
    }
    console.log('═'.repeat(80) + '\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error:');
    console.error('Message:', error.message);
    if (error.sql) {
      console.error('SQL:', error.sql);
    }
    process.exit(1);
  }
}

addSpareRequests();
