import { poolPromise } from './db.js';
import sql from 'mssql';

async function fixActionLogSequence() {
  try {
    const pool = await poolPromise;

    console.log('🔄 Starting comprehensive action log sequence fix...\n');

    // Step 1: Delete all current action logs for calls with technician assignments
    console.log('Step 1: Cleaning up incorrect action logs...\n');
    
    const callsWithTech = await pool.request().query(`
      SELECT DISTINCT entity_id
      FROM action_logs
      WHERE entity_type = 'Call'
      AND (remarks LIKE '%Assigned to technician%' OR remarks LIKE '%Assigned to Service Center%')
    `);

    console.log(`📋 Found ${callsWithTech.recordset.length} calls with assignment logs\n`);

    // Delete all assignment logs for these calls to rebuild them
    for (const record of callsWithTech.recordset) {
      await pool.request()
        .input('CallId', sql.Int, record.entity_id)
        .query(`
          DELETE FROM action_logs
          WHERE entity_type = 'Call'
          AND entity_id = @CallId
          AND (remarks LIKE '%Assigned to technician%' OR remarks LIKE '%Assigned to Service Center%' OR remarks LIKE '%Call created%')
        `);
    }
    console.log(`✅ Cleaned up ${callsWithTech.recordset.length} calls\n`);

    // Step 2: Now rebuild all action logs in correct sequence with proper timestamps
    console.log('Step 2: Rebuilding action logs with correct sequence...\n');

    // Get all calls with call creation times
    const allCalls = await pool.request().query(`
      SELECT 
        c.call_id,
        c.created_at,
        c.call_source,
        c.customer_id,
        c.status_id,
        c.sub_status_id,
        c.assigned_asc_id,
        c.assigned_tech_id,
        sc.asc_name,
        t.name as tech_name
      FROM calls c
      LEFT JOIN service_centers sc ON sc.asc_id = c.assigned_asc_id
      LEFT JOIN technicians t ON t.technician_id = c.assigned_tech_id
      ORDER BY c.call_id
    `);

    console.log(`📋 Processing ${allCalls.recordset.length} calls...\n`);

    let createdCount = 0, scCount = 0, techCount = 0;

    for (const call of allCalls.recordset) {
      try {
        // 1. Create "Call created" entry at original creation time
        await pool.request()
          .input('EntityType', sql.NVarChar, 'Call')
          .input('EntityId', sql.Int, call.call_id)
          .input('UserId', sql.Int, 1)
          .input('NewStatusId', sql.Int, call.status_id || null)
          .input('NewSubStatusId', sql.Int, call.sub_status_id || null)
          .input('Remarks', sql.NVarChar, `Call created via ${call.call_source || 'unknown'}`)
          .input('ActionAt', sql.DateTime, call.created_at)
          .query(`
            INSERT INTO action_logs (entity_type, entity_id, user_id, action_user_role_id, old_status_id, new_status_id, old_substatus_id, new_substatus_id, remarks, action_at, created_at, updated_at)
            VALUES (@EntityType, @EntityId, @UserId, NULL, NULL, @NewStatusId, NULL, @NewSubStatusId, @Remarks, @ActionAt, @ActionAt, @ActionAt)
          `);
        createdCount++;

        // 2. If assigned to service center, log it at creation + 5 seconds
        if (call.assigned_asc_id) {
          const scTime = new Date(call.created_at);
          scTime.setSeconds(scTime.getSeconds() + 5);

          await pool.request()
            .input('EntityType', sql.NVarChar, 'Call')
            .input('EntityId', sql.Int, call.call_id)
            .input('UserId', sql.Int, 1)
            .input('NewStatusId', sql.Int, call.status_id || null)
            .input('NewSubStatusId', sql.Int, call.sub_status_id || null)
            .input('Remarks', sql.NVarChar, `Assigned to Service Center: ${call.asc_name || 'Unknown'}`)
            .input('ActionAt', sql.DateTime, scTime)
            .query(`
              INSERT INTO action_logs (entity_type, entity_id, user_id, action_user_role_id, old_status_id, new_status_id, old_substatus_id, new_substatus_id, remarks, action_at, created_at, updated_at)
              VALUES (@EntityType, @EntityId, @UserId, NULL, NULL, @NewStatusId, NULL, @NewSubStatusId, @Remarks, @ActionAt, @ActionAt, @ActionAt)
            `);
          scCount++;
        }

        // 3. If assigned to technician, log it at creation + 10 seconds
        if (call.assigned_tech_id) {
          const techTime = new Date(call.created_at);
          techTime.setSeconds(techTime.getSeconds() + 10);

          await pool.request()
            .input('EntityType', sql.NVarChar, 'Call')
            .input('EntityId', sql.Int, call.call_id)
            .input('UserId', sql.Int, 1)
            .input('NewStatusId', sql.Int, call.status_id || null)
            .input('NewSubStatusId', sql.Int, call.sub_status_id || null)
            .input('Remarks', sql.NVarChar, `Assigned to technician: ${call.tech_name || 'Unknown'}`)
            .input('ActionAt', sql.DateTime, techTime)
            .query(`
              INSERT INTO action_logs (entity_type, entity_id, user_id, action_user_role_id, old_status_id, new_status_id, old_substatus_id, new_substatus_id, remarks, action_at, created_at, updated_at)
              VALUES (@EntityType, @EntityId, @UserId, NULL, NULL, @NewStatusId, NULL, @NewSubStatusId, @Remarks, @ActionAt, @ActionAt, @ActionAt)
            `);
          techCount++;
        }

        console.log(`✅ Call ${call.call_id}: Created -> SC (${call.asc_name || 'N/A'}) -> Tech (${call.tech_name || 'N/A'})`);
      } catch (err) {
        console.error(`❌ Error for call ${call.call_id}:`, err.message);
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`  - Call Created Entries: ${createdCount}`);
    console.log(`  - Service Center Assignments: ${scCount}`);
    console.log(`  - Technician Assignments: ${techCount}`);
    console.log('✅ Sequence fix complete!');

  } catch (err) {
    console.error('❌ Fatal error:', err.message);
  }
}

fixActionLogSequence().then(() => {
  console.log('\n🎉 Done! Refresh the browser to see the corrected sequence.');
  process.exit(0);
}).catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
