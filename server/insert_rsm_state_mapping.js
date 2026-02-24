// Script to insert a test mapping for RSM to state
// Usage: node insert_rsm_state_mapping.js

const { sequelize } = require('./models');

async function insertMapping() {
  try {
    const [result, metadata] = await sequelize.query(`
      INSERT INTO rsm_state_mapping (user_id, state_id)
      VALUES (1, 27)
    `);
    console.log('Mapping inserted: RSM user_id=1, state_id=27');
  } catch (err) {
    console.error('Error inserting mapping:', err);
  } finally {
    await sequelize.close();
  }
}

insertMapping();
