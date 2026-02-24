/**
 * Debug RSM State Mapping Issue
 * Run: node check_rsm_mapping.js <rsm_user_id>
 */

import { sequelize } from './db.js';
import { QueryTypes } from 'sequelize';

async function checkRSMMapping() {
  try {
    await sequelize.authenticate();
    
    const rsmUserId = process.argv[2] || 1; // Default to 1 if not provided
    
    console.log('\n' + '═'.repeat(80));
    console.log(`  CHECKING RSM STATE MAPPING FOR RSM_USER_ID: ${rsmUserId}`);
    console.log('═'.repeat(80) + '\n');

    // Check 1: All RSM mappings
    console.log('📌 All RSM State Mapping Records:\n');
    const allMappings = await sequelize.query(
      'SELECT * FROM rsm_state_mapping ORDER BY rsm_user_id, state_id',
      { type: QueryTypes.SELECT }
    );

    if (allMappings.length === 0) {
      console.log('  ⚠️  No RSM state mappings found in database\n');
    } else {
      allMappings.forEach(m => {
        console.log(`  ID: ${m.id} | RSM User: ${m.rsm_user_id} | State: ${m.state_id} | Active: ${m.is_active}`);
      });
      console.log('');
    }

    // Check 2: Query using the same logic as the API
    console.log(`📌 Query: RSM_USER_ID = ${rsmUserId} AND is_active = 1\n`);
    
    const stateRows = await sequelize.query(
      `SELECT DISTINCT state_id FROM rsm_state_mapping WHERE rsm_user_id = ? AND is_active = 1`,
      { replacements: [rsmUserId], type: QueryTypes.SELECT }
    );

    console.log(`Result: ${stateRows.length} rows\n`);
    stateRows.forEach(r => {
      console.log(`  State ID: ${r.state_id}`);
    });

    if (stateRows.length === 0) {
      console.log('  ⚠️  No results found\n');
      
      // Check if rsm_user_id exists at all
      console.log(`📌 Checking if RSM_USER_ID ${rsmUserId} exists...\n`);
      const rsmCheck = await sequelize.query(
        `SELECT * FROM rsm_state_mapping WHERE rsm_user_id = ?`,
        { replacements: [rsmUserId], type: QueryTypes.SELECT }
      );
      
      if (rsmCheck.length === 0) {
        console.log(`  ✖️  RSM_USER_ID ${rsmUserId} has NO mappings at all\n`);
      } else {
        console.log(`  ℹ️  RSM_USER_ID ${rsmUserId} exists but is_active != 1\n`);
        rsmCheck.forEach(r => {
          console.log(`     State: ${r.state_id}, Active: ${r.is_active}`);
        });
        console.log('');
      }
    }

    // Check 3: Check users table
    console.log('📌 Checking Users Table:\n');
    const users = await sequelize.query(
      'SELECT TOP 5 user_id, user_name, role_id, email FROM users',
      { type: QueryTypes.SELECT }
    );

    users.forEach(u => {
      console.log(`  User ID: ${u.user_id} | Name: ${u.user_name} | Role: ${u.role_id}`);
    });
    console.log('');

    // Check 4: Check roles
    console.log('📌 Checking Roles (Role ID 8 should be RSM):\n');
    const roles = await sequelize.query(
      'SELECT role_id, role_name FROM roles WHERE role_id IN (8, 7, 9, 10)',
      { type: QueryTypes.SELECT }
    );

    if (roles.length === 0) {
      console.log('  ⚠️  Roles table query returned no results\n');
    } else {
      roles.forEach(r => {
        console.log(`  Role ID: ${r.role_id} | Name: ${r.role_name}`);
      });
      console.log('');
    }

    console.log('═'.repeat(80));
    console.log('  KEY FINDINGS:');
    console.log('═'.repeat(80));
    console.log(`  - Total RSM mappings: ${allMappings.length}`);
    console.log(`  - Active mappings for RSM ${rsmUserId}: ${stateRows.length}`);
    console.log(`  - Total users: ${users.length}`);
    console.log('\n  TRY: node check_rsm_mapping.js 1  (check RSM user 1)');
    console.log('       node check_rsm_mapping.js 2  (check RSM user 2)\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error:');
    console.error('Message:', error.message);
    if (error.sql) console.error('SQL:', error.sql);
    process.exit(1);
  }
}

checkRSMMapping();
