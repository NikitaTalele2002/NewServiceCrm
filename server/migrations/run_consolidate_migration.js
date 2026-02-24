/**
 * Migration Runner: Consolidate Bucket System
 * Removes inventory_bucket table and consolidates into spare_inventory
 */

import { sequelize } from '../db.js';
import { up } from './20260223_consolidate_bucket_system.js';

async function runMigration() {
  try {
    console.log('\n========================================');
    console.log('DATABASE CONSOLIDATION - BUCKET SYSTEM');
    console.log('========================================');
    
    // Check database connection
    console.log('\nConnecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Run the migration
    await up();

    // Verify the changes
    console.log('\n========================================');
    console.log('VERIFICATION');
    console.log('========================================\n');

    // Check if inventory_bucket still exists
    const bucketTableExists = await sequelize.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'dbo' AND TABLE_NAME = 'inventory_bucket'
    `, { type: sequelize.QueryTypes.SELECT });

    if (!bucketTableExists || bucketTableExists.length === 0) {
      console.log('✅ inventory_bucket table successfully dropped');
    } else {
      console.log('⚠️  inventory_bucket table still exists');
    }

    // Check spare_inventory columns
    const columns = await sequelize.query(`
      SELECT COLUMN_NAME, DATA_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'spare_inventory'
      ORDER BY ORDINAL_POSITION
    `, { type: sequelize.QueryTypes.SELECT });

    console.log('\n📊 spare_inventory table structure:');
    columns.forEach(col => {
      const isRequired = ['qty_good', 'qty_defective', 'qty_in_transit'].includes(col.COLUMN_NAME);
      const marker = isRequired ? '✅' : '  ';
      console.log(`${marker} ${col.COLUMN_NAME} (${col.DATA_TYPE})`);
    });

    // Check data integrity
    const inventoryData = await sequelize.query(`
      SELECT 
        COUNT(*) as total_records,
        SUM(qty_good) as good_total,
        SUM(qty_defective) as defective_total,
        SUM(qty_in_transit) as intransit_total
      FROM spare_inventory
    `, { type: sequelize.QueryTypes.SELECT });

    console.log('\n📊 spare_inventory data summary:');
    if (inventoryData && inventoryData.length > 0) {
      const data = inventoryData[0];
      console.log(`  Total records: ${data.total_records || 0}`);
      console.log(`  Good total: ${data.good_total || 0}`);
      console.log(`  Defective total: ${data.defective_total || 0}`);
      console.log(`  In-Transit total: ${data.intransit_total || 0}`);
    }

    console.log('\n========================================');
    console.log('✅ MIGRATION COMPLETED SUCCESSFULLY');
    console.log('========================================\n');

    process.exit(0);

  } catch (error) {
    console.error('\n========================================');
    console.error('❌ MIGRATION FAILED');
    console.error('========================================');
    console.error('\nError:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

// Run the migration
runMigration();
