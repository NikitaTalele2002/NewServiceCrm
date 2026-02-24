#!/usr/bin/env node

/**
 * Complaint Registration Verification Script
 * Connects directly to SQL Server and checks for registered complaints
 */

const sql = require('mssql');

const config = {
  user: 'sa',
  password: 'root@123',
  server: '127.0.0.1',
  port: 1433,
  database: 'crm_db',
  authentication: {
    type: 'default',
    options: {
      userName: 'sa',
      password: 'root@123'
    }
  },
  options: {
    encrypt: true,
    trustServerCertificate: true,
    enableKeepAlive: true
  }
};

console.log('\n📋 Complaint Registration Verification');
console.log('======================================\n');

async function checkComplaintStatus() {
  let pool = null;
  
  try {
    console.log('🔄 Connecting to SQL Server...');
    pool = new sql.ConnectionPool(config);
    await pool.connect();
    console.log('✅ Connected to database\n');

    // Get latest complaints
    console.log('📊 Fetching latest registered complaints...\n');
    
    const result = await pool.request()
      .query(`
        SELECT TOP 10
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
      `);

    const complaints = result.recordset;

    if (complaints && complaints.length > 0) {
      console.log(`✅ SUCCESS! Found ${complaints.length} registered complaint(s):\n`);
      
      complaints.forEach((complaint, i) => {
        console.log(`📌 Complaint #${i + 1}`);
        console.log(`   ├─ Call ID: ${complaint.call_id}`);
        console.log(`   ├─ Customer ID: ${complaint.customer_id}`);
        console.log(`   ├─ Product ID: ${complaint.customer_product_id}`);
        console.log(`   ├─ Type: ${complaint.call_type}`);
        console.log(`   ├─ Source: ${complaint.call_source}`);
        console.log(`   ├─ Remark: ${complaint.remark?.substring(0, 50)}${complaint.remark?.length > 50 ? '...' : ''}`);
        console.log(`   ├─ Visit Date: ${complaint.visit_date}`);
        console.log(`   ├─ Visit Time: ${complaint.visit_time}`);
        console.log(`   ├─ Status ID: ${complaint.status_id}`);
        console.log(`   ├─ Created: ${complaint.created_at}`);
        console.log(`   └─ Updated: ${complaint.updated_at}\n`);
      });

      // Get total count
      const countResult = await pool.request()
        .query('SELECT COUNT(*) as total FROM calls');
      
      console.log(`📈 Total complaints in database: ${countResult.recordset[0].total}`);

      // Check today's registrations
      const todayResult = await pool.request()
        .query(`
          SELECT COUNT(*) as today_count FROM calls
          WHERE CAST(created_at AS DATE) = CAST(GETDATE() AS DATE)
        `);
      
      console.log(`📅 Registered today: ${todayResult.recordset[0].today_count}\n`);

      console.log('✅ Complaint registration is WORKING\n');
      return true;

    } else {
      console.log('⚠️ WARNING: No complaints found in database yet\n');
      console.log('Next steps:');
      console.log('1. Make sure the server is running (npm start)');
      console.log('2. Try registering a complaint from the UI');
      console.log('3. Run this script again to check\n');
      return false;
    }

  } catch (err) {
    console.error('❌ ERROR:');
    console.error(`   Message: ${err.message}`);
    
    if (err.code === 'ELOGIN') {
      console.error('\n   → Database login failed. Check credentials:');
      console.error('      - Username: sa');
      console.error('      - Password: root@123');
      console.error('      - Server: 127.0.0.1:1433');
      console.error('      - Database: crm_db');
    } else if (err.code === 'ENOTOPEN') {
      console.error('\n   → Cannot connect to SQL Server. Is it running?');
      console.error('   → Start SQL Server and try again');
    } else {
      console.error(`\n   Error Code: ${err.code}`);
    }
    
    return false;

  } finally {
    if (pool) {
      await pool.close();
      console.log('🔒 Database connection closed');
    }
  }
}

// Run the check
checkComplaintStatus()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('\n🔴 Unexpected error:', err);
    process.exit(1);
  });
