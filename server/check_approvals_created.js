import { sequelize } from './db.js';

async function checkApprovalsTable() {
  try {
    console.log('🔍 Checking Approvals Table Records\n');
    console.log('═'.repeat(70));

    // Get total count of approvals
    const totalCount = await sequelize.query(`
      SELECT COUNT(*) as total FROM approvals
    `, { type: sequelize.QueryTypes.SELECT });

    console.log(`\n📊 Total approval records: ${totalCount[0].total}`);

    // Get records by entity type
    console.log(`\n📋 Approvals by Entity Type:`);
    const byType = await sequelize.query(`
      SELECT entity_type, approval_status, COUNT(*) as count
      FROM approvals
      GROUP BY entity_type, approval_status
      ORDER BY entity_type, approval_status
    `, { type: sequelize.QueryTypes.SELECT });

    if (byType.length === 0) {
      console.log('  ⚠️  No approval records found');
    } else {
      byType.forEach(record => {
        console.log(`  - ${record.entity_type}: ${record.approval_status} (${record.count} records)`);
      });
    }

    // Get recent approvals
    console.log(`\n📅 Recent Approval Records (Last 10):`);
    const recent = await sequelize.query(`
      SELECT TOP 10
        approval_id,
        entity_type,
        entity_id,
        approval_status,
        approval_remarks,
        approved_at,
        created_at
      FROM approvals
      ORDER BY created_at DESC
    `, { type: sequelize.QueryTypes.SELECT });

    if (recent.length === 0) {
      console.log('  ⚠️  No approval records found');
    } else {
      recent.forEach(record => {
        console.log(`\n  Approval #${record.approval_id}:`);
        console.log(`    Entity: ${record.entity_type} (ID: ${record.entity_id})`);
        console.log(`    Status: ${record.approval_status}`);
        console.log(`    Remarks: ${record.approval_remarks || 'N/A'}`);
        console.log(`    Approved At: ${record.approved_at || 'N/A'}`);
        console.log(`    Created: ${record.created_at}`);
      });
    }

    // Get approvals by status
    console.log(`\n📊 Approvals by Status:`);
    const byStatus = await sequelize.query(`
      SELECT approval_status, COUNT(*) as count
      FROM approvals
      GROUP BY approval_status
      ORDER BY approval_status
    `, { type: sequelize.QueryTypes.SELECT });

    if (byStatus.length === 0) {
      console.log('  ⚠️  No approval records found');
    } else {
      byStatus.forEach(record => {
        console.log(`  - ${record.approval_status}: ${record.count} records`);
      });
    }

    console.log(`\n✅ Approvals table check complete`);

  } catch (error) {
    console.error('❌ Error checking approvals table:', error.message);
    console.error(error.stack);
  } finally {
    await sequelize.close();
  }
}

checkApprovalsTable();
