import { sequelize } from './db.js';

async function fixRSMStateMapping() {
  try {
    console.log('Fixing RSM-State mapping...\n');

    // 1. Check if foreign keys exist
    console.log('Checking foreign keys in rsm_state_mapping table...');
    const fks = await sequelize.query(
      `SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
       WHERE TABLE_NAME = 'rsm_state_mapping' AND CONSTRAINT_NAME LIKE 'FK_%'`,
      { type: sequelize.QueryTypes.SELECT }
    );

    console.log(`Found ${fks.length} foreign keys`);
    fks.forEach(fk => console.log(`  - ${fk.CONSTRAINT_NAME}`));

    // 2. Drop existing foreign keys if they exist
    const fkNames = fks.map(fk => fk.CONSTRAINT_NAME);
    for (const fkName of fkNames) {
      console.log(`\nDropping foreign key: ${fkName}`);
      await sequelize.query(`ALTER TABLE rsm_state_mapping DROP CONSTRAINT ${fkName}`);
    }

    // 3. Add proper foreign keys
    console.log('\n\nAdding foreign key constraints...');

    // FK for rsm_user_id -> users.user_id
    try {
      await sequelize.query(
        `ALTER TABLE rsm_state_mapping
         ADD CONSTRAINT FK_rsm_state_mapping_rsm_user_id
         FOREIGN KEY (rsm_user_id) REFERENCES users(user_id)
         ON UPDATE CASCADE ON DELETE CASCADE`
      );
      console.log('✓ Added FK for rsm_user_id -> users.user_id');
    } catch (e) {
      console.log('  (rsm_user_id FK may already exist)');
    }

    // FK for state_id -> States.Id
    try {
      await sequelize.query(
        `ALTER TABLE rsm_state_mapping
         ADD CONSTRAINT FK_rsm_state_mapping_state_id
         FOREIGN KEY (state_id) REFERENCES States(Id)
         ON UPDATE CASCADE ON DELETE CASCADE`
      );
      console.log('✓ Added FK for state_id -> States.Id');
    } catch (e) {
      console.log('  (state_id FK may already exist)');
    }

    // FK for role_id -> roles.roles_id
    try {
      await sequelize.query(
        `ALTER TABLE rsm_state_mapping
         ADD CONSTRAINT FK_rsm_state_mapping_role_id
         FOREIGN KEY (role_id) REFERENCES roles(roles_id)
         ON UPDATE CASCADE ON DELETE CASCADE`
      );
      console.log('✓ Added FK for role_id -> roles.roles_id');
    } catch (e) {
      console.log('  (role_id FK may already exist)');
    }

    // 4. Check current mapping data
    console.log('\n\nCurrent RSM-State mappings:');
    const mappings = await sequelize.query(
      `SELECT 
         rsm.rsm_id,
         rsm.rsm_name,
         usr.first_name,
         st.state_name,
         rsm_mapping.is_active,
         rsm_mapping.effective_from
       FROM rsm_state_mapping rsm_mapping
       JOIN users usr ON usr.user_id = rsm_mapping.rsm_user_id
       JOIN States st ON st.Id = rsm_mapping.state_id
       JOIN rsms rsm ON rsm.user_id = rsm_mapping.rsm_user_id
       ORDER BY rsm.rsm_name, st.state_name`,
      { type: sequelize.QueryTypes.SELECT }
    );

    if (mappings.length > 0) {
      console.log(`Found ${mappings.length} active mappings:`);
      mappings.forEach(m => {
        console.log(`  - ${m.rsm_name} (User: ${m.first_name}) → ${m.state_name} (Active: ${m.is_active})`);
      });
    } else {
      console.log('⚠️  No RSM-State mappings found! Check if data exists in rsm_state_mapping table.');
      
      // Check if table has any data
      const count = await sequelize.query(
        `SELECT COUNT(*) as total FROM rsm_state_mapping`,
        { type: sequelize.QueryTypes.SELECT }
      );
      console.log(`\nTotal records in rsm_state_mapping: ${count[0].total}`);

      if (count[0].total > 0) {
        console.log('\nShowing all rsm_state_mapping records:');
        const allRecords = await sequelize.query(
          `SELECT * FROM rsm_state_mapping ORDER BY rsm_user_id`,
          { type: sequelize.QueryTypes.SELECT }
        );
        allRecords.forEach(r => {
          console.log(`  - rsm_user_id: ${r.rsm_user_id}, state_id: ${r.state_id}, role_id: ${r.role_id}, active: ${r.is_active}`);
        });
      }
    }

    console.log('\n✅ RSM-State mapping fixed!');
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await sequelize.close();
    process.exit(1);
  }
}

fixRSMStateMapping();
