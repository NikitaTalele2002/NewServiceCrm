import { poolPromise } from './db.js';
import sql from 'mssql';

async function testAllocationInsert() {
  try {
    const pool = await poolPromise;

    // Test data
    const callId = 1;
    const technicianId = 3;
    const assignedReason = 'INITIAL_ALLOCATION';

    console.log('🧪 Testing allocation insert...\n');
    console.log('Input data:', { callId, technicianId, assignedReason });

    // Test 1: Check if command is executing
    console.log('\n📝 Inserting test record...');
    const insertResult = await pool.request()
      .input("CallId", sql.Int, callId)
      .input("TechnicianId", sql.Int, technicianId)
      .input("AssignedByUserId", sql.Int, 1)
      .input("AssignedReason", sql.NVarChar(50), assignedReason)
      .input("IsActive", sql.Bit, 1)
      .query(`
        INSERT INTO call_technician_assignment 
        (call_id, technician_id, assigned_by_user_id, assigned_reason, assigned_at, is_active, created_at, updated_at)
        VALUES 
        (@CallId, @TechnicianId, @AssignedByUserId, @AssignedReason, GETDATE(), @IsActive, GETDATE(), GETDATE());
        SELECT @@ROWCOUNT as rows_affected;
      `);

    console.log('✅ Insert successful');
    console.log('Rows affected:', insertResult.recordset[0].rows_affected);

    // Test 2: Verify it was inserted
    console.log('\n🔍 Verifying insert...');
    const verifyResult = await pool.request()
      .input("CallId", sql.Int, callId)
      .query(`
        SELECT * FROM call_technician_assignment 
        WHERE call_id = @CallId 
        ORDER BY assigned_at DESC
      `);

    console.log(`✅ Found ${verifyResult.recordset.length} records for call ${callId}`);
    verifyResult.recordset.forEach((record, idx) => {
      console.log(`\nRecord ${idx + 1}:`, {
        id: record.id,
        call_id: record.call_id,
        technician_id: record.technician_id,
        assigned_reason: record.assigned_reason,
        is_active: record.is_active,
        assigned_at: record.assigned_at,
        unassigned_at: record.unassigned_at
      });
    });

    console.log('\n✨ Test completed successfully!');
    process.exit(0);

  } catch (err) {
    console.error('❌ Test failed:', err.message);
    console.error('Details:', err);
    process.exit(1);
  }
}

testAllocationInsert();
