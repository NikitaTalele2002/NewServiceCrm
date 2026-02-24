// Script to get the roles_id for the RSM role
// Usage: node get_rsm_role_id.cjs

const { sequelize } = require('./models');

async function getRSMRoleId() {
  try {
    const [results] = await sequelize.query(`SELECT roles_id FROM roles WHERE roles_name = 'RSM'`);
    if (results.length > 0) {
      console.log('RSM roles_id:', results[0].roles_id);
    } else {
      console.log('No RSM role found.');
    }
  } catch (err) {
    console.error('Error fetching RSM roles_id:', err);
  } finally {
    await sequelize.close();
  }
}

getRSMRoleId();
