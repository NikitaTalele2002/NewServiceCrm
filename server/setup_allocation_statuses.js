/**
 * Setup Allocated and Re-Allocated Statuses
 * This script ensures the required statuses exist in the database for technician allocation tracking
 */

import { sequelize } from './db.js';
import { QueryTypes } from 'sequelize';

async function setupAllocationStatuses() {
  try {
    console.log('\n╔═══════════════════════════════════════════════════════╗');
    console.log('║     Setting up Allocation Statuses for Calls          ║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');

    const statusesToCreate = ['Allocated', 'Re-Allocated'];

    for (const statusName of statusesToCreate) {
      // Check if status exists
      const existingStatus = await sequelize.query(
        `SELECT status_id, status_name FROM status WHERE status_name = ?`,
        { 
          replacements: [statusName],
          type: QueryTypes.SELECT 
        }
      );

      if (existingStatus && existingStatus.length > 0) {
        console.log(`✅ Status '${statusName}' already exists (ID: ${existingStatus[0].status_id})`);
      } else {
        // Create new status
        console.log(`📝 Creating new status: '${statusName}'...`);
        await sequelize.query(
          `INSERT INTO status (status_name, created_at, updated_at) VALUES (?, GETDATE(), GETDATE())`,
          { 
            replacements: [statusName],
            type: QueryTypes.INSERT 
          }
        );
        console.log(`✅ Status '${statusName}' created successfully`);
      }
    }

    // Verify all statuses
    console.log('\n📋 Verifying all statuses:');
    const allStatuses = await sequelize.query(
      `SELECT status_id, status_name FROM status WHERE status_name IN ('Allocated', 'Re-Allocated') ORDER BY status_id`,
      { type: QueryTypes.SELECT }
    );

    allStatuses.forEach(s => {
      console.log(`   ✓ ID: ${s.status_id} | Name: "${s.status_name}"`);
    });

    // Verify call_technician_assignment table exists and has correct structure
    console.log('\n🔍 Verifying call_technician_assignment table structure...');
    
    const tableExists = await sequelize.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'call_technician_assignment'`,
      { type: QueryTypes.SELECT }
    );

    if (tableExists && tableExists.length > 0) {
      console.log('✅ call_technician_assignment table exists');
      
      // Check for required columns
      const columns = await sequelize.query(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'call_technician_assignment'`,
        { type: QueryTypes.SELECT }
      );

      const requiredColumns = [
        'id', 'call_id', 'technician_id', 'assigned_by_user_id', 'assigned_reason',
        'assigned_at', 'unassigned_at', 'is_active', 'created_at', 'updated_at'
      ];

      const existingColumnNames = columns.map(c => c.COLUMN_NAME.toLowerCase());
      const missingColumns = requiredColumns.filter(col => !existingColumnNames.includes(col.toLowerCase()));

      if (missingColumns.length === 0) {
        console.log('✅ All required columns exist:');
        requiredColumns.forEach(col => {
          console.log(`   ✓ ${col}`);
        });
      } else {
        console.log(`⚠️  Missing columns: ${missingColumns.join(', ')}`);
      }
    } else {
      console.log('❌ call_technician_assignment table does NOT exist!');
      console.log('Please create the table using the migration script.');
    }

    console.log('\n✨ Allocation status setup completed successfully!\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error setting up allocation statuses:', error);
    process.exit(1);
  }
}

setupAllocationStatuses();
