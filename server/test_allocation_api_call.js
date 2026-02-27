import fetch from 'node-fetch';
import { poolPromise } from './db.js';
import sql from 'mssql';

async function testAllocationAPI() {
  try {
    console.log('🧪 Testing Allocation API Endpoint\n');
    console.log('=' .repeat(60));

    // First, get a real call to use for testing
    const pool = await poolPromise;
    const callRes = await pool.request()
      .query(`
        SELECT TOP 1 call_id, assigned_asc_id
        FROM calls 
        WHERE assigned_asc_id IS NOT NULL
        ORDER BY call_id DESC
      `);
    
    if (!callRes.recordset.length) {
      console.log('❌ No calls found');
      process.exit(1);
    }

    const callId = callRes.recordset[0].call_id;
    console.log(`\n📌 Using Call ID: ${callId}`);

    // Get a technician from the same center
    const centerId = callRes.recordset[0].assigned_asc_id;
    const techRes = await pool.request()
      .input("CenterId", sql.Int, centerId)
      .query(`
        SELECT TOP 1 technician_id FROM technicians 
        WHERE service_center_id = @CenterId AND status = 'active'
      `);
    
    const technicianId = techRes.recordset[0].technician_id;
    console.log(`📌 Using Technician ID: ${technicianId}`);

    // Make API call
    console.log(`\n📡 Calling /complaints/assign-technician...`);
    const response = await fetch('http://localhost:3000/api/complaints/assign-technician', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        complaintId: callId,
        technicianId: technicianId,
        assignmentReason: 'TEST_ALLOCATION'
      })
    });

    const data = await response.json();
    
    console.log(`\n✅ Response Status: ${response.status}`);
    console.log(`✅ Response:`, JSON.stringify(data, null, 2));

    if (!data.success) {
      console.log('\n❌ API returned error');
      process.exit(1);
    }

    // Verify from database
    console.log(`\n🔎 Verifying in database...`);
    const verifyRes = await pool.request()
      .input("CallId", sql.Int, callId)
      .query(`
        SELECT TOP 5 id, technician_id, assigned_reason, is_active, assigned_at
        FROM call_technician_assignment
        WHERE call_id = @CallId
        ORDER BY assigned_at DESC
      `);
    
    console.log(`✅ Found ${verifyRes.recordset.length} records:`);
    verifyRes.recordset.forEach((record, idx) => {
      console.log(`   ${idx + 1}. Tech: ${record.technician_id}, Reason: ${record.assigned_reason}, Active: ${record.is_active}`);
    });

    console.log('\n✨ Test completed successfully!');
    console.log('=' .repeat(60));
    
    process.exit(0);

  } catch (err) {
    console.error('❌ Test failed:', err.message);
    console.error('Full error:', err);
    process.exit(1);
  }
}

testAllocationAPI();
