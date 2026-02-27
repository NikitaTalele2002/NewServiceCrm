#!/usr/bin/env node
/**
 * Quick diagnostic script to test database connection and sample attachments
 * Usage: node test_attachments_db.js
 */

import { sequelize, connectDB } from './db.js';

const testDatabase = async () => {
  try {
    console.log('🔌 Testing database connection...');
    await connectDB();
    console.log('✅ Database connected successfully\n');

    // Test 1: Check if calls table exists and has data
    console.log('📋 Test 1: Checking calls table...');
    const [callsData] = await sequelize.query(`SELECT COUNT(*) as count FROM [calls]`);
    const callCount = callsData[0].count;
    console.log(`   ✅ Calls table exists - Found ${callCount} calls\n`);

    if (callCount === 0) {
      console.log('⚠️  No calls found in database.');
      console.log('   Please create at least one call in Call Update before running attachments script.\n');
      process.exit(0);
    }

    // Test 2: Get most recent call
    console.log('📋 Test 2: Getting most recent call...');
    const [calls] = await sequelize.query(
      `SELECT TOP 1 [call_id] FROM [calls] ORDER BY [created_at] DESC`
    );
    const callId = calls[0].call_id;
    console.log(`   ✅ Found recent call ID: ${callId}\n`);

    // Test 3: Check if attachments table exists
    console.log('📋 Test 3: Checking attachments table...');
    const [attachmentsData] = await sequelize.query(`SELECT COUNT(*) as count FROM [attachments]`);
    const attachmentCount = attachmentsData[0].count;
    console.log(`   ✅ Attachments table exists - Found ${attachmentCount} attachments\n`);

    // Test 4: Try to insert sample attachment
    console.log('📋 Test 4: Testing attachment insertion...');
    await sequelize.query(
      `INSERT INTO [attachments] 
       ([entity_type], [entity_id], [file_url], [file_type], [file_name], [file_category], [file_size], [uploaded_at], [created_at], [updated_at])
       VALUES ('call', :entity_id, '/test/sample.txt', 'txt', 'Test_Sample.txt', 'document', 1024, GETDATE(), GETDATE(), GETDATE())`,
      {
        replacements: { entity_id: callId },
        type: 'INSERT'
      }
    );
    console.log(`   ✅ Test insertion successful\n`);

    console.log('════════════════════════════════════════════════════════');
    console.log('✅ All tests passed! Your database is ready.');
    console.log('════════════════════════════════════════════════════════\n');
    
    console.log('🚀 Next Step: Run the sample attachments script');
    console.log('   node add_sample_attachments.js\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Database Test Failed:');
    console.error('   Error:', error.message);
    
    if (error.sql) {
      console.error('\n   SQL Query:', error.sql);
    }

    console.error('\n💡 Troubleshooting:');
    console.error('   1. Make sure database server is running');
    console.error('   2. Check database credentials in .env or config');
    console.error('   3. Verify the database exists');
    console.error('   4. Ensure calls and attachments tables exist\n');

    process.exit(1);
  }
};

testDatabase();
