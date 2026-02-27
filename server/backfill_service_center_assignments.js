import { poolPromise } from './db.js';
import sql from 'mssql';

async function backfillServiceCenterAssignments() {
  try {
    const pool = await poolPromise;

    console.log('🔄 Backfilling missing service center assignment action logs...\n');

    // Find calls with assigned service centers but no service center assignment log entries
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
    console.log(`📋 Found ${callsWithSC.recordset.length} calls with assigned service centers but no assignment logs\n`);

    let createdCount = 0;

    for (const call of callsWithSC.recordset) {
      try {
        // Use a time slightly after creation for the assignment
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

        console.log(`✅ Call ${call.call_id}: Added service center assignment log (${call.asc_name})`);
        createdCount++;

      } catch (err) {
        console.error(`❌ Error processing call ${call.call_id}:`, err.message);
        continue;
      }
    }

    console.log(`\n📊 Created ${createdCount} service center assignment log entries`);
    console.log('✅ Service center assignment backfill complete!');

  } catch (err) {
    console.error('❌ Fatal error:', err);
  }
}

backfillServiceCenterAssignments().then(() => {
  console.log('\n🎉 Done!');
  process.exit(0);
}).catch(err => {
  console.error('Backfill failed:', err);
  process.exit(1);
});
