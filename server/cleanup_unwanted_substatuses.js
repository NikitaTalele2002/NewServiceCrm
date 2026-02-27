/**
 * Clean up unwanted sub-statuses
 * Remove: "pending for rsm approval" and "pending for hod approval" from pending status
 */

import { config } from 'dotenv';
import { Sequelize } from 'sequelize';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Sequelize with correct credentials
const sequelize = new Sequelize(
  process.env.DB_NAME || 'NewCRM',
  process.env.DB_USER || 'crm_user',
  process.env.DB_PASSWORD || 'StrongPassword123!',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 1433,
    dialect: 'mssql',
    dialectOptions: {
      options: {
        instanceName: 'SQLEXPRESS',
        encrypt: false,
        trustServerCertificate: true
      }
    },
    logging: false
  }
);

async function cleanupUnwantedSubstatuses() {
  try {
    console.log('🔄 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Define unwanted sub-statuses to delete (for pending status)
    const unwantedSubstatuses = [
      'pending for rsm approval',
      'pending for hod approval'
    ];

    // Get pending status ID
    const pendingStatus = await sequelize.query(
      `SELECT status_id FROM [status] WHERE LOWER(status_name) = LOWER('pending')`,
      { type: sequelize.QueryTypes.SELECT }
    );

    if (pendingStatus.length === 0) {
      console.log('⚠️  "pending" status not found!');
      await sequelize.close();
      process.exit(0);
    }

    const pendingStatusId = pendingStatus[0].status_id;
    console.log(`📌 Found "pending" status (ID: ${pendingStatusId})\n`);

    // Get all sub-statuses for pending
    const allSubstatuses = await sequelize.query(
      `SELECT sub_status_id, sub_status_name FROM [sub_status] WHERE status_id = ?`,
      {
        replacements: [pendingStatusId],
        type: sequelize.QueryTypes.SELECT
      }
    );

    console.log(`📋 Current sub-statuses for "pending":`);
    allSubstatuses.forEach(ss => {
      console.log(`   - ${ss.sub_status_name} (ID: ${ss.sub_status_id})`);
    });

    // Filter for unwanted ones
    const substatusesToDelete = allSubstatuses.filter(ss =>
      unwantedSubstatuses.map(name => name.toLowerCase()).includes(ss.sub_status_name.toLowerCase())
    );

    if (substatusesToDelete.length === 0) {
      console.log('\n✅ No unwanted sub-statuses found!');
    } else {
      console.log(`\n⚠️  Found ${substatusesToDelete.length} unwanted sub-status(es) to remove:\n`);

      for (const substatus of substatusesToDelete) {
        console.log(`   🗑️  Deleting "${substatus.sub_status_name}" (ID: ${substatus.sub_status_id})`);

        // Delete action_log entries referencing this sub-status
        const actionLogs = await sequelize.query(
          `SELECT COUNT(*) as count FROM [action_logs] 
           WHERE [old_substatus_id] = ? OR [new_substatus_id] = ?`,
          {
            replacements: [substatus.sub_status_id, substatus.sub_status_id],
            type: sequelize.QueryTypes.SELECT
          }
        );

        if (actionLogs[0].count > 0) {
          await sequelize.query(
            `DELETE FROM [action_logs] WHERE [old_substatus_id] = ? OR [new_substatus_id] = ?`,
            { replacements: [substatus.sub_status_id, substatus.sub_status_id] }
          );
          console.log(`      └─ Deleted ${actionLogs[0].count} action log entries`);
        }

        // Delete the sub-status
        await sequelize.query(
          `DELETE FROM [sub_status] WHERE sub_status_id = ?`,
          { replacements: [substatus.sub_status_id] }
        );
      }

      console.log(`\n✅ Deleted ${substatusesToDelete.length} unwanted sub-status(es)\n`);
    }

    // Show final summary
    console.log('📊 Final Status Summary:\n');
    const statuses = await sequelize.query(
      `SELECT s.status_id, s.status_name FROM [status] ORDER BY s.status_id`,
      { type: sequelize.QueryTypes.SELECT }
    );

    console.log('✅ All Statuses and Sub-statuses:\n');
    for (const status of statuses) {
      console.log(`📌 ${status.status_name} (ID: ${status.status_id})`);

      const subStatuses = await sequelize.query(
        `SELECT sub_status_name FROM [sub_status] WHERE status_id = ? ORDER BY sub_status_id`,
        {
          replacements: [status.status_id],
          type: sequelize.QueryTypes.SELECT
        }
      );

      if (subStatuses.length > 0) {
        subStatuses.forEach((ss, idx) => {
          const isLast = idx === subStatuses.length - 1;
          console.log(`   ${isLast ? '└─' : '├─'} ${ss.sub_status_name}`);
        });
      } else {
        console.log('   (no sub-statuses)');
      }
    }

    console.log('\n\n✅ Sub-status cleanup completed successfully!');
    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Critical Error:', err.message);
    console.error('Details:', err);
    await sequelize.close();
    process.exit(1);
  }
}

cleanupUnwantedSubstatuses();
