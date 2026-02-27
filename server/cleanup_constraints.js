import { sequelize } from './db.js';

async function dropConstraints() {
  try {
    console.log('Dropping all CHECK constraints on call_technician_assignment...\n');

    const res = await sequelize.query(`
      SELECT CONSTRAINT_NAME 
      FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
      WHERE TABLE_NAME = 'call_technician_assignment' 
      AND CONSTRAINT_TYPE = 'CHECK'
    `, { type: sequelize.QueryTypes.SELECT });

    console.log(`Found ${res.length} constraint(s)`);

    for (const r of res) {
      try {
        await sequelize.query(`ALTER TABLE [call_technician_assignment] DROP CONSTRAINT [${r.CONSTRAINT_NAME}]`);
        console.log(`✓ Dropped ${r.CONSTRAINT_NAME}`);
      } catch (e) {
        console.log(`✗ Failed to drop ${r.CONSTRAINT_NAME}: ${e.message}`);
      }
    }

    // Add proper constraint
    console.log('\nAdding new constraint...');
    await sequelize.query(`
      ALTER TABLE [call_technician_assignment] 
      ADD CONSTRAINT [CK_call_tech_assigned_reason] 
      CHECK (assigned_reason IN ('INITIAL_ALLOCATION', 'REALLOCATION', 'ABSENT', 'OVERLOADED', 'CUSTOMER_REQUEST', 'PERFORMANCE', 'AVAILABILITY'))
    `);
    console.log('✓ New constraint created\n');

    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
}

dropConstraints();
