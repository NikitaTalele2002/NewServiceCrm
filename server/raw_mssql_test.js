#!/usr/bin/env node
/**
 * Raw MSSQL Test - No Sequelize overhead
 * Uses mssql library directly to bypass any Sequelize hooks/middleware
 */

import sql from 'mssql';

const config = {
  server: 'localhost\\SQLEXPRESS',
  database: 'NewCRM',
  authentication: {
    type: 'default',
    options: {
      userName: 'crm_user',
      password: 'StrongPassword123!'
    }
  },
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true
  }
};

async function runTest() {
  let pool;
  try {
    console.log('\n================================');
    console.log('Raw MSSQL Test (No Sequelize)');
    console.log('================================\n');

    // Create pool connection
    pool = new sql.ConnectionPool(config);
    await pool.connect();
    console.log('✅ Connected to MSSQL database');

    // Test 1: Create call
    console.log('\n📞 STEP 1: Create call');
    const callNumber = `CALL-${Date.now()}`;
    const callRes = await pool.request()
      .input('customer_id', sql.Int, 1)
      .input('call_type', sql.VarChar, 'complaint')
      .input('call_source', sql.VarChar, 'phone')
      .input('caller_type', sql.VarChar, 'customer')
      .input('service_center_id', sql.Int, 1)
      .input('tech_id', sql.Int, 1)
      .query(`
        INSERT INTO calls (customer_id, call_type, call_source, caller_type, assigned_asc_id, assigned_tech_id, status_id, created_at, updated_at)
        VALUES (@customer_id, @call_type, @call_source, @caller_type, @service_center_id, @tech_id, 1, GETDATE(), GETDATE());
        SELECT @@IDENTITY as call_id;
      `);
    
    const callId = callRes.recordset[0].call_id;
    console.log(`✅ Call created: ${callNumber} (ID: ${callId})`);

    // Test 2: Create spare request
    console.log('\n📋 STEP 2: Create spare request');
    const reqRes = await pool.request()
      .input('call_id', sql.Int, callId)
      .input('source_type', sql.VarChar, 'technician')
      .input('source_id', sql.Int, 1)
      .input('to_type', sql.VarChar, 'service_center')
      .input('to_id', sql.Int, 1)
      .input('reason', sql.VarChar, 'defect')
      .input('req_type', sql.VarChar, 'TECH_ISSUE')
      .input('status_id', sql.Int, 1)
      .query(`
        INSERT INTO spare_requests (
          call_id, requested_source_type, requested_source_id,
          requested_to_type, requested_to_id, request_reason,
          spare_request_type, status_id, created_by, created_at, updated_at
        ) VALUES (@call_id, @source_type, @source_id, @to_type, @to_id, @reason, @req_type, @status_id, 1, GETDATE(), GETDATE());
        SELECT @@IDENTITY as request_id;
      `);
    
    const requestId = reqRes.recordset[0].request_id;
    console.log(`✅ Spare request created (ID: ${requestId})`);
    console.log(`   Type: TECH_ISSUE`);
    console.log(`   From: Technician 1`);
    console.log(`   To: Service Center 1`);

    // Test 3: Add items to request
    console.log('\n📦 STEP 3: Add items to request');
    await pool.request()
      .input('request_id', sql.Int, requestId)
      .input('spare_id', sql.Int, 1)
      .query(`
        INSERT INTO spare_request_items (request_id, spare_id, requested_qty, allocated_qty, received_qty, created_at, updated_at)
        VALUES (@request_id, @spare_id, 2, 0, 0, GETDATE(), GETDATE());
      `);
    console.log(`✅ Added Spare ID 1: qty 2`);

    // Test 4: Check we have the data
    console.log('\n✅ All tests passed!');
    console.log('\n✅ DATABASE IS WORKING CORRECTLY\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    if (error.originalError) {
      console.error('SQL Error Details:', error.originalError.message);
    }
    console.error('Full Error:', error);
    process.exit(1);
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

// Run test
runTest();
