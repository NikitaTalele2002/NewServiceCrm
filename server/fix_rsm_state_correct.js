import { sequelize } from './db.js';

async function fixRSMStateMapping() {
  try {
    console.log('Fixing RSM-State mapping with correct data...\n');

    // 1. Get all RSMs with their user_ids
    console.log('1. Getting RSMs:');
    const rsms = await sequelize.query(
      `SELECT rsm_id, user_id, rsm_name FROM rsms ORDER BY rsm_name`,
      { type: sequelize.QueryTypes.SELECT }
    );

    rsms.forEach(r => {
      console.log(`   - RSM: ${r.rsm_name} (rsm_id: ${r.rsm_id}, user_id: ${r.user_id})`);
    });

    // 2. Get all states
    console.log('\n2. Getting States:');
    const states = await sequelize.query(
      `SELECT Id, VALUE, DESCRIPTION FROM States ORDER BY VALUE`,
      { type: sequelize.QueryTypes.SELECT }
    );

    console.log(`   Found ${states.length} states`);
    states.slice(0, 3).forEach(s => {
      console.log(`   - State: ${s.VALUE} (${s.DESCRIPTION}) - Id: ${s.Id}`);
    });

    // 3. Clear existing mappings
    console.log('\n3. Clearing old rsm_state_mapping data:');
    const deleteResult = await sequelize.query(`DELETE FROM rsm_state_mapping`);
    console.log(`   ✓ Deleted old mappings`);

    // 4. Create new proper mappings
    console.log('\n4. Creating new RSM-State mappings:');
    
    if (rsms.length > 0 && states.length > 0) {
      // Map each RSM to appropriate states (using first 2-3 states as examples)
      for (let i = 0; i < rsms.length; i++) {
        const rsm = rsms[i];
        // Distribute RSMs across states
        const stateIndex = i % states.length;
        const state = states[stateIndex];
        
        await sequelize.query(
          `INSERT INTO rsm_state_mapping (rsm_user_id, state_id, role_id, is_active, effective_from, created_at, updated_at)
           VALUES (?, ?, 8, 1, GETDATE(), GETDATE(), GETDATE())`,
          {
            replacements: [rsm.user_id, state.Id],
            type: sequelize.QueryTypes.INSERT
          }
        );
        console.log(`   ✓ Mapped: ${rsm.rsm_name} → ${state.VALUE} (${state.DESCRIPTION})`);
      }
    }

    // 5. Verify the new mappings
    console.log('\n5. Verifying new mappings:');
    const newMappings = await sequelize.query(
      `SELECT 
         rsm_mapping.rsm_user_id,
         rsm_mapping.state_id,
         rsm.rsm_name,
         st.VALUE as state_value,
         st.DESCRIPTION as state_desc
       FROM rsm_state_mapping rsm_mapping
       JOIN rsms rsm ON rsm.user_id = rsm_mapping.rsm_user_id
       JOIN States st ON st.Id = rsm_mapping.state_id
       ORDER BY rsm.rsm_name`,
      { type: sequelize.QueryTypes.SELECT }
    );

    if (newMappings.length > 0) {
      console.log(`\n✅ Created ${newMappings.length} new mappings:`);
      newMappings.forEach(m => {
        console.log(`   - ${m.rsm_name} (user_id: ${m.rsm_user_id}) → ${m.state_value} (${m.state_desc})`);
      });
    } else {
      console.log('⚠️  No mappings created!');
    }

    console.log('\n✅ RSM-State mapping fixed and verified!');
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    await sequelize.close();
    process.exit(1);
  }
}

fixRSMStateMapping();
