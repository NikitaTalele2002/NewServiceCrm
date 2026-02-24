import { sequelize } from './db.js';

async function checkRequestTypeConstraint() {
  try {
    console.log('\n=== Checking spare_requests table constraint ===\n');

    // Check the constraint definition
    const result = await sequelize.query(`
      SELECT 
        CONSTRAINT_NAME,
        CHECK_CLAUSE
      FROM INFORMATION_SCHEMA.CHECK_CONSTRAINTS
      WHERE CONSTRAINT_NAME LIKE '%spare_req%'
      OR CONSTRAINT_NAME LIKE '%request_type%'
    `, { type: sequelize.QueryTypes.SELECT });

    console.log('CHECK Constraints found:');
    result.forEach(r => {
      console.log(`  Name: ${r.CONSTRAINT_NAME}`);
      console.log(`  Definition: ${r.CHECK_CLAUSE}`);
      console.log();
    });

    // Also check what values currently exist
    console.log('\n=== Existing request_type values ===\n');
    const existingValues = await sequelize.query(`
      SELECT DISTINCT request_type FROM spare_requests
    `, { type: sequelize.QueryTypes.SELECT });

    console.log('Existing values:');
    existingValues.forEach(row => {
      console.log(`  - "${row.request_type}"`);
    });

    await sequelize.close();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkRequestTypeConstraint();
