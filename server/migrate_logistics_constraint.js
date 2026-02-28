// Migration runner: Add 'plant' to logistics_documents constraint
import 'dotenv/config.js';
import { sequelize, connectDB } from './db.js';

async function runMigration() {
  try {
    console.log('='.repeat(80));
    console.log('RUNNING MIGRATION: Add plant to logistics_documents constraint');
    console.log('='.repeat(80));

    await connectDB();
    console.log('\n✅ Connected to database\n');

    // Step 1: Drop old constraint
    console.log('[STEP 1] Dropping old from_entity_type constraint...');
    try {
      await sequelize.query(`
        ALTER TABLE logistics_documents
        DROP CONSTRAINT CK__logistics__from___0AC320CD;
      `);
      console.log('✅ Old constraint dropped\n');
    } catch (error) {
      console.log(`⚠️  Constraint already removed or doesn't exist: ${error.message}\n`);
    }

    // Step 2: Add new constraint with 'plant'
    console.log('[STEP 2] Adding new from_entity_type constraint with plant...');
    await sequelize.query(`
      ALTER TABLE logistics_documents
      ADD CONSTRAINT CK__logistics__from___0AC320CD 
      CHECK (from_entity_type IN ('warehouse', 'branch', 'service_center', 'technician', 'supplier', 'plant'));
    `);
    console.log('✅ New constraint added\n');

    // Step 3: Verify constraint
    console.log('[STEP 3] Verifying from_entity_type constraint...');
    const fromConstraint = await sequelize.query(`
      SELECT name, definition
      FROM sys.check_constraints
      WHERE parent_object_id = OBJECT_ID('logistics_documents')
      AND name = 'CK__logistics__from___0AC320CD';
    `, { type: sequelize.QueryTypes.SELECT });

    if (fromConstraint && fromConstraint.length > 0) {
      console.log(`✅ from_entity_type constraint verified:`);
      console.log(`   Constraint: ${fromConstraint[0].name}`);
      console.log(`   Definition: ${fromConstraint[0].definition}\n`);
    }

    // Step 4: Drop old to_entity_type constraint (optional)
    console.log('[STEP 4] Updating to_entity_type constraint if needed...');
    try {
      await sequelize.query(`
        ALTER TABLE logistics_documents
        DROP CONSTRAINT CK__logistics__to_____0BD01D36;
      `);
      console.log('✅ Old to_entity_type constraint dropped');

      await sequelize.query(`
        ALTER TABLE logistics_documents
        ADD CONSTRAINT CK__logistics__to_____0BD01D36
        CHECK (to_entity_type IN ('warehouse', 'branch', 'service_center', 'technician', 'customer', 'supplier', 'plant'));
      `);
      console.log('✅ New to_entity_type constraint added\n');
    } catch (error) {
      console.log(`⚠️  to_entity_type constraint update skipped: ${error.message}\n`);
    }

    // Step 5: Verify all constraints
    console.log('[STEP 5] Verifying all check constraints on logistics_documents...');
    const allConstraints = await sequelize.query(`
      SELECT name, definition
      FROM sys.check_constraints
      WHERE parent_object_id = OBJECT_ID('logistics_documents')
      ORDER BY name;
    `, { type: sequelize.QueryTypes.SELECT });

    if (allConstraints && allConstraints.length > 0) {
      console.log(`✅ Found ${allConstraints.length} check constraint(s):\n`);
      allConstraints.forEach((constraint, idx) => {
        console.log(`   ${idx + 1}. ${constraint.name}`);
        console.log(`      ${constraint.definition}\n`);
      });
    }

    console.log('='.repeat(80));
    console.log('✅✅✅ MIGRATION COMPLETED SUCCESSFULLY ✅✅✅');
    console.log('='.repeat(80));
    console.log('\nYou can now use from_entity_type = "plant" in logistics_documents');
    console.log('The RSM approval endpoint will work correctly.');
    console.log('='.repeat(80));

    await sequelize.close();
    process.exit(0);

  } catch (error) {
    console.error('\n❌ MIGRATION FAILED:', error.message);
    console.error('Stack:', error.stack);
    await sequelize.close();
    process.exit(1);
  }
}

runMigration();
