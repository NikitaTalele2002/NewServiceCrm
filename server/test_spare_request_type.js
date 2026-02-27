import { poolPromise } from './db.js';
import sql from 'mssql';

async function testSpareRequestType() {
  try {
    const pool = await poolPromise;

    console.log('🧪 Testing Spare Request Type Fix\n');
    console.log('=' .repeat(60));

    // Check existing spare requests
    console.log('\n📋 Step 1: Checking spare_request_type column...');
    const checkRes = await pool.request()
      .query(`
        SELECT 
          request_id, 
          request_type, 
          spare_request_type,
          requested_source_type,
          requested_source_id,
          requested_to_type,
          created_at
        FROM spare_requests 
        ORDER BY request_id DESC
        LIMIT 5
      `);
    
    if (checkRes.recordset.length === 0) {
      console.log('No spare requests found in database');
      process.exit(0);
    }

    console.log(`✅ Found ${checkRes.recordset.length} spare requests:\n`);
    checkRes.recordset.forEach((req, idx) => {
      console.log(`${idx + 1}. Request ID: ${req.request_id}`);
      console.log(`   request_type: ${req.request_type}`);
      console.log(`   spare_request_type: ${req.spare_request_type}`);
      console.log(`   Source: ${req.requested_source_type} (ID: ${req.requested_source_id})`);
      console.log(`   Destination: ${req.requested_to_type}`);
      console.log(`   Created: ${req.created_at}`);
      console.log();
    });

    // Count by type
    console.log('\n📊 Step 2: Counting by spare_request_type...');
    const countRes = await pool.request()
      .query(`
        SELECT 
          spare_request_type,
          COUNT(*) as count
        FROM spare_requests
        GROUP BY spare_request_type
        ORDER BY count DESC
      `);
    
    console.log('Request types breakdown:');
    countRes.recordset.forEach(row => {
      console.log(`  - ${row.spare_request_type || 'NULL'}: ${row.count}`);
    });

    // Check if TECH_ISSUE type exists
    const techIssueCount = checkRes.recordset.filter(r => r.spare_request_type === 'TECH_ISSUE').length;
    const cfuCount = checkRes.recordset.filter(r => r.spare_request_type === 'CFU').length;
    
    console.log(`\n✅ TECH_ISSUE count: ${techIssueCount}`);
    console.log(`✅ CFU count: ${cfuCount}`);

    console.log('\n✨ Test completed successfully!');
    console.log('=' .repeat(60));
    
    process.exit(0);

  } catch (err) {
    console.error('❌ Test failed:', err.message);
    console.error('Error:', err);
    process.exit(1);
  }
}

testSpareRequestType();
