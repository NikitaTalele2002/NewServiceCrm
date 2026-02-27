/**
 * Migration: Update CallTechnicianAssignment assigned_reason ENUM values
 * Adds INITIAL_ALLOCATION and REALLOCATION values to the enum
 */

import { sequelize } from './db.js';

async function migrateTechnicianAssignmentReason() {
  try {
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║  Updating assigned_reason ENUM for Technician Assignment  ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    // First, find the existing constraint
    console.log('Finding existing CHECK constraint...\n');

    const constraintRes = await sequelize.query(`
      SELECT CONSTRAINT_NAME 
      FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
      WHERE TABLE_NAME = 'call_technician_assignment' 
      AND CONSTRAINT_TYPE = 'CHECK'
      AND CONSTRAINT_NAME LIKE '%assigned_reason%'
    `, { type: sequelize.QueryTypes.SELECT });

    if (constraintRes && constraintRes.length > 0) {
      const constraintName = constraintRes[0].CONSTRAINT_NAME;
      console.log(`Found constraint: ${constraintName}`);
      
      // Drop it
      await sequelize.query(`
        ALTER TABLE [call_technician_assignment] DROP CONSTRAINT [${constraintName}]
      `);
      console.log(`✅ Dropped old constraint\n`);
    } else {
      console.log('No existing constraint found (may already be updated)\n');
    }

    // Add new constraint
    console.log('Creating new CHECK constraint with updated values...\n');
    
    await sequelize.query(`
      ALTER TABLE [call_technician_assignment] 
      ADD CONSTRAINT [CK_assigned_reason_values] 
      CHECK (assigned_reason IN ('INITIAL_ALLOCATION', 'REALLOCATION', 'ABSENT', 'OVERLOADED', 'CUSTOMER_REQUEST', 'PERFORMANCE', 'AVAILABILITY'))
    `);

    console.log('✅ New CHECK constraint created successfully');

    // Verify
    const verifyRes = await sequelize.query(`
      SELECT CONSTRAINT_NAME 
      FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
      WHERE TABLE_NAME = 'call_technician_assignment' 
      AND CONSTRAINT_TYPE = 'CHECK'
    `, { type: sequelize.QueryTypes.SELECT });

    console.log(`✅ Verified: Found ${verifyRes.length} CHECK constraint(s)\n`);

    console.log('✨ Migration completed successfully!\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Migration Error:', error.message);
    
    // If constraint doesn't exist error, that's probably OK
    if (error.message && error.message.includes('does not exist')) {
      console.log('⚠️  Constraint not found (may need to be created fresh)');
      console.log('Attempting to recreate...\n');
      
      try {
        await sequelize.query(`
          ALTER TABLE [call_technician_assignment] 
          ADD CONSTRAINT [CK__call_tech__assig__new] 
          CHECK (assigned_reason IN ('INITIAL_ALLOCATION', 'REALLOCATION', 'ABSENT', 'OVERLOADED', 'CUSTOMER_REQUEST', 'PERFORMANCE', 'AVAILABILITY'))
        `);
        console.log('✅ New constraint created successfully\n');
        process.exit(0);
      } catch (e) {
        console.error('Failed to recreate constraint:', e.message);
        process.exit(1);
      }
    } else {
      console.error('\nFull Error:', error);
      process.exit(1);
    }
  }
}

migrateTechnicianAssignmentReason();
