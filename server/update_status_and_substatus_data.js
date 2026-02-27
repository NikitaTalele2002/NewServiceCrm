/**
 * Update status and sub_status data with revised structure
 */

import { config } from 'dotenv';
import { Sequelize } from 'sequelize';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Sequelize
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

async function updateStatusAndSubStatusData() {
  try {
    console.log('🔄 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    // Define the updated status structure with sub-statuses
    const statusData = [
      {
        status_name: 'open',
        sub_statuses: [
          'assigned to the service center',
          'assigned to the technician'
        ]
      },
      {
        status_name: 'pending',
        sub_statuses: [
          'pending for spares',
          'pending for replacement'
        ]
      },
      {
        status_name: 'closed',
        sub_statuses: [
          'repair closed',
          'replacement closed'
        ]
      },
      {
        status_name: 'cancelled',
        sub_statuses: []
      }
    ];

    console.log('📋 Updated status structure:');
    statusData.forEach(status => {
      console.log(`\n  📌 ${status.status_name}`);
      if (status.sub_statuses.length > 0) {
        status.sub_statuses.forEach(subStatus => {
          console.log(`     └─ ${subStatus}`);
        });
      } else {
        console.log('     (no sub-statuses)');
      }
    });

    // Process each status
    for (const statusItem of statusData) {
      try {
        // Check if status already exists
        const existingStatus = await sequelize.query(
          `SELECT status_id FROM [status] WHERE LOWER(status_name) = LOWER(?)`,
          {
            replacements: [statusItem.status_name],
            type: sequelize.QueryTypes.SELECT,
            raw: true
          }
        );

        let statusId;

        if (existingStatus.length > 0) {
          statusId = existingStatus[0].status_id;
          console.log(`\n✅ Status "${statusItem.status_name}" exists (ID: ${statusId})`);
        } else {
          // Insert new status
          const result = await sequelize.query(
            `INSERT INTO [status] ([status_name], [created_at], [updated_at]) 
             VALUES (?, GETDATE(), GETDATE());
             SELECT SCOPE_IDENTITY() as id;`,
            {
              replacements: [statusItem.status_name],
              type: sequelize.QueryTypes.SELECT,
              raw: true
            }
          );
          statusId = result[0].id;
          console.log(`\n✅ Status "${statusItem.status_name}" inserted (ID: ${statusId})`);
        }

        // Insert sub-statuses if they exist
        if (statusItem.sub_statuses.length > 0) {
          for (const subStatusName of statusItem.sub_statuses) {
            try {
              // Check if sub-status already exists
              const existingSubStatus = await sequelize.query(
                `SELECT sub_status_id FROM [sub_status] 
                 WHERE status_id = ? AND LOWER(sub_status_name) = LOWER(?)`,
                {
                  replacements: [statusId, subStatusName],
                  type: sequelize.QueryTypes.SELECT,
                  raw: true
                }
              );

              if (existingSubStatus.length > 0) {
                console.log(`   ✅ Sub-status "${subStatusName}" already exists`);
              } else {
                await sequelize.query(
                  `INSERT INTO [sub_status] ([status_id], [sub_status_name], [created_at], [updated_at]) 
                   VALUES (?, ?, GETDATE(), GETDATE())`,
                  {
                    replacements: [statusId, subStatusName]
                  }
                );
                console.log(`   ✅ Sub-status "${subStatusName}" inserted`);
              }
            } catch (subErr) {
              console.error(`   ❌ Error inserting sub-status "${subStatusName}":`, subErr.message);
            }
          }
        }
      } catch (err) {
        console.error(`\n❌ Error processing status "${statusItem.status_name}":`, err.message);
      }
    }

    console.log('\n\n📊 Final data summary:');
    const allStatuses = await sequelize.query(
      `SELECT s.status_id, s.status_name, COUNT(ss.sub_status_id) as sub_status_count
       FROM [status] s
       LEFT JOIN [sub_status] ss ON s.status_id = ss.status_id
       GROUP BY s.status_id, s.status_name
       ORDER BY s.status_id`,
      { type: sequelize.QueryTypes.SELECT }
    );

    console.log('\n✅ All Statuses with Sub-statuses:');
    for (const status of allStatuses) {
      console.log(`\n📌 ${status.status_name} (ID: ${status.status_id})`);
      
      const subStatuses = await sequelize.query(
        `SELECT sub_status_name FROM [sub_status] WHERE status_id = ? ORDER BY sub_status_id`,
        {
          replacements: [status.status_id],
          type: sequelize.QueryTypes.SELECT,
          raw: true
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

    console.log('\n\n✅ Update completed successfully!');
    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Critical Error:', err.message);
    console.error('Details:', err);
    await sequelize.close();
    process.exit(1);
  }
}

updateStatusAndSubStatusData();
