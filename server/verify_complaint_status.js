#!/usr/bin/env node

/**
 * Complaint Registration Verification Script
 * Connects to SQL Server and checks for registered complaints
 */

import sql from 'mssql';

const config = {
  user: 'crm_user',
  password: 'StrongPassword123!',
  server: 'localhost',
  port: 1433,
  database: 'NewCRM',
  authentication: {
    type: 'default',
    options: {
      userName: 'crm_user',
      password: 'StrongPassword123!'
    }
  },
  options: {
    instanceName: 'SQLEXPRESS',
    encrypt: false,
    trustServerCertificate: true,
    enableKeepAlive: true,
    connectionTimeout: 30000,
    requestTimeout: 30000
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
    
    // First, get the actual columns from the table
    const columnsResult = await pool.request()
      .query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_NAME = 'calls'
        ORDER BY ORDINAL_POSITION
      `);
    
    const columns = columnsResult.recordset.map(r => r.COLUMN_NAME);
    console.log(`📋 Available columns in calls table: ${columns.join(', ')}\n`);
    
    // Now query with dynamic columns
    const result = await pool.request()
      .query(`
        SELECT TOP 10 *
        FROM calls
        ORDER BY call_id DESC
      `);

    const complaints = result.recordset;

    if (complaints && complaints.length > 0) {
      console.log(`✅ SUCCESS! Found ${complaints.length} registered complaint(s):\n`);
      
      complaints.forEach((complaint, i) => {
        console.log(`📌 Complaint #${i + 1}`);
        console.log(`   ├─ Call ID: ${complaint.call_id}`);
        if (complaint.customer_id) console.log(`   ├─ Customer ID: ${complaint.customer_id}`);
        if (complaint.customer_product_id) console.log(`   ├─ Product ID: ${complaint.customer_product_id}`);
        if (complaint.call_type) console.log(`   ├─ Type: ${complaint.call_type}`);
        if (complaint.call_source) console.log(`   ├─ Source: ${complaint.call_source}`);
        if (complaint.remark) console.log(`   ├─ Remark: ${complaint.remark.substring(0, 50)}${complaint.remark.length > 50 ? '...' : ''}`);
        if (complaint.visit_date) console.log(`   ├─ Visit Date: ${complaint.visit_date}`);
        if (complaint.visit_time) console.log(`   ├─ Visit Time: ${complaint.visit_time}`);
        if (complaint.appointed_time) console.log(`   ├─ Appointed Time: ${complaint.appointed_time}`);
        if (complaint.status_id) console.log(`   ├─ Status ID: ${complaint.status_id}`);
        if (complaint.created_at) console.log(`   ├─ Created: ${complaint.created_at}`);
        if (complaint.updated_at) console.log(`   └─ Updated: ${complaint.updated_at}`);
        console.log('');
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

      console.log('✅ Complaint registration is WORKING!\n');
      return true;

    } else {
      console.log('⚠️ No complaints found in database yet\n');
      console.log('💡 Next steps to register a complaint:');
      console.log('1. Make sure the server is running:');
      console.log('   cd server && npm start');
      console.log('2. Start the frontend in another terminal:');
      console.log('   cd client && npm run dev');
      console.log('3. Register a complaint through the UI');
      console.log('4. Run this script again to verify\n');
      return false;
    }

  } catch (err) {
    console.error('❌ ERROR:');
    console.error(`   Message: ${err.message}`);
    
    if (err.code === 'ELOGIN') {
      console.error('\n   → Database login failed');
      console.error('      Check credentials:');
      console.error('      - User: sa');
      console.error('      - Password: root@123');
      console.error('      - Server: 127.0.0.1:1433');
    } else if (err.code === 'ESOCKET') {
      console.error('\n   → Cannot connect to SQL Server on 127.0.0.1:1433');
      console.error('   → Is SQL Server running?');
    } else {
      console.error(`\n   Error Code: ${err.code}`);
    }
    
    console.error('');
    return false;

  } finally {
    if (pool) {
      await pool.close();
      console.log('🔒 Database connection closed\n');
    }
  }
}

// Run the check
checkComplaintStatus()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(err => {
    console.error('\n🔴 Unexpected error:', err.message);
    process.exit(1);
  });
