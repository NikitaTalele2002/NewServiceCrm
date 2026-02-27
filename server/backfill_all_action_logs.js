import { poolPromise } from './db.js';
import sql from 'mssql';

async function comprehensiveBackfill() {
  try {
    const pool = await poolPromise;

    console.log('🔄 Starting comprehensive action log backfill...\n');

    // Step 1: Remove any duplicate technician assignments (in case previous run created any)
    console.log('Step 1: Cleaning up any duplicate technician assignment logs...\n');
    
    const duplicateCheck = await pool.request().query(`
      SELECT entity_id, COUNT(*) as count
      FROM action_logs
      WHERE entity_type = 'Call'
      AND remarks LIKE '%Assigned to technician%'
      GROUP BY entity_id
      HAVING COUNT(*) > 1
    `);

    if (duplicateCheck.recordset.length > 0) {
      console.log(`⚠️ Found ${duplicateCheck.recordset.length} calls with duplicate technician logs. Cleaning...\n`);
      
      for (const dup of duplicateCheck.recordset) {
        // Keep only the first one, delete the rest
        await pool.request()
          .input('CallId', sql.Int, dup.entity_id)
          .query(`
            DELETE FROM action_logs
            WHERE entity_type = 'Call'
            AND entity_id = @CallId
            AND remarks LIKE '%Assigned to technician%'
            AND log_id NOT IN (
              SELECT TOP 1 log_id FROM action_logs
              WHERE entity_type = 'Call'
              AND entity_id = @CallId
              AND remarks LIKE '%Assigned to technician%'
              ORDER BY action_at ASC
            )
          `);
        console.log(`  Cleaned up call ${dup.call_id}`);
      }
    }

    // Step 2: Backfill service center assignments
    console.log('\nStep 2: Backfilling service center assignments...\n');

    const callsWithSC = await pool.request().query(`
      SELECT 
        c.call_id,
        c.status_id,
        c.sub_status_id,
        c.assigned_asc_id,
        c.created_at,
        c.updated_at,
        sc.asc_name
      FROM calls c
      LEFT JOIN service_centers sc ON sc.asc_id = c.assigned_asc_id
      WHERE c.assigned_asc_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM action_logs al
        WHERE al.entity_id = c.call_id 
        AND al.entity_type = 'Call'
        AND al.remarks LIKE '%Assigned to Service Center%'
      )
      ORDER BY c.call_id
    `);

    console.log(`📋 Found ${callsWithSC.recordset.length} calls needing service center assignment logs\n`);

    let scCount = 0;
    for (const call of callsWithSC.recordset) {
      try {
        const assignmentTime = new Date(call.created_at);
        assignmentTime.setSeconds(assignmentTime.getSeconds() + 5);

        await pool.request()
          .input('EntityType', sql.NVarChar, 'Call')
          .input('EntityId', sql.Int, call.call_id)
          .input('UserId', sql.Int, 1)
          .input('OldStatusId', sql.Int, null)
          .input('NewStatusId', sql.Int, call.status_id || null)
          .input('OldSubStatusId', sql.Int, null)
          .input('NewSubStatusId', sql.Int, call.sub_status_id || null)
          .input('Remarks', sql.NVarChar, `Assigned to Service Center: ${call.asc_name || 'Unknown'}`)
          .input('ActionAt', sql.DateTime, assignmentTime)
          .query(`
            INSERT INTO action_logs (entity_type, entity_id, user_id, action_user_role_id, old_status_id, new_status_id, old_substatus_id, new_substatus_id, remarks, action_at, created_at, updated_at)
            VALUES (@EntityType, @EntityId, @UserId, NULL, @OldStatusId, @NewStatusId, @OldSubStatusId, @NewSubStatusId, @Remarks, @ActionAt, GETDATE(), GETDATE())
          `);

        console.log(`✅ Call ${call.call_id}: Service center assignment (${call.asc_name || 'Unknown'})`);
        scCount++;
      } catch (err) {
        console.error(`❌ Error for call ${call.call_id}:`, err.message);
      }
    }

    // Step 3: Backfill technician assignments (after service center)
    console.log('\nStep 3: Backfilling technician assignments...\n');

    const callsWithTechs = await pool.request().query(`
      SELECT 
        c.call_id,
        c.status_id,
        c.sub_status_id,
        c.assigned_tech_id,
        c.created_at,
        c.updated_at,
        t.name as tech_name
      FROM calls c
      JOIN technicians t ON t.technician_id = c.assigned_tech_id
      WHERE c.assigned_tech_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM action_logs al
        WHERE al.entity_id = c.call_id 
        AND al.entity_type = 'Call'
        AND al.remarks LIKE '%Assigned to technician%'
      )
      ORDER BY c.call_id
    `);

    console.log(`📋 Found ${callsWithTechs.recordset.length} calls needing technician assignment logs\n`);

    let techCount = 0;
    for (const call of callsWithTechs.recordset) {
      try {
        // 10 seconds after creation (5 seconds after service center assignment)
        const assignmentTime = new Date(call.created_at);
        assignmentTime.setSeconds(assignmentTime.getSeconds() + 10);

        await pool.request()
          .input('EntityType', sql.NVarChar, 'Call')
          .input('EntityId', sql.Int, call.call_id)
          .input('UserId', sql.Int, 1)
          .input('OldStatusId', sql.Int, null)
          .input('NewStatusId', sql.Int, call.status_id || null)
          .input('OldSubStatusId', sql.Int, null)
          .input('NewSubStatusId', sql.Int, call.sub_status_id || null)
          .input('Remarks', sql.NVarChar, `Assigned to technician: ${call.tech_name}`)
          .input('ActionAt', sql.DateTime, assignmentTime)
          .query(`
            INSERT INTO action_logs (entity_type, entity_id, user_id, action_user_role_id, old_status_id, new_status_id, old_substatus_id, new_substatus_id, remarks, action_at, created_at, updated_at)
            VALUES (@EntityType, @EntityId, @UserId, NULL, @OldStatusId, @NewStatusId, @OldSubStatusId, @NewSubStatusId, @Remarks, @ActionAt, GETDATE(), GETDATE())
          `);

        console.log(`✅ Call ${call.call_id}: Technician assignment (${call.tech_name})`);
        techCount++;
      } catch (err) {
        console.error(`❌ Error for call ${call.call_id}:`, err.message);
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`  - Service Center Assignments: ${scCount}`);
    console.log(`  - Technician Assignments: ${techCount}`);
    console.log('✅ Comprehensive backfill complete!');

  } catch (err) {
    console.error('❌ Fatal error:', err.message);
  }
}

comprehensiveBackfill().then(() => {
  console.log('\n🎉 Done!');
  process.exit(0);
}).catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
