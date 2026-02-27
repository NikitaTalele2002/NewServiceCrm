import { poolPromise } from './db.js';
import sql from 'mssql';

async function backfillTechnicianAssignments() {
  try {
    const pool = await poolPromise;

    console.log('🔄 Backfilling missing technician assignment action logs...\n');

    // Find calls with assigned technicians but no technician assignment log entries
    const callsWithTechs = await pool.request().query(`
      SELECT 
        c.call_id,
        c.status_id,
        c.sub_status_id,
        c.assigned_tech_id,
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

    console.log(`📋 Found ${callsWithTechs.recordset.length} calls with assigned technicians but no assignment logs\n`);

    let createdCount = 0;

    for (const call of callsWithTechs.recordset) {
      try {
        // Use a time after service center assignment (10 seconds after creation)
        const assignmentTime = new Date(call.updated_at || new Date());
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

        console.log(`✅ Call ${call.call_id}: Added technician assignment log (${call.tech_name})`);
        createdCount++;

      } catch (err) {
        console.error(`❌ Error processing call ${call.call_id}:`, err.message);
        continue;
      }
    }

    console.log(`\n📊 Created ${createdCount} technician assignment log entries`);
    console.log('✅ Technician assignment backfill complete!');

  } catch (err) {
    console.error('❌ Fatal error:', err);
  }
}

backfillTechnicianAssignments().then(() => {
  console.log('\n🎉 Done!');
  process.exit(0);
}).catch(err => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
