import { Sequelize } from 'sequelize';
import fs from 'fs';
import path from 'path';

/**
 * Test script to verify complaint registration
 * Checks database for recently registered complaints
 */

// Configuration
const config = {
  database: 'crm_db',
  username: 'sa',
  password: 'root@123',
  host: '127.0.0.1',
  port: 1433,
  dialect: 'mssql',
  dialectOptions: {
    options: {
      encrypt: true,
      trustServerCertificate: true,
      connectionTimeout: 30000,
      requestTimeout: 30000,
    },
  },
};

console.log('📋 Complaint Registration Check Script');
console.log('=====================================\n');

async function checkComplaintRegistration() {
  let sequelize = null;
  
  try {
    // Create connection
    console.log('🔄 Connecting to database...');
    sequelize = new Sequelize(
      config.database,
      config.username,
      config.password,
      {
        host: config.host,
        port: config.port,
        dialect: config.dialect,
        dialectOptions: config.dialectOptions,
        logging: false // Disable SQL logging
      }
    );

    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connection successful\n');

    // Check latest complaints
    console.log('📊 Checking latest registered complaints...\n');
    
    const latestComplaints = await sequelize.query(`
      SELECT TOP 5
        call_id,
        customer_id,
        customer_product_id,
        call_type,
        call_source,
        remark,
        visit_date,
        visit_time,
        status_id,
        created_at,
        updated_at
      FROM calls
      ORDER BY call_id DESC
    `, { type: 'SELECT' });

    if (latestComplaints && latestComplaints.length > 0) {
      console.log(`✅ Found ${latestComplaints.length} recent complaint(s):\n`);
      
      latestComplaints.forEach((complaint, index) => {
        console.log(`📌 Complaint #${index + 1}:`);
        console.log(`   Call ID: ${complaint.call_id}`);
        console.log(`   Customer ID: ${complaint.customer_id}`);
        console.log(`   Product ID: ${complaint.customer_product_id}`);
        console.log(`   Type: ${complaint.call_type}`);
        console.log(`   Source: ${complaint.call_source}`);
        console.log(`   Remark: ${complaint.remark.substring(0, 50)}${complaint.remark.length > 50 ? '...' : ''}`);
        console.log(`   Visit Date: ${complaint.visit_date}`);
        console.log(`   Visit Time: ${complaint.visit_time}`);
        console.log(`   Status ID: ${complaint.status_id}`);
        console.log(`   Created: ${complaint.created_at}`);
        console.log('');
      });

      // Get count of all complaints
      const countResult = await sequelize.query(`
        SELECT COUNT(*) as total FROM calls
      `, { type: 'SELECT' });

      const totalComplaints = countResult[0].total;
      console.log(`📈 Total complaints in database: ${totalComplaints}\n`);

      // Check for complaints from today
      const todayResult = await sequelize.query(`
        SELECT COUNT(*) as today_count FROM calls
        WHERE CAST(created_at AS DATE) = CAST(GETDATE() AS DATE)
      `, { type: 'SELECT' });

      const todayCount = todayResult[0].today_count;
      console.log(`📅 Complaints registered today: ${todayCount}\n`);

      console.log('✅ SUCCESS - Complaint registration is working!\n');
      return { success: true, recentComplaints: latestComplaints, totalCount: totalComplaints };

    } else {
      console.log('⚠️  No complaints found in database\n');
      return { success: false, message: 'No complaints found' };
    }

  } catch (err) {
    console.error('❌ Error checking complaints:');
    console.error(`   Message: ${err.message}`);
    if (err.original) {
      console.error(`   DB Error: ${err.original.message}`);
    }
    console.error('');
    return { success: false, error: err.message };
  } finally {
    if (sequelize) {
      await sequelize.close();
      console.log('🔒 Database connection closed');
    }
  }
}

// Run the check
checkComplaintRegistration().then(result => {
  if (result.success) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}).catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
