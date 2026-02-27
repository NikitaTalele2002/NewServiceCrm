import { poolPromise } from './db.js';
import sql from 'mssql';

async function debugAllocationIssue() {
  try {
    const pool = await poolPromise;

    console.log('🔍 Debugging Allocation Issue\n');
    console.log('=' .repeat(60));

    // Get a real call with an assigned center
    console.log('\n📋 Step 1: Finding a call with assigned center...');
    const callRes = await pool.request()
      .query(`
        SELECT TOP 1 
          c.call_id, 
          c.assigned_asc_id, 
          c.assigned_tech_id,
          c.status_id
        FROM calls c 
        WHERE c.assigned_asc_id IS NOT NULL
        ORDER BY c.call_id DESC
      `);
    
    if (!callRes.recordset.length) {
      console.log('❌ No calls found with assigned service center');
      process.exit(1);
    }
    
    const call = callRes.recordset[0];
    console.log(`✅ Found call: ${call.call_id}`);
    console.log(`   Assigned Service Center: ${call.assigned_asc_id}`);
    console.log(`   Current Tech: ${call.assigned_tech_id || 'None'}`);
    console.log(`   Status: ${call.status_id}`);

    // Check technicians at that center
    console.log(`\n👷 Step 2: Finding technicians at service center ${call.assigned_asc_id}...`);
    const techRes = await pool.request()
      .input("CenterId", sql.Int, call.assigned_asc_id)
      .query(`
        SELECT TOP 5 technician_id, name, service_center_id, status
        FROM technicians 
        WHERE service_center_id = @CenterId AND status = 'active'
        ORDER BY technician_id
      `);
    
    if (!techRes.recordset.length) {
      console.log('❌ No technicians found at this center');
      process.exit(1);
    }
    
    console.log(`✅ Found ${techRes.recordset.length} technicians:`);
    techRes.recordset.forEach((t, idx) => {
      console.log(`   ${idx + 1}. ID: ${t.technician_id}, Name: ${t.name}`);
    });

    const technicianId = techRes.recordset[0].technician_id;
    
    // Check current allocation status
    console.log(`\n📊 Step 3: Checking current allocation history...`);
    const historyRes = await pool.request()
      .input("CallId", sql.Int, call.call_id)
      .query(`
        SELECT id, technician_id, assigned_reason, is_active, assigned_at
        FROM call_technician_assignment
        WHERE call_id = @CallId
        ORDER BY assigned_at DESC
      `);
    
    console.log(`✅ Found ${historyRes.recordset.length} allocation records:`);
    historyRes.recordset.forEach((record, idx) => {
      console.log(`   ${idx + 1}. Tech: ${record.technician_id}, Reason: ${record.assigned_reason}, Active: ${record.is_active}`);
    });

    // Simulate the INSERT
    console.log(`\n✏️  Step 4: Attempting to INSERT allocation record...`);
    console.log(`   Call ID: ${call.call_id}`);
    console.log(`   Technician ID: ${technicianId}`);
    console.log(`   Reason: INITIAL_ALLOCATION`);
    
    try {
      const insertRes = await pool.request()
        .input("CallId", sql.Int, call.call_id)
        .input("TechnicianId", sql.Int, technicianId)
        .input("AssignedByUserId", sql.Int, 1)
        .input("AssignedReason", sql.NVarChar(50), 'INITIAL_ALLOCATION')
        .input("IsActive", sql.Bit, 1)
        .query(`
          INSERT INTO call_technician_assignment 
          (call_id, technician_id, assigned_by_user_id, assigned_reason, assigned_at, is_active, created_at, updated_at)
          VALUES 
          (@CallId, @TechnicianId, @AssignedByUserId, @AssignedReason, GETDATE(), @IsActive, GETDATE(), GETDATE());
          SELECT @@ROWCOUNT as rows_affected;
        `);
      
      console.log(`✅ INSERT successful: ${insertRes.recordset[0].rows_affected} row inserted`);
    } catch (insertErr) {
      console.log(`❌ INSERT failed: ${insertErr.message}`);
      console.log(`Error details:`, insertErr);
      process.exit(1);
    }

    // Verify insertion
    console.log(`\n🔎 Step 5: Verifying insertion...`);
    const verifyRes = await pool.request()
      .input("CallId", sql.Int, call.call_id)
      .query(`
        SELECT TOP 5 id, technician_id, assigned_reason, is_active, assigned_at
        FROM call_technician_assignment
        WHERE call_id = @CallId
        ORDER BY assigned_at DESC
      `);
    
    console.log(`✅ Now found ${verifyRes.recordset.length} records:`);
    verifyRes.recordset.forEach((record, idx) => {
      console.log(`   ${idx + 1}. ID: ${record.id}, Tech: ${record.technician_id}, Reason: ${record.assigned_reason}, Active: ${record.is_active}`);
    });

    console.log('\n✨ Debug completed successfully!');
    console.log('=' .repeat(60));
    
    process.exit(0);

  } catch (err) {
    console.error('❌ Debug failed:', err.message);
    console.error('Full error:', err);
    process.exit(1);
  }
}

debugAllocationIssue();
