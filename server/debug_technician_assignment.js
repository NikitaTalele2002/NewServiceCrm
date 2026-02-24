import { poolPromise } from './db.js';
import sql from 'mssql';

async function debugAssignment() {
  try {
    const pool = await poolPromise;
    
    console.log('\n========== DEBUGGING TECHNICIAN ASSIGNMENT ==========\n');
    
    // Get sample complaints that are assigned to service centers
    console.log('1. Getting sample complaints assigned to service centers...');
    const complaintsRes = await pool.request()
      .query(`
        SELECT TOP 5 
          call_id, 
          customer_id, 
          assigned_asc_id,
          assigned_tech_id,
          created_at
        FROM calls 
        WHERE assigned_asc_id IS NOT NULL
      `);
    
    if (complaintsRes.recordset.length === 0) {
      console.log('   ❌ No complaints found with assigned service centers');
      return;
    }
    
    console.log(`   ✓ Found ${complaintsRes.recordset.length} complaints:`);
    complaintsRes.recordset.forEach(c => {
      console.log(`     - Call ID: ${c.call_id}, Customer: ${c.customer_id}, Service Center: ${c.assigned_asc_id}, Assigned Tech: ${c.assigned_tech_id}`);
    });
    
    // Pick first complaint for testing
    const testComplaint = complaintsRes.recordset[0];
    console.log(`\n2. Analyzing complaint ${testComplaint.call_id}...`);
    console.log(`   Service Center ID: ${testComplaint.assigned_asc_id}`);
    
    // Get technicians in that service center
    console.log(`\n3. Getting technicians in service center ${testComplaint.assigned_asc_id}...`);
    const techsRes = await pool.request()
      .input('ServiceCenterId', sql.Int, testComplaint.assigned_asc_id)
      .query(`
        SELECT 
          technician_id, 
          name, 
          service_center_id,
          status
        FROM technicians 
        WHERE service_center_id = @ServiceCenterId
      `);
    
    if (techsRes.recordset.length === 0) {
      console.log('   ❌ No technicians found in service center');
      
      // Get ALL technicians to understand the data
      console.log('\n   Getting ALL technicians to check status values...');
      const allTechsRes = await pool.request()
        .query(`
          SELECT TOP 10
            technician_id, 
            name, 
            service_center_id,
            status
          FROM technicians
        `);
      
      console.log(`   Found ${allTechsRes.recordset.length} total technicians:`);
      allTechsRes.recordset.forEach(t => {
        console.log(`     - ID: ${t.technician_id}, Name: ${t.name}, Service Center: ${t.service_center_id}, Status: "${t.status}" (Type: ${typeof t.status})`);
      });
      
      // Also check service centers
      console.log('\n   Checking available service centers...');
      const scRes = await pool.request()
        .query('SELECT TOP 10 * FROM service_centers');
      console.log(`   Service Centers: ${scRes.recordset.map(sc => `${sc.asc_id}:${sc.center_name || 'N/A'}`).join(', ')}`);
      console.log(`   Columns in service_centers table: ${Object.keys(scRes.recordset[0] || {}).join(', ')}`);
      
      return;
    }
    
    console.log(`   ✓ Found ${techsRes.recordset.length} technicians:`);
    techsRes.recordset.forEach(t => {
      console.log(`     - ID: ${t.technician_id}, Name: ${t.name}, Status: "${t.status}" (Type: ${typeof t.status})`);
    });
    
    // Now test the PROBLEMATIC query from complaints.js
    console.log(`\n4. Testing the CURRENT (PROBLEMATIC) query...`);
    console.log('   Query: ... WHERE technician_id = @TechnicianId AND status = 1');
    
    const testTech = techsRes.recordset[0];
    console.log(`   Testing with technician ID: ${testTech.technician_id}`);
    
    const oldQueryRes = await pool.request()
      .input('TechnicianId', sql.Int, testTech.technician_id)
      .query(`
        SELECT technician_id, name, service_center_id, status 
        FROM technicians 
        WHERE technician_id = @TechnicianId AND status = 1
      `);
    
    console.log(`   Result: ${oldQueryRes.recordset.length} records found`);
    if (oldQueryRes.recordset.length === 0) {
      console.log('   ❌ PROBLEM: No results! This is why assignment fails.');
      console.log(`   The technician has status = "${testTech.status}" (string), but query checks for status = 1 (number)`);
    }
    
    // Test the FIXED query
    console.log(`\n5. Testing the FIXED query...`);
    console.log('   Query: ... WHERE technician_id = @TechnicianId AND status = \'active\'');
    
    const newQueryRes = await pool.request()
      .input('TechnicianId', sql.Int, testTech.technician_id)
      .query(`
        SELECT technician_id, name, service_center_id, status 
        FROM technicians 
        WHERE technician_id = @TechnicianId AND status = 'active'
      `);
    
    console.log(`   Result: ${newQueryRes.recordset.length} records found`);
    if (newQueryRes.recordset.length > 0) {
      console.log('   ✓ SUCCESS: Query works with status = "active"');
      newQueryRes.recordset.forEach(t => {
        console.log(`     - ${t.name} (Status: ${t.status})`);
      });
    }
    
    console.log('\n========== SUMMARY ==========');
    console.log('The issue is in server/routes/complaints.js at line ~714');
    console.log('The query checks: status = 1 (number)');
    console.log('But the database stores: status = "active" (string)');
    console.log('Fix: Change status = 1 to status = "active"');
    console.log('=====================================\n');
    
  } catch (err) {
    console.error('Debug error:', err.message);
  }
}

debugAssignment();
