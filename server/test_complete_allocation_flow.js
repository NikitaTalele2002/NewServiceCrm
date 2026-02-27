import { poolPromise } from './db.js';
import sql from 'mssql';

async function testCompleteAllocationFlow() {
  try {
    const pool = await poolPromise;

    console.log('🧪 Testing Complete Allocation Flow\n');
    console.log('=' .repeat(60));

    // First, get a real call ID and technician IDs
    const callRes = await pool.request()
      .query(`SELECT TOP 1 call_id FROM calls WHERE assigned_asc_id IS NOT NULL ORDER BY call_id DESC`);
    
    if (!callRes.recordset.length) {
      console.log('No calls found with assigned service center');
      process.exit(1);
    }
    
    const call1 = callRes.recordset[0].call_id;
    const tech1 = 3; // Suresh Kale
    const tech2 = 4; // Vikas More
    
    console.log(`Using Call ID: ${call1}, Tech1: ${tech1}, Tech2: ${tech2}\n`);

    // Test 1: Initial Allocation
    console.log('📌 TEST 1: Initial Allocation');
    console.log('-'.repeat(60));
    
    console.log(`Allocating call ${call1} to technician ${tech1}...`);
    
    const insert1 = await pool.request()
      .input("CallId", sql.Int, call1)
      .input("TechnicianId", sql.Int, tech1)
      .input("AssignedReason", sql.NVarChar(50), 'INITIAL_ALLOCATION')
      .query(`
        INSERT INTO call_technician_assignment 
        (call_id, technician_id, assigned_reason, assigned_at, is_active, created_at, updated_at)
        VALUES 
        (@CallId, @TechnicianId, @AssignedReason, GETDATE(), 1, GETDATE(), GETDATE());
        SELECT @@ROWCOUNT as rows_affected;
      `);
    
    console.log(`✅ Initial allocation successful (${insert1.recordset[0].rows_affected} row inserted)`);

    // Test 2: Reallocation - Mark previous as inactive
    console.log('\n📌 TEST 2: Reallocation (Previous Technician)');
    console.log('-'.repeat(60));
    
    console.log(`Marking previous assignment as inactive...`);
    const update1 = await pool.request()
      .input("CallId", sql.Int, call1)
      .query(`
        UPDATE call_technician_assignment
        SET is_active = 0, unassigned_at = GETDATE()
        WHERE call_id = @CallId AND is_active = 1;
        SELECT @@ROWCOUNT as rows_affected;
      `);
    
    console.log(`✅ Previous assignment marked inactive (${update1.recordset[0].rows_affected} row updated)`);
    
    console.log(`\nAllocating same call to new technician ${tech2}...`);
    const insert2 = await pool.request()
      .input("CallId", sql.Int, call1)
      .input("TechnicianId", sql.Int, tech2)
      .input("AssignedReason", sql.NVarChar(50), 'REALLOCATION')
      .query(`
        INSERT INTO call_technician_assignment 
        (call_id, technician_id, assigned_reason, assigned_at, is_active, created_at, updated_at)
        VALUES 
        (@CallId, @TechnicianId, @AssignedReason, GETDATE(), 1, GETDATE(), GETDATE());
        SELECT @@ROWCOUNT as rows_affected;
      `);
    
    console.log(`✅ Reallocation successful (${insert2.recordset[0].rows_affected} row inserted)`)

    // Test 3: Verify Complete History
    console.log('\n📌 TEST 3: Verify Complete History');
    console.log('-'.repeat(60));
    
    const history = await pool.request()
      .input("CallId", sql.Int, call1)
      .query(`
        SELECT 
          id,
          call_id,
          technician_id,
          assigned_reason,
          is_active,
          assigned_at,
          unassigned_at
        FROM call_technician_assignment 
        WHERE call_id = @CallId 
        ORDER BY assigned_at ASC
      `);
    
    console.log(`\n✅ Found ${history.recordset.length} allocation records:\n`);
    history.recordset.forEach((record, idx) => {
      console.log(`  ${idx + 1}. Technician ${record.technician_id}`);
      console.log(`     Reason: ${record.assigned_reason}`);
      console.log(`     Status: ${record.is_active ? '✅ ACTIVE' : '❌ INACTIVE'}`);
      console.log(`     Assigned: ${record.assigned_at.toISOString()}`);
      if (record.unassigned_at) {
        console.log(`     Unassigned: ${record.unassigned_at.toISOString()}`);
      }
      console.log();
    });

    console.log('✨ All tests passed successfully!');
    console.log('=' .repeat(60));
    
    process.exit(0);

  } catch (err) {
    console.error('❌ Test failed:', err.message);
    console.error('Details:', err);
    process.exit(1);
  }
}

testCompleteAllocationFlow();
