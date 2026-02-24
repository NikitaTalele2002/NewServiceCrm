/**
 * Direct Database Sync for NewCRM - Simplified Version
 * Uses sequelize.sync() with MSSQL-specific configuration
 */

import { sequelize } from './db.js';
import * as modelExports from './models/index.js';

console.log('\n========== DATABASE SYNC FOR NewCRM ==========\n');

async function main() {
  try {
    // Test connection
    console.log('✅ Testing database connection...');
    await sequelize.authenticate();
    console.log('✅ Database connection successful\n');

    // Try syncing all models silently first to check for critical errors
    console.log('📦 Attempting to sync all models...');
    console.log('This may take a moment...\n');

    try {
      // Try with simple sync first
      await sequelize.sync({ force: false, alter: false });
      console.log('✅ All models synced successfully!');
    } catch (syncErr) {
      console.log('⚠️  Initial sync encountered issues.');
      console.log('📝 Full error details:');
      console.log(JSON.stringify({
        message: syncErr.message,
        originalMessage: syncErr.original?.message,
        sqlState: syncErr.original?.sqlState,
        sql: syncErr.sql,
      }, null, 2));
      
      // Try sync with force to recreate everything
      console.log('\n🔄 Attempting forced sync (will drop and recreate tables)...');
      await sequelize.sync({ force: true, alter: false });
      console.log('✅ Forced sync completed');
    }

    // Verify tables
    console.log('\n📋 Verifying created tables...\n');
    const [tables] = await sequelize.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'dbo' 
      AND TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `, { raw: true });

    console.log(`✅ Found ${tables.length} tables:\n`);
    tables.forEach((t, i) => {
      console.log(`   ${i + 1}. ${t.TABLE_NAME}`);
    });

    console.log('\n========== SYNC COMPLETE ==========\n');
    process.exit(0);

  } catch (err) {
    console.error('\n❌ SYNC FAILED');
    console.error('Error:', err.message);
    if (err.original) {
      console.error('Original:', err.original.message);
    }
    console.error('\nFull error:');
    console.error(err);
    process.exit(1);
  }
}

main();
