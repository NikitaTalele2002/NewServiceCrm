import { poolPromise } from './db.js';
import sql from 'mssql';

async function backfillActionLogs() {
  try {
    const pool = await poolPromise;

    console.log('🔄 Starting action log backfill for existing calls...\n');

    // Get all calls that don't have action logs yet
    const callsWithoutLogs = await pool.request().query(`
      SELECT DISTINCT c.call_id
      FROM calls c
      LEFT JOIN action_logs al ON al.entity_id = c.call_id AND al.entity_type = 'Call'
      WHERE al.log_id IS NULL
      ORDER BY c.call_id
    `);

    console.log(`📋 Found ${callsWithoutLogs.recordset.length} calls without action logs\n`);

    if (callsWithoutLogs.recordset.length === 0) {
      console.log('✅ All calls already have action logs!');
      return;
    }

    let createdCount = 0;

    for (const callRecord of callsWithoutLogs.recordset) {
      const callId = callRecord.call_id;

      try {
        // Fetch call details
        const callDetails = await pool.request()
          .input('CallId', sql.Int, callId)
          .query(`
            SELECT call_id, created_at, updated_at, status_id, sub_status_id, assigned_tech_id, call_type
            FROM calls
            WHERE call_id = @CallId
          `);

        if (callDetails.recordset.length === 0) continue;

        const call = callDetails.recordset[0];

        // Create initial action log entry for call creation
        await pool.request()
          .input('EntityType', sql.NVarChar, 'Call')
          .input('EntityId', sql.Int, callId)
          .input('UserId', sql.Int, 1) // System user
          .input('NewStatusId', sql.Int, call.status_id || null)
          .input('NewSubStatusId', sql.Int, call.sub_status_id || null)
          .input('Remarks', sql.NVarChar, `Call created via ${call.call_type || 'system'}`)
          .input('ActionAt', sql.DateTime, call.created_at || new Date())
          .query(`
            INSERT INTO action_logs (entity_type, entity_id, user_id, action_user_role_id, old_status_id, new_status_id, old_substatus_id, new_substatus_id, remarks, action_at, created_at, updated_at)
            VALUES (@EntityType, @EntityId, @UserId, NULL, NULL, @NewStatusId, NULL, @NewSubStatusId, @Remarks, @ActionAt, GETDATE(), GETDATE())
          `);

        console.log(`✅ Call ${callId}: Created action log entry for call creation`);
        createdCount++;

        // If technician was assigned, create an additional log entry
        if (call.assigned_tech_id) {
          const techDetails = await pool.request()
            .input('TechId', sql.Int, call.assigned_tech_id)
            .query(`SELECT technician_id, name FROM technicians WHERE technician_id = @TechId`);

          if (techDetails.recordset.length > 0) {
            const tech = techDetails.recordset[0];
            
            await pool.request()
              .input('EntityType', sql.NVarChar, 'Call')
              .input('EntityId', sql.Int, callId)
              .input('UserId', sql.Int, 1)
              .input('OldStatusId', sql.Int, null)
              .input('NewStatusId', sql.Int, call.status_id || null)
              .input('OldSubStatusId', sql.Int, null)
              .input('NewSubStatusId', sql.Int, call.sub_status_id || null)
              .input('Remarks', sql.NVarChar, `Assigned to technician: ${tech.name}`)
              .input('ActionAt', sql.DateTime, call.updated_at || new Date())
              .query(`
                INSERT INTO action_logs (entity_type, entity_id, user_id, action_user_role_id, old_status_id, new_status_id, old_substatus_id, new_substatus_id, remarks, action_at, created_at, updated_at)
                VALUES (@EntityType, @EntityId, @UserId, NULL, @OldStatusId, @NewStatusId, @OldSubStatusId, @NewSubStatusId, @Remarks, @ActionAt, GETDATE(), GETDATE())
              `);

            console.log(`✅ Call ${callId}: Created action log entry for technician assignment to ${tech.name}`);
            createdCount++;
          }
        }

      } catch (callErr) {
        console.error(`❌ Error backfilling logs for call ${callId}:`, callErr.message);
        continue;
      }
    }

    console.log(`\n📊 Summary: Created ${createdCount} action log entries`);
    console.log('✅ Action log backfill complete!');

  } catch (err) {
    console.error('❌ Fatal error during backfill:', err);
  }
}

// Run the backfill
backfillActionLogs().then(() => {
  console.log('\n🎉 Done!');
  process.exit(0);
}).catch(err => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
