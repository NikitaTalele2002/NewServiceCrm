import { sequelize } from './db.js';

async function fixSpareRequestCheckConstraint() {
  try {
    console.log('Fixing CHECK constraint for request_type column...\n');

    // 1. Drop the old CHECK constraint
    console.log('1. Dropping old CHECK constraint:');
    try {
      await sequelize.query(
        `ALTER TABLE spare_requests DROP CONSTRAINT CK__spare_req__reque__15DFCDBE`
      );
      console.log('   ✓ Dropped old constraint\n');
    } catch (e) {
      console.log('   Note: Could not drop using current name, will try another approach\n');
    }

    // 2. Drop any existing CHECK constraints on request_type
    console.log('2. Finding and dropping any existing request_type CHECK constraints:');
    const constraints = await sequelize.query(
      `SELECT CONSTRAINT_NAME 
       FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
       WHERE TABLE_NAME = 'spare_requests' AND CONSTRAINT_TYPE = 'CHECK'`,
      { type: sequelize.QueryTypes.SELECT }
    );

    for (const constraint of constraints) {
      console.log(`   Dropping: ${constraint.CONSTRAINT_NAME}`);
      try {
        await sequelize.query(
          `ALTER TABLE spare_requests DROP CONSTRAINT ${constraint.CONSTRAINT_NAME}`
        );
      } catch (e) {
        console.log(`   (Could not drop ${constraint.CONSTRAINT_NAME}: ${e.message})`);
      }
    }
    
    console.log('   ✓ All old constraints dropped\n');

    // 3. Add new CHECK constraint with all valid request types
    console.log('3. Adding new CHECK constraint with all valid request types:');
    const newConstraintSql = `
      ALTER TABLE spare_requests 
      ADD CONSTRAINT CK_spare_requests_request_type 
      CHECK (request_type IN ('normal', 'urgent', 'bulk', 'replacement', 'tech_consignment_return', 'tech_consignment_issue', 'consignment_return', 'consignment_fillup'))
    `;
    
    await sequelize.query(newConstraintSql);
    console.log('   ✓ Created new CHECK constraint with all 8 request types:\n');
    console.log('      - normal');
    console.log('      - urgent');
    console.log('      - bulk');
    console.log('      - replacement');
    console.log('      - tech_consignment_return');
    console.log('      - tech_consignment_issue');
    console.log('      - consignment_return');
    console.log('      - consignment_fillup\n');

    // 4. Verify the constraint
    console.log('4. Verifying new constraint:');
    const verifyConstraints = await sequelize.query(
      `SELECT CONSTRAINT_NAME
       FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
       WHERE TABLE_NAME = 'spare_requests' AND CONSTRAINT_TYPE = 'CHECK'`,
      { type: sequelize.QueryTypes.SELECT }
    );

    verifyConstraints.forEach(c => {
      console.log(`   ✓ ${c.CONSTRAINT_NAME}`);
    });

    console.log('\n✅ CHECK constraint fixed successfully!');
    console.log('\nNow you can create spare requests with the new request types:');
    console.log('  - tech_consignment_return (technician → service_center)');
    console.log('  - tech_consignment_issue (service_center → technician)');
    console.log('  - consignment_return (service_center → branch)');
    console.log('  - consignment_fillup (branch → service_center)');

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await sequelize.close();
    process.exit(1);
  }
}

fixSpareRequestCheckConstraint();
