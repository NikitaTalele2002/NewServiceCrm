import { sequelize } from './db.js';

async function checkRSMStateData() {
  try {
    console.log('Checking RSM-State mapping data...\n');

    // Check rsm_state_mapping table
    const count = await sequelize.query(
      `SELECT COUNT(*) as total FROM rsm_state_mapping`,
      { type: sequelize.QueryTypes.SELECT }
    );

    console.log(`Total records in rsm_state_mapping: ${count[0].total}`);

    if (count[0].total > 0) {
      console.log('\nAll rsm_state_mapping records:');
      const records = await sequelize.query(
        `SELECT TOP 20 * FROM rsm_state_mapping ORDER BY rsm_user_id`,
        { type: sequelize.QueryTypes.SELECT }
      );

      records.forEach(r => {
        console.log(`  - rsm_user_id: ${r.rsm_user_id}, state_id: ${r.state_id}, role_id: ${r.role_id}, is_active: ${r.is_active}`);
      });
    } else {
      console.log('⚠️  No records in rsm_state_mapping table!');
    }

    // Check if RSMs exist
    console.log('\n\nChecking RSMs:');
    const rsms = await sequelize.query(
      `SELECT TOP 10 rsm_id, user_id, rsm_name FROM rsms ORDER BY rsm_name`,
      { type: sequelize.QueryTypes.SELECT }
    );

    console.log(`Found ${rsms.length} RSMs:`);
    rsms.forEach(r => {
      console.log(`  - RSM ID: ${r.rsm_id}, User ID: ${r.user_id}, Name: ${r.rsm_name}`);
    });

    // Check if States exist
    console.log('\n\nChecking States:');
    const states = await sequelize.query(
      `SELECT TOP 10 Id, state_name FROM States ORDER BY state_name`,
      { type: sequelize.QueryTypes.SELECT }
    );

    console.log(`Found ${states.length} States:`);
    states.slice(0, 5).forEach(s => {
      console.log(`  - State ID: ${s.Id}, Name: ${s.state_name}`);
    });

    console.log('\n✅ Data check complete!');
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await sequelize.close();
    process.exit(1);
  }
}

checkRSMStateData();
