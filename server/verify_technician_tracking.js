import { connectDB, sequelize } from './db.js';
import {
  Calls,
  CallSpareUsage,
  TATTracking,
  TATHolds,
} from './models/index.js';

/**
 * Verification script to test the technician tracking data and API readiness
 */
async function verifyTechnicianTracking() {
  try {
    console.log('🔄 Connecting to database...');
    await connectDB();
    console.log('✓ Database connected\n');

    // 1. Count records in each table
    console.log('📊 Database Statistics:');
    console.log('═'.repeat(60));

    const spareCount = await CallSpareUsage.count();
    const tatCount = await TATTracking.count();
    const holdCount = await TATHolds.count();

    console.log(`✓ Spare Consumption Records (call_spare_usage): ${spareCount}`);
    console.log(`✓ TAT Tracking Records (tat_tracking):       ${tatCount}`);
    console.log(`✓ TAT Hold Records (tat_holds):             ${holdCount}`);

    // 2. Get sample data from each table
    console.log('\n📋 Sample Data:');
    console.log('═'.repeat(60));

    // Get spare consumption sample (using raw join without assuming table name)
    const [spareData] = await sequelize.query(`
      SELECT TOP 3
        csu.usage_id,
        csu.call_id,
        csu.spare_part_id,
        'Spare Part ' + CAST(csu.spare_part_id as nvarchar(10)) as spare_name,
        csu.issued_qty,
        csu.used_qty,
        csu.usage_status,
        u.name as technician_name
      FROM call_spare_usage csu
      LEFT JOIN users u ON csu.used_by_tech_id = u.user_id
      ORDER BY csu.created_at DESC
    `);

    if (spareData.length > 0) {
      console.log('\n🔧 Recent Spare Consumption:');
      spareData.forEach((row, idx) => {
        console.log(`  ${idx + 1}. Call #${row.call_id} | Spare: ${row.spare_name} | Used: ${row.used_qty}/${row.issued_qty} | Tech: ${row.technician_name || 'N/A'}`);
      });
    }

    // Get TAT tracking sample
    const [tatData] = await sequelize.query(`
      SELECT TOP 3
        tt.id,
        tt.call_id,
        tt.tat_status,
        DATEDIFF(MINUTE, tt.tat_start_time, ISNULL(tt.tat_end_time, GETDATE())) as elapsed_minutes,
        tt.total_hold_minutes
      FROM tat_tracking tt
      ORDER BY tt.created_at DESC
    `);

    if (tatData.length > 0) {
      console.log('\n⏱️  Recent TAT Tracking:');
      tatData.forEach((row, idx) => {
        console.log(`  ${idx + 1}. Call #${row.call_id} | Status: ${row.tat_status} | Elapsed: ${row.elapsed_minutes}min | On-Hold: ${row.total_hold_minutes}min`);
      });
    }

    // Get TAT holds sample
    const [holdData] = await sequelize.query(`
      SELECT TOP 3
        th.tat_holds_id,
        th.call_id,
        th.hold_reason,
        CASE WHEN th.hold_end_time IS NULL THEN 'ACTIVE' ELSE 'RESOLVED' END as hold_status,
        ISNULL(DATEDIFF(MINUTE, th.hold_start_time, th.hold_end_time),
               DATEDIFF(MINUTE, th.hold_start_time, GETDATE())) as hold_duration_minutes
      FROM tat_holds th
      ORDER BY th.created_at DESC
    `);

    if (holdData.length > 0) {
      console.log('\n🛑 Recent TAT Holds:');
      holdData.forEach((row, idx) => {
        console.log(`  ${idx + 1}. Call #${row.call_id} | Reason: ${row.hold_reason} | Status: ${row.hold_status} | Duration: ${row.hold_duration_minutes}min`);
      });
    }

    // 3. Get call summary data
    console.log('\n📞 Call Coverage:');
    console.log('═'.repeat(60));

    const [callSummary] = await sequelize.query(`
      SELECT 
        c.call_id,
        c.ref_call_id,
        COUNT(DISTINCT csu.usage_id) as spares_consumed,
        CASE WHEN tt.id IS NOT NULL THEN 'Yes' ELSE 'No' END as has_tat_tracking,
        COUNT(DISTINCT th.tat_holds_id) as hold_count
      FROM calls c
      LEFT JOIN call_spare_usage csu ON c.call_id = csu.call_id
      LEFT JOIN tat_tracking tt ON c.call_id = tt.call_id
      LEFT JOIN tat_holds th ON c.call_id = th.call_id
      GROUP BY c.call_id, c.ref_call_id, tt.id
      ORDER BY c.call_id DESC
    `);

    console.log('\nCalls with tracking data:');
    callSummary.forEach(call => {
      console.log(
        `  • Call #${call.call_id} | Spares: ${call.spares_consumed} | TAT: ${call.has_tat_tracking} | Holds: ${call.hold_count}`
      );
    });

    // 4. API Endpoint Testing Info
    console.log('\n🌐 Available API Endpoints:');
    console.log('═'.repeat(60));

    const endpoints = [
      'GET    /api/technician-tracking/spare-consumption',
      'GET    /api/technician-tracking/spare-consumption/call/:callId',
      'POST   /api/technician-tracking/spare-consumption',
      'GET    /api/technician-tracking/tat-tracking',
      'GET    /api/technician-tracking/tat-tracking/call/:callId',
      'POST   /api/technician-tracking/tat-tracking',
      'GET    /api/technician-tracking/tat-holds',
      'GET    /api/technician-tracking/tat-holds/call/:callId',
      'POST   /api/technician-tracking/tat-holds',
      'PUT    /api/technician-tracking/tat-holds/:holdId/resolve',
      'GET    /api/technician-tracking/summary/:callId',
    ];

    endpoints.forEach(endpoint => {
      console.log(`  ✓ ${endpoint}`);
    });

    // 5. Data Quality Metrics
    console.log('\n✅ Data Quality Check:');
    console.log('═'.repeat(60));

    const [dataQuality] = await sequelize.query(`
      SELECT
        COUNT(DISTINCT csu.call_id) as calls_with_spares,
        COUNT(DISTINCT tt.call_id) as calls_with_tat,
        COUNT(DISTINCT th.call_id) as calls_with_holds,
        SUM(CASE WHEN csu.usage_status = 'USED' THEN 1 ELSE 0 END) as spares_fully_used,
        SUM(CASE WHEN csu.usage_status = 'PARTIAL' THEN 1 ELSE 0 END) as spares_partially_used,
        SUM(CASE WHEN csu.usage_status = 'NOT_USED' THEN 1 ELSE 0 END) as spares_unused
      FROM call_spare_usage csu
      LEFT JOIN tat_tracking tt ON csu.call_id = tt.call_id
      LEFT JOIN tat_holds th ON csu.call_id = th.call_id
    `);

    const metrics = dataQuality[0];
    console.log(`✓ Calls with spare consumption data:  ${metrics.calls_with_spares}`);
    console.log(`✓ Calls with TAT tracking:           ${metrics.calls_with_tat}`);
    console.log(`✓ Calls with TAT holds:             ${metrics.calls_with_holds}`);
    console.log(`✓ Spares fully consumed:            ${metrics.spares_fully_used || 0}`);
    console.log(`✓ Spares partially consumed:        ${metrics.spares_partially_used || 0}`);
    console.log(`✓ Spares unused:                    ${metrics.spares_unused || 0}`);

    // 6. Summary
    console.log('\n✅ Verification Complete!');
    console.log('═'.repeat(60));
    console.log(`Total Records Created: ${spareCount + tatCount + holdCount}`);
    console.log('\n📝 Next Steps:');
    console.log('  1. Start the server: npm run dev');
    console.log('  2. Test an endpoint: curl http://localhost:5000/api/technician-tracking/spare-consumption');
    console.log('  3. View full call details: curl http://localhost:5000/api/technician-tracking/summary/1');
    console.log('  4. Add more data: node insert_technician_spare_consumption_data.js\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Verification failed:', err.message);
    console.error('\nStack:', err.stack);
    process.exit(1);
  }
}

verifyTechnicianTracking();
