import { poolPromise } from './db.js';
import sql from 'mssql';

async function testTechnicianAssignment() {
  try {
    const pool = await poolPromise;
    
    console.log('\n========== TEST TECHNICIAN ASSIGNMENT FIX ==========\n');
    
    // Get a complaint assigned to service center 4
    const complaintRes = await pool.request()
      .query(`
        SELECT TOP 1 call_id, assigned_asc_id 
        FROM calls 
        WHERE assigned_asc_id = 4
      `);
    
    if (complaintRes.recordset.length === 0) {
      console.log('No complaints assigned to service center 4');
      console.log('Creating test data...\n');
      
      // Update complaint 9 to be assigned to service center 4
      await pool.request()
        .input('CallId', sql.Int, 9)
        .query('UPDATE calls SET assigned_asc_id = 4 WHERE call_id = @CallId');
      console.log('✓ Updated complaint 9 to service center 4');
    }
    
    // Get a technician in service center 4
    const techRes = await pool.request()
      .query(`
        SELECT TOP 1 technician_id, name, status 
        FROM technicians 
        WHERE service_center_id = 4 AND status = 'active'
      `);
    
    if (techRes.recordset.length === 0) {
      console.log('❌ No active technicians in service center 4');
      return;
    }
    
    const complaint = { call_id: 9, assigned_asc_id: 4 };
    const technician = techRes.recordset[0];
    
    console.log(`\nTest Case:`);
    console.log(`  Complaint ID: ${complaint.call_id}, Service Center: ${complaint.assigned_asc_id}`);
    console.log(`  Technician ID: ${technician.technician_id}, Name: ${technician.name}, Status: ${technician.status}`);
    
    // Simulate the FIXED query
    console.log(`\nTesting FIXED query with status = 'active'...\n`);
    
    const fixedQueryRes = await pool.request()
      .input('TechnicianId', sql.Int, technician.technician_id)
      .input('ComplaintId', sql.Int, complaint.call_id)
      .input('ServiceCenterId', sql.Int, complaint.assigned_asc_id)
      .query(`
        SELECT 
          t.technician_id, 
          t.name, 
          t.service_center_id,
          t.status
        FROM technicians t
        WHERE t.technician_id = @TechnicianId 
          AND t.status = 'active'
          AND t.service_center_id = @ServiceCenterId
      `);
    
    if (fixedQueryRes.recordset.length > 0) {
      console.log('✓ FIXED QUERY SUCCESS! Technician found:');
      const tech = fixedQueryRes.recordset[0];
      console.log(`  - ID: ${tech.technician_id}`);
      console.log(`  - Name: ${tech.name}`);
      console.log(`  - Status: ${tech.status}`);
      console.log(`  - Service Center: ${tech.service_center_id}`);
      
      // Now try the actual assignment
      console.log(`\nAssigning technician to complaint...`);
      await pool.request()
        .input('CallId', sql.Int, complaint.call_id)
        .input('TechnicianId', sql.Int, technician.technician_id)
        .query(`
          UPDATE calls
          SET assigned_tech_id = @TechnicianId, updated_at = GETDATE()
          WHERE call_id = @CallId
        `);
      
      console.log('✓ Assignment successful!');
      
      // Verify assignment
      const verification = await pool.request()
        .input('CallId', sql.Int, complaint.call_id)
        .query(`
          SELECT c.call_id, c.assigned_asc_id, c.assigned_tech_id, t.name 
          FROM calls c
          LEFT JOIN technicians t ON t.technician_id = c.assigned_tech_id
          WHERE c.call_id = @CallId
        `);
      
      const verified = verification.recordset[0];
      console.log(`\nVerification:`);
      console.log(`  Call ID: ${verified.call_id}`);
      console.log(`  Service Center: ${verified.assigned_asc_id}`);
      console.log(`  Assigned Tech ID: ${verified.assigned_tech_id}`);
      console.log(`  Assigned Tech Name: ${verified.name || 'None'}`);
      
    } else {
      console.log('❌ FIXED QUERY FAILED - No technician found');
    }
    
  } catch (err) {
    console.error('Test error:', err.message);
  }
}

testTechnicianAssignment();
