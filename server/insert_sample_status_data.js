/**
 * Script to insert sample data into status and sub_status tables
 */

import { config } from 'dotenv';
import { Sequelize } from 'sequelize';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Sequelize
const sequelize = new Sequelize(
  process.env.DB_NAME || 'NewCRM',
  process.env.DB_USER || 'sa',
  process.env.DB_PASSWORD || 'Harsh@1234',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 1433,
    dialect: 'mssql',
    dialectOptions: {
      authentication: {
        type: 'default',
        options: {
          userName: process.env.DB_USER || 'sa',
          password: process.env.DB_PASSWORD || 'Harsh@1234'
        }
      }
    },
    logging: false
  }
);

async function insertSampleData() {
  try {
    console.log('🔄 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Check if status table has data
    const statusCount = await sequelize.query(
      'SELECT COUNT(*) as count FROM status',
      { type: sequelize.QueryTypes.SELECT, raw: true }
    );

    console.log(`📊 Current status records: ${statusCount[0].count}`);

    if (statusCount[0].count === 0) {
      console.log('📝 Inserting sample status data...');
      try {
        await sequelize.query(`
          INSERT INTO [status] ([status_name], [created_at], [updated_at])
          VALUES
          ('Open', GETDATE(), GETDATE()),
          ('In Progress', GETDATE(), GETDATE()),
          ('Completed', GETDATE(), GETDATE()),
          ('Cancelled', GETDATE(), GETDATE()),
          ('On Hold', GETDATE(), GETDATE())
        `);
        console.log('✅ Status data inserted');
      } catch (insertErr) {
        console.error('❌ Error inserting status:', insertErr.message);
        console.error('Error details:', insertErr);
        throw insertErr;
      }
    }

    // Check if sub_status table has data
    const subStatusCount = await sequelize.query(
      'SELECT COUNT(*) as count FROM sub_status',
      { type: sequelize.QueryTypes.SELECT, raw: true }
    );

    console.log(`📊 Current sub_status records: ${subStatusCount[0].count}`);

    if (subStatusCount[0].count === 0) {
      console.log('📝 Inserting sample sub_status data...');
      try {
        // Get the status_id for 'Open' status
        const openStatus = await sequelize.query(
          "SELECT TOP 1 status_id FROM status WHERE status_name = 'Open'",
          { type: sequelize.QueryTypes.SELECT, raw: true }
        );
        
        const openStatusId = openStatus[0]?.status_id || 1;
        console.log(`Using status_id ${openStatusId} for sub_status inserts`);

        await sequelize.query(`
          INSERT INTO [sub_status] ([status_id], [sub_status_name], [created_at], [updated_at])
          VALUES
          (${openStatusId}, 'Pending Assignment', GETDATE(), GETDATE()),
          (${openStatusId}, 'Assigned', GETDATE(), GETDATE()),
          (${openStatusId}, 'Technician Visited', GETDATE(), GETDATE()),
          (${openStatusId}, 'Parts Required', GETDATE(), GETDATE()),
          (${openStatusId}, 'Resolved', GETDATE(), GETDATE())
        `);
        console.log('✅ Sub_status data inserted');
      } catch (insertErr) {
        console.error('❌ Error inserting sub_status:', insertErr.message);
        throw insertErr;
      }
    }

    // Display all status records
    console.log('\n📋 Current Status Records:');
    const statuses = await sequelize.query(
      'SELECT * FROM status ORDER BY status_id',
      { type: sequelize.QueryTypes.SELECT, raw: true }
    );
    console.table(statuses);

    console.log('\n📋 Current Sub_Status Records:');
    const subStatuses = await sequelize.query(
      'SELECT * FROM sub_status ORDER BY sub_status_id',
      { type: sequelize.QueryTypes.SELECT, raw: true }
    );
    console.table(subStatuses);

    console.log('\n✅ Sample data setup complete!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

insertSampleData();
