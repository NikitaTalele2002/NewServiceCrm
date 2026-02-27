import complaintService from './services/complaintService.js';
import { poolPromise } from './db.js';
import sql from 'mssql';

async function testServiceAllocation() {
  try {
    console.log('🧪 Testing Allocation Service\n');
    console.log('=' .repeat(60));

    // Get a real call
    const pool = await poolPromise;
    const callRes = await pool.request()
      .query(`
        SELECT TOP 1 call_id, assigned_asc_id
        FROM calls 
        WHERE assigned_asc_id IS NOT NULL
        ORDER BY call_id DESC
      `);
    
    const callId = callRes.recordset[0].call_id;
    const centerId = callRes.recordset[0].assigned_asc_id;
    
    // Get a technician
    const techRes = await pool.request()
      .input("CenterId", sql.Int, centerId)
      .query(`
        SELECT TOP 1 technician_id FROM technicians 
        WHERE service_center_id = @CenterId AND status = 'active'
      `);
    
    const technicianId = techRes.recordset[0].technician_id;
    
    console.log(`\n📌 Testing with Call ID: ${callId}, Technician ID: ${technicianId}`);
    console.log('-'.repeat(60));

    // Call the service
    console.log(`\n📞 Calling assignTechnician service...`);
    const result = await complaintService.assignTechnician({ 
      complaintId: callId, 
      technicianId: technicianId,
      assignmentReason: null
    });

    console.log(`\n✅ Service call successful!`);
    console.log(`Result:`, JSON.stringify(result, null, 2));

    // Verify in database
    console.log(`\n🔎 Verifying in database...`);
    const verifyRes = await pool.request()
      .input("CallId", sql.Int, callId)
      .query(`
        SELECT TOP 5 id, technician_id, assigned_reason, is_active, assigned_at
        FROM call_technician_assignment
        WHERE call_id = @CallId
        ORDER BY assigned_at DESC
      `);
    
    console.log(`✅ Found ${verifyRes.recordset.length} allocation records:`);
    verifyRes.recordset.forEach((record, idx) => {
      console.log(`   ${idx + 1}. Tech: ${record.technician_id}, Reason: ${record.assigned_reason}, Active: ${record.is_active}`);
    });

    console.log('\n✨ Service test completed successfully!');
    console.log('=' .repeat(60));
    
    process.exit(0);

  } catch (err) {
    console.error('❌ Test failed:', err.message);
    console.error('Full error:', err);
    process.exit(1);
  }
}

testServiceAllocation();
