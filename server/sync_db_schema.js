/**
 * Database Schema Sync Script
 * Adds missing visit_time column to calls table
 */

import { sequelize } from './db.js';

console.log('\n🔄 Database Schema Sync');
console.log('=======================\n');

async function syncDatabase() {
  try {
    console.log('🔗 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Connected\n');

    console.log('📊 Checking calls table columns...');
    const queryInterface = sequelize.getQueryInterface();
    const columns = await queryInterface.describeTable('calls');
    
    console.log('📋 Current columns:');
    Object.keys(columns).forEach(col => {
      console.log(`   ✓ ${col}`);
    });

    // Check if visit_time already exists
    if (columns.visit_time) {
      console.log('\n✅ visit_time column already exists!\n');
    } else {
      console.log('\n⚠️  visit_time column missing - adding it...\n');
      
      // Add visit_time column using raw SQL
      await sequelize.query(`
        ALTER TABLE calls
        ADD visit_time NVARCHAR(10) NULL
      `);
      
      console.log('✅ visit_time column added successfully!\n');
    }

    // Verify the column was added
    const updatedColumns = await queryInterface.describeTable('calls');
    if (updatedColumns.visit_time) {
      console.log('✅ Verification: visit_time column confirmed in database\n');
    }

    console.log('✅ Database schema sync complete\n');
    process.exit(0);

  } catch (err) {
    console.error('❌ Error during sync:');
    console.error(`   ${err.message}`);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

syncDatabase();
