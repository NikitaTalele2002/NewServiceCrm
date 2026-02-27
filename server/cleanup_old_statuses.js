/**
 * Clean up old statuses - keep only: open, pending, closed, cancelled
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

async function cleanupOldStatuses() {
  try {
    console.log('🔄 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Statuses to keep (case-insensitive)
    const statusesToKeep = ['open', 'pending', 'closed', 'cancelled'];

    // First, get all statuses
    console.log('📋 Fetching all statuses from database...\n');
    const allStatuses = await sequelize.query(
      `SELECT status_id, status_name FROM [status] ORDER BY status_id`,
      { type: sequelize.QueryTypes.SELECT }
    );

    // Identify statuses to delete
    const statusesToDelete = allStatuses.filter(
      status => !statusesToKeep.map(s => s.toLowerCase()).includes(status.status_name.toLowerCase())
    );

    if (statusesToDelete.length === 0) {
      console.log('✅ No old statuses to delete. Database is clean!');
    } else {
      console.log(`⚠️  Found ${statusesToDelete.length} old statuses to remove:\n`);
      
      for (const status of statusesToDelete) {
        console.log(`   🗑️  Deleting "${status.status_name}" (ID: ${status.status_id})`);
        
        // First, delete action_log entries that reference this status
        const actionLogs = await sequelize.query(
          `SELECT COUNT(*) as count FROM [action_logs] 
           WHERE [old_status_id] = ? OR [new_status_id] = ?`,
          {
            replacements: [status.status_id, status.status_id],
            type: sequelize.QueryTypes.SELECT
          }
        );

        if (actionLogs[0].count > 0) {
          await sequelize.query(
            `DELETE FROM [action_logs] WHERE [old_status_id] = ? OR [new_status_id] = ?`,
            { replacements: [status.status_id, status.status_id] }
          );
          console.log(`      └─ Deleted ${actionLogs[0].count} action log entries`);
        }

        // Delete sub-statuses and their action log dependencies
        const subStatuses = await sequelize.query(
          `SELECT sub_status_id FROM [sub_status] WHERE status_id = ?`,
          {
            replacements: [status.status_id],
            type: sequelize.QueryTypes.SELECT
          }
        );

        if (subStatuses.length > 0) {
          // Delete action logs referencing these sub-statuses too
          await sequelize.query(
            `DELETE FROM [action_logs] 
             WHERE [old_substatus_id] IN (SELECT sub_status_id FROM [sub_status] WHERE status_id = ?)
             OR [new_substatus_id] IN (SELECT sub_status_id FROM [sub_status] WHERE status_id = ?)`,
            { replacements: [status.status_id, status.status_id] }
          );

          await sequelize.query(
            `DELETE FROM [sub_status] WHERE status_id = ?`,
            { replacements: [status.status_id] }
          );
          console.log(`      └─ Deleted ${subStatuses.length} sub-status(es)`);
        }

        // Finally, delete the status itself
        await sequelize.query(
          `DELETE FROM [status] WHERE status_id = ?`,
          { replacements: [status.status_id] }
        );
      }

      console.log(`\n✅ Deleted ${statusesToDelete.length} old status(es)\n`);
    }

    // Show final summary
    console.log('📊 Final Status Summary:');
    const finalStatuses = await sequelize.query(
      `SELECT s.status_id, s.status_name, COUNT(ss.sub_status_id) as sub_status_count
       FROM [status] s
       LEFT JOIN [sub_status] ss ON s.status_id = ss.status_id
       GROUP BY s.status_id, s.status_name
       ORDER BY s.status_id`,
      { type: sequelize.QueryTypes.SELECT }
    );

    console.log('\n✅ All Remaining Statuses and Sub-statuses:\n');
    for (const status of finalStatuses) {
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

    console.log('\n\n✅ Cleanup completed successfully!');
    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Critical Error:', err.message);
    console.error('Details:', err);
    await sequelize.close();
    process.exit(1);
  }
}

cleanupOldStatuses();
