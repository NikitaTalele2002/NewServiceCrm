/**
 * Check RSM Mapping for User 15
 */

import { sequelize } from './db.js';

async function checkRSMMapping() {
  try {
    console.log('Checking RSM mapping for user_id 15...\n');

    // Query the rsms table for user_id 15
    const result = await sequelize.query(
      'SELECT TOP 1 rsm_id, user_id FROM rsms WHERE user_id = 15',
      { type: sequelize.QueryTypes.SELECT }
    );

    if (result && result.length > 0) {
      console.log('✅ Found RSM record:');
      console.log(JSON.stringify(result[0], null, 2));
    } else {
      console.log('❌ NO RSM record found for user_id 15');
      console.log('\nChecking all rsms table contents:');
      const allRSMs = await sequelize.query(
        'SELECT TOP 5 rsm_id, user_id FROM rsms ORDER BY rsm_id DESC',
        { type: sequelize.QueryTypes.SELECT }
      );
      console.log(JSON.stringify(allRSMs, null, 2));
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
}

checkRSMMapping();
