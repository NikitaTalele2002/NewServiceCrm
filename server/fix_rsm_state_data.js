import { sequelize } from './db.js';

async function fixRSMStateDataMapping() {
  try {
    console.log('Fixing RSM-State data mapping...\n');

    // 1. Get RSM column names
    console.log('1. Checking States table structure:');
    const statesColumns = await sequelize.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_NAME = 'States' 
       ORDER BY ORDINAL_POSITION`,
      { type: sequelize.QueryTypes.SELECT }
    );
    
    const stateNameCol = statesColumns.find(c => c.COLUMN_NAME.toLowerCase().includes('name'));
    console.log(`   State name column: ${stateNameCol?.COLUMN_NAME || 'Not found'}`);
    
    console.log('\n2. Checking RSM data:');
    const rsms = await sequelize.query(
      `SELECT rsm_id, user_id, rsm_name FROM rsms ORDER BY rsm_name`,
      { type: sequelize.QueryTypes.SELECT }
    );

    rsms.forEach(r => {
      console.log(`   - RSM ID: ${r.rsm_id}, User ID: ${r.user_id}, Name: ${r.rsm_name}`);
    });

    console.log('\n3. Current rsm_state_mapping (problematic):');
    const currentMappings = await sequelize.query(
      `SELECT * FROM rsm_state_mapping`,
      { type: sequelize.QueryTypes.SELECT }
    );

    currentMappings.forEach(m => {
      console.log(`   - rsm_user_id: ${m.rsm_user_id} → state_id: ${m.state_id}`);
    });

    console.log('\n4. Checking if mapped user_ids exist in users table:');
    const mappedUserIds = currentMappings.map(m => m.rsm_user_id);
    const users = await sequelize.query(
      `SELECT user_id, first_name FROM users WHERE user_id IN (${mappedUserIds.join(',')})`,
      { type: sequelize.QueryTypes.SELECT }
    );

    console.log(`   Found ${users.length} users:`);
    users.forEach(u => {
      console.log(`   - User ID: ${u.user_id}, Name: ${u.first_name}`);
    });

    console.log('\n5. Fixing the mapping - will map user_id from rsm_state_mapping to actual RSM user_ids:');
    
    // Clear existing mappings
    await sequelize.query(`DELETE FROM rsm_state_mapping`);
    console.log('   ✓ Cleared old mappings');

    // Create correct mappings: RSM.user_id -> state
    // Get first state
    const states = await sequelize.query(
      `SELECT Id FROM States LIMIT 1`,
      { type: sequelize.QueryTypes.SELECT }
    );

    if (states.length > 0) {
      const stateId = states[0].Id;
      
      // Map each RSM to this state
      for (const rsm of rsms) {
        await sequelize.query(
          `INSERT INTO rsm_state_mapping (rsm_user_id, state_id, role_id, is_active, effective_from, created_at, updated_at)
           VALUES (?, ?, 8, 1, GETDATE(), GETDATE(), GETDATE())`,
          {
            replacements: [rsm.user_id, stateId],
            type: sequelize.QueryTypes.INSERT
          }
        );
        console.log(`   ✓ Mapped RSM ${rsm.rsm_name} (user_id: ${rsm.user_id}) to state ${stateId}`);
      }
    }

    console.log('\n6. Verifying new mappings:');
    const newMappings = await sequelize.query(
      `SELECT rsm_user_id, state_id FROM rsm_state_mapping`,
      { type: sequelize.QueryTypes.SELECT }
    );

    newMappings.forEach(m => {
      console.log(`   - rsm_user_id: ${m.rsm_user_id} → state_id: ${m.state_id}`);
    });

    console.log('\n✅ RSM-State mapping fixed!');
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await sequelize.close();
    process.exit(1);
  }
}

fixRSMStateDataMapping();
