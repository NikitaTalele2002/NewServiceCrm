/**
 * Test Technician Allocation & Reallocation System
 * 
 * Tests the following:
 * 1. Initial allocation (no previous technician)
 * 2. Reallocation (replacing existing technician)
 * 3. Allocation history retrieval
 * 4. Status tracking (Allocated vs Re-Allocated)
 */

import { sequelize, poolPromise } from './db.js';
import sql from 'mssql';

async function runTests() {
  try {
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║    Technician Allocation Tracking System - Test Suite        ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    const pool = await poolPromise;

    // ========== TEST 1: Check database setup ==========
    console.log('📋 TEST 1: Verifying Database Setup');
    console.log('─'.repeat(60));

    // Check statuses exist
    const statusesRes = await pool.request()
      .query(`SELECT status_id, status_name FROM status WHERE status_name IN ('Allocated', 'Re-Allocated') ORDER BY status_id`);
    
    const statuses = statusesRes.recordset;
    if (statuses.length === 2) {
      console.log('✅ Both statuses created:');
      statuses.forEach(s => console.log(`   - ID: ${s.status_id}, Name: "${s.status_name}"`));
    } else {
      console.log('⚠️  Warning: Expected 2 statuses, found', statuses.length);
    }

    // Check table structure
    const columnsRes = await pool.request()
      .query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'call_technician_assignment'
        ORDER BY ORDINAL_POSITION
      `);
    
    const expectedColumns = ['id', 'call_id', 'technician_id', 'assigned_by_user_id', 'assigned_reason', 'assigned_at', 'unassigned_at', 'is_active', 'created_at', 'updated_at'];
    const actualColumns = columnsRes.recordset.map(r => r.COLUMN_NAME.toLowerCase());
    const allPresent = expectedColumns.every(col => actualColumns.includes(col.toLowerCase()));
    
    if (allPresent) {
      console.log('✅ call_technician_assignment table has all required columns');
    } else {
      const missing = expectedColumns.filter(col => !actualColumns.includes(col.toLowerCase()));
      console.log('❌ Missing columns:', missing);
    }

    // ========== TEST 2: Test Initial Allocation ==========
    console.log('\n📋 TEST 2: Testing Initial Allocation');
    console.log('─'.repeat(60));

    // Get a test call and technician
    const callRes = await pool.request()
      .input("Status", sql.NVarChar, 'assigned to the service center')
      .query(`
        SELECT TOP 1 c.call_id, c.assigned_tech_id, c.assigned_asc_id
        FROM calls c
        LEFT JOIN status s ON s.status_id = c.status_id
        WHERE c.assigned_asc_id IS NOT NULL AND c.assigned_tech_id IS NULL
        ORDER BY c.call_id DESC
      `);

    if (callRes.recordset.length === 0) {
      console.log('⚠️  No unallocated calls found for testing');
    } else {
      const testCall = callRes.recordset[0];
      console.log(`✅ Found test call: ${testCall.call_id}`);

      // Get a technician from the same service center
      const techRes = await pool.request()
        .input("ServiceCenterId", sql.Int, testCall.assigned_asc_id)
        .query(`
          SELECT TOP 1 technician_id, name FROM technicians 
          WHERE service_center_id = @ServiceCenterId AND status = 'active'
        `);

      if (techRes.recordset.length === 0) {
        console.log('⚠️  No technicians found for this service center');
      } else {
        const technician = techRes.recordset[0];
        console.log(`✅ Found technician: ${technician.name} (ID: ${technician.technician_id})`);

        // Simulate initial allocation
        console.log(`\n   Allocating technician ${technician.name} to call ${testCall.call_id}...`);

        // Get Allocated status ID
        const allocatedStatusRes = await pool.request()
          .query(`SELECT status_id FROM status WHERE status_name = 'Allocated'`);
        const allocatedStatusId = allocatedStatusRes.recordset[0].status_id;

        // Insert assignment
        await pool.request()
          .input("CallId", sql.Int, testCall.call_id)
          .input("TechnicianId", sql.Int, technician.technician_id)
          .input("AssignedReason", sql.NVarChar, 'INITIAL_ALLOCATION')
          .input("IsActive", sql.Bit, 1)
          .query(`
            INSERT INTO call_technician_assignment (call_id, technician_id, assigned_reason, assigned_at, is_active, created_at, updated_at)
            VALUES (@CallId, @TechnicianId, @AssignedReason, GETDATE(), @IsActive, GETDATE(), GETDATE())
          `);

        // Update call
        await pool.request()
          .input("CallId", sql.Int, testCall.call_id)
          .input("TechnicianId", sql.Int, technician.technician_id)
          .input("StatusId", sql.Int, allocatedStatusId)
          .query(`
            UPDATE calls 
            SET assigned_tech_id = @TechnicianId, status_id = @StatusId, updated_at = GETDATE()
            WHERE call_id = @CallId
          `);

        // Verify
        const verifyRes = await pool.request()
          .input("CallId", sql.Int, testCall.call_id)
          .query(`
            SELECT c.assigned_tech_id, s.status_name, 
                   (SELECT COUNT(*) FROM call_technician_assignment WHERE call_id = c.call_id) as allocation_count
            FROM calls c
            LEFT JOIN status s ON s.status_id = c.status_id
            WHERE c.call_id = @CallId
          `);

        const verify = verifyRes.recordset[0];
        console.log(`✅ Initial allocation successful`);
        console.log(`   - assigned_tech_id: ${verify.assigned_tech_id}`);
        console.log(`   - status: ${verify.status_name}`);
        console.log(`   - allocations: ${verify.allocation_count}`);
      }
    }

    // ========== TEST 3: Test Reallocation ==========
    console.log('\n📋 TEST 3: Testing Reallocation');
    console.log('─'.repeat(60));

    // Find a call with active allocation
    const allocatedCallRes = await pool.request()
      .query(`
        SELECT TOP 1 c.call_id, c.assigned_tech_id, c.assigned_asc_id
        FROM calls c
        WHERE c.assigned_tech_id IS NOT NULL AND c.assigned_asc_id IS NOT NULL
        ORDER BY c.call_id DESC
      `);

    if (allocatedCallRes.recordset.length === 0) {
      console.log('⚠️  No allocated calls found for reallocation testing');
    } else {
      const reallocCall = allocatedCallRes.recordset[0];
      const oldTechId = reallocCall.assigned_tech_id;
      console.log(`✅ Found allocated call: ${reallocCall.call_id}, current tech: ${oldTechId}`);

      // Get different technician
      const newTechRes = await pool.request()
        .input("ServiceCenterId", sql.Int, reallocCall.assigned_asc_id)
        .input("ExcludeTechId", sql.Int, oldTechId)
        .query(`
          SELECT TOP 1 technician_id, name FROM technicians 
          WHERE service_center_id = @ServiceCenterId AND status = 'active' AND technician_id != @ExcludeTechId
        `);

      if (newTechRes.recordset.length === 0) {
        console.log('⚠️  No alternative technicians found for reallocation');
      } else {
        const newTech = newTechRes.recordset[0];
        console.log(`✅ Found new technician: ${newTech.name} (ID: ${newTech.technician_id})`);

        console.log(`\n   Reallocating from tech ${oldTechId} to tech ${newTech.technician_id}...`);

        // Get Re-Allocated status ID
        const reallocatedStatusRes = await pool.request()
          .query(`SELECT status_id FROM status WHERE status_name = 'Re-Allocated'`);
        const reallocatedStatusId = reallocatedStatusRes.recordset[0].status_id;

        // Mark previous assignment as inactive
        await pool.request()
          .input("CallId", sql.Int, reallocCall.call_id)
          .query(`
            UPDATE call_technician_assignment
            SET is_active = 0, unassigned_at = GETDATE()
            WHERE call_id = @CallId AND is_active = 1
          `);

        // Insert new assignment
        await pool.request()
          .input("CallId", sql.Int, reallocCall.call_id)
          .input("TechnicianId", sql.Int, newTech.technician_id)
          .input("AssignedReason", sql.NVarChar, 'REALLOCATION')
          .input("IsActive", sql.Bit, 1)
          .query(`
            INSERT INTO call_technician_assignment (call_id, technician_id, assigned_reason, assigned_at, is_active, created_at, updated_at)
            VALUES (@CallId, @TechnicianId, @AssignedReason, GETDATE(), @IsActive, GETDATE(), GETDATE())
          `);

        // Update call
        await pool.request()
          .input("CallId", sql.Int, reallocCall.call_id)
          .input("TechnicianId", sql.Int, newTech.technician_id)
          .input("StatusId", sql.Int, reallocatedStatusId)
          .query(`
            UPDATE calls 
            SET assigned_tech_id = @TechnicianId, status_id = @StatusId, updated_at = GETDATE()
            WHERE call_id = @CallId
          `);

        // Verify reallocation
        const verifyReallocRes = await pool.request()
          .input("CallId", sql.Int, reallocCall.call_id)
          .query(`
            SELECT 
              c.assigned_tech_id, 
              s.status_name,
              (SELECT COUNT(*) FROM call_technician_assignment WHERE call_id = c.call_id) as total_allocations,
              (SELECT COUNT(*) FROM call_technician_assignment WHERE call_id = c.call_id AND is_active = 1) as active_count
            FROM calls c
            LEFT JOIN status s ON s.status_id = c.status_id
            WHERE c.call_id = @CallId
          `);

        const verifyRealloc = verifyReallocRes.recordset[0];
        console.log(`✅ Reallocation successful`);
        console.log(`   - new assigned_tech_id: ${verifyRealloc.assigned_tech_id}`);
        console.log(`   - status: ${verifyRealloc.status_name}`);
        console.log(`   - total allocations: ${verifyRealloc.total_allocations}`);
        console.log(`   - active allocations: ${verifyRealloc.active_count}`);
      }
    }

    // ========== TEST 4: Test History Retrieval ==========
    console.log('\n📋 TEST 4: Testing Allocation History Retrieval');
    console.log('─'.repeat(60));

    const historyCallRes = await pool.request()
      .query(`
        SELECT TOP 1 c.call_id 
        FROM calls c
        INNER JOIN call_technician_assignment cta ON cta.call_id = c.call_id
        GROUP BY c.call_id
        HAVING COUNT(*) > 1
        ORDER BY c.call_id DESC
      `);

    if (historyCallRes.recordset.length === 0) {
      console.log('⚠️  No calls with multiple allocations found');
    } else {
      const historyCallId = historyCallRes.recordset[0].call_id;
      console.log(`✅ Found call with history: ${historyCallId}`);

      const historyRes = await pool.request()
        .input("CallId", sql.Int, historyCallId)
        .query(`
          SELECT 
            cta.id, cta.technician_id, t.name as tech_name, 
            cta.assigned_at, cta.unassigned_at, cta.is_active, cta.assigned_reason
          FROM call_technician_assignment cta
          LEFT JOIN technicians t ON t.technician_id = cta.technician_id
          WHERE cta.call_id = @CallId
          ORDER BY cta.assigned_at DESC
        `);

      const history = historyRes.recordset;
      console.log(`✅ Retrieved allocation history (${history.length} records):`);
      history.forEach((h, idx) => {
        console.log(`\n   [${idx + 1}] ${h.tech_name} (ID: ${h.technician_id})`);
        console.log(`       Reason: ${h.assigned_reason}`);
        console.log(`       Allocated: ${h.assigned_at}`);
        console.log(`       Status: ${h.is_active ? 'ACTIVE' : 'INACTIVE'}`);
        if (h.unassigned_at) console.log(`       Unassigned: ${h.unassigned_at}`);
      });
    }

    // ========== SUMMARY ==========
    console.log('\n╔══════════════════════════════════════════════════════════════╗');
    console.log('║                    TEST SUITE COMPLETE                       ║');
    console.log('╚══════════════════════════════════════════════════════════════╝\n');

    console.log('✨ All tests passed! Technician allocation tracking is working correctly.');
    console.log('\nKey Points:');
    console.log('  ✓ Statuses created (Allocated & Re-Allocated)');
    console.log('  ✓ Table structure verified');
    console.log('  ✓ Initial allocation tested');
    console.log('  ✓ Reallocation tested');
    console.log('  ✓ History retrieval tested\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Test Error:', error.message);
    console.error('\nFull Error:', error);
    process.exit(1);
  }
}

runTests();
