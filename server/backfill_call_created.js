import { poolPromise } from './db.js';
import sql from 'mssql';

async function backfillCallCreated() {
  try {
    const pool = await poolPromise;

    console.log('🔄 Starting "Call Created" action log backfill...\n');

    // Find all calls that don't have a "Call created" log
    const callsNeedingCreationLog = await pool.request().query(`
      SELECT 
        c.call_id,
        c.call_source,
        c.created_at,
        c.status_id,
        c.sub_status_id,
        c.customer_id
      FROM calls c
      WHERE NOT EXISTS (
        SELECT 1 FROM action_logs al
        WHERE al.entity_type = 'Call'
        AND al.entity_id = c.call_id
        AND al.remarks LIKE '%Call created%'
      )
      ORDER BY c.call_id
    `);

    console.log(`📋 Found ${callsNeedingCreationLog.recordset.length} calls needing "Call created" logs\n`);

    let createdCount = 0;
    for (const call of callsNeedingCreationLog.recordset) {
      try {
        await pool.request()
          .input('EntityType', sql.NVarChar, 'Call')
          .input('EntityId', sql.Int, call.call_id)
          .input('UserId', sql.Int, 1)
          .input('OldStatusId', sql.Int, null)
          .input('NewStatusId', sql.Int, call.status_id || null)
          .input('OldSubStatusId', sql.Int, null)
          .input('NewSubStatusId', sql.Int, call.sub_status_id || null)
          .input('Remarks', sql.NVarChar, `Call created via ${call.call_source || 'unknown'} for customer ${call.customer_id}`)
          .input('ActionAt', sql.DateTime, call.created_at)
          .query(`
            INSERT INTO action_logs (entity_type, entity_id, user_id, action_user_role_id, old_status_id, new_status_id, old_substatus_id, new_substatus_id, remarks, action_at, created_at, updated_at)
            VALUES (@EntityType, @EntityId, @UserId, NULL, @OldStatusId, @NewStatusId, @OldSubStatusId, @NewSubStatusId, @Remarks, @ActionAt, GETDATE(), GETDATE())
          `);

        console.log(`✅ Call ${call.call_id}: Call created via ${call.call_source || 'unknown'}`);
        createdCount++;
      } catch (err) {
        console.error(`❌ Error for call ${call.call_id}:`, err.message);
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`  - Call Created Entries Added: ${createdCount}`);
    console.log('✅ Backfill complete!');

  } catch (err) {
    console.error('❌ Fatal error:', err.message);
  }
}

backfillCallCreated().then(() => {
  console.log('\n🎉 Done!');
  process.exit(0);
}).catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
