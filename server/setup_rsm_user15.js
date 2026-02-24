/**
 * Check & Setup RSM Mapping for User 15
 * Run: node setup_rsm_user15.js
 */

import { sequelize } from './db.js';
import { QueryTypes } from 'sequelize';

async function setupRSMUser15() {
  try {
    await sequelize.authenticate();
    
    console.log('\n' + '═'.repeat(80));
    console.log('  SETUP RSM MAPPING FOR USER 15');
    console.log('═'.repeat(80) + '\n');

    // Step 1: Check if user 15 exists
    console.log('📌 Step 1: Checking if User 15 exists...\n');
    
    const userCheck = await sequelize.query(
      'SELECT * FROM users WHERE user_id = 15',
      { type: QueryTypes.SELECT }
    );

    if (userCheck.length === 0) {
      console.log('  ⚠️  User ID 15 not found. Creating test user 15...\n');
      
      await sequelize.query(
        `INSERT INTO users (user_id, user_name, email, phone_number, role_id, status) 
         VALUES (15, 'RSM User 15', 'rsm15@example.com', '9999999915', 8, 1)`,
        { type: QueryTypes.INSERT }
      );
      
      console.log('  ✅ Created User 15 (RSM User)\n');
    } else {
      console.log(`  ✅ User 15 found:`);
      console.log(`     - Name: ${userCheck[0].user_name || userCheck[0].name}`);
      console.log(`     - Email: ${userCheck[0].email}`);
      console.log(`     - Role ID: ${userCheck[0].role_id}\n`);
    }

    // Step 2: Check existing RSM mappings
    console.log('📌 Step 2: Checking RSM table for user 15...\n');
    
    const rsmCheck = await sequelize.query(
      'SELECT * FROM rsms WHERE user_id = 15',
      { type: QueryTypes.SELECT }
    );

    let rsmId;
    if (rsmCheck.length === 0) {
      console.log('  ⚠️  User 15 not in RSMs table. Creating RSM record...\n');
      
      await sequelize.query(
        `INSERT INTO rsms (user_id, role_id, rsm_code, rsm_name) 
         VALUES (15, 8, 'RSM15', 'RSM-Sharma-1')`,
        { type: QueryTypes.INSERT }
      );
      
      // Get the newly created RSM
      const newRsm = await sequelize.query(
        'SELECT rsm_id FROM rsms WHERE user_id = 15',
        { type: QueryTypes.SELECT }
      );
      rsmId = newRsm[0]?.rsm_id;
      console.log(`  ✅ Created RSM record for user 15 (rsm_id: ${rsmId})\n`);
    } else {
      rsmId = rsmCheck[0].rsm_id;
      console.log(`  ✅ Found RSM record:`);
      console.log(`     - RSM ID: ${rsmCheck[0].rsm_id}`);
      console.log(`     - Name: ${rsmCheck[0].rsm_name}\n`);
    }

    // Step 3: Check existing RSM mappings
    console.log('📌 Step 3: Checking existing RSM state mappings...\n');
    
    const allMappings = await sequelize.query(
      'SELECT * FROM rsm_state_mapping ORDER BY rsm_user_id',
      { type: QueryTypes.SELECT }
    );

    console.log(`  Found ${allMappings.length} total RSM mappings:\n`);
    allMappings.forEach(m => {
      console.log(`     RSM User ${m.rsm_user_id} → State ${m.state_id} (Active: ${m.is_active})`);
    });
    console.log('');

    // Step 4: Check if user 15 has any mapping
    console.log('📌 Step 4: Checking if User 15 has RSM state mapping...\n');
    
    const user15Mapping = await sequelize.query(
      `SELECT * FROM rsm_state_mapping WHERE rsm_user_id = ${rsmId}`,
      { type: QueryTypes.SELECT }
    );

    if (user15Mapping.length === 0) {
      console.log(`  ⚠️  RSM ${rsmId} has NO state mappings. Creating mapping...\n`);
      
      // Create mapping for RSM to state 21 (same as user 1 and 2)
      await sequelize.query(
        `INSERT INTO rsm_state_mapping (rsm_user_id, role_id, state_id, is_active, created_at, updated_at)
         VALUES (${rsmId}, 8, 21, 1, GETDATE(), GETDATE())`,
        { type: QueryTypes.INSERT }
      );
      
      console.log(`  ✅ Created mapping: RSM ${rsmId} → State 21 (Active)\n`);
    } else {
      console.log(`  ✅ RSM ${rsmId} already has mappings:\n`);
      user15Mapping.forEach(m => {
        console.log(`     State ${m.state_id} (Active: ${m.is_active})`);
      });
      console.log('');
    }

    // Step 5: Verify the mapping works
    console.log('📌 Step 5: Testing the query with RSM ID ' + rsmId + '...\n');
    
    const stateIds = await sequelize.query(
      `SELECT DISTINCT state_id FROM rsm_state_mapping WHERE rsm_user_id = ${rsmId} AND is_active = 1`,
      { type: QueryTypes.SELECT }
    );

    if (stateIds.length > 0) {
      console.log(`  ✅ SUCCESS! Query returned ${stateIds.length} state(s):\n`);
      stateIds.forEach(s => {
        console.log(`     State ID: ${s.state_id}`);
      });
      console.log('');
    } else {
      console.log('  ❌ Query still returns no results\n');
    }

    // Step 6: Check plants in state 21
    console.log('📌 Step 6: Checking plants in State 21...\n');
    
    const plants = await sequelize.query(
      'SELECT * FROM plants WHERE state_id = 21',
      { type: QueryTypes.SELECT }
    );

    if (plants.length > 0) {
      console.log(`  ✅ Found ${plants.length} plant(s) in State 21:\n`);
      plants.forEach(p => {
        console.log(`     Plant ID: ${p.plant_id}, Code: ${p.plant_code}`);
      });
      console.log('');
    } else {
      console.log('  ⚠️  No plants found in State 21\n');
    }

    console.log('═'.repeat(80));
    console.log('  ✅ SETUP COMPLETE');
    console.log('═'.repeat(80));
    console.log('\n  User 15 is now configured as RSM for State 21');
    console.log('  Try: node test_current_inventory_user15.js\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error:');
    console.error('Message:', error.message);
    if (error.sql) console.error('SQL:', error.sql);
    process.exit(1);
  }
}

setupRSMUser15();
