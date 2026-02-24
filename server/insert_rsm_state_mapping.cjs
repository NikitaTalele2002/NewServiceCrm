// Script to insert a test mapping for RSM to state
// Usage: node insert_rsm_state_mapping.cjs

const { sequelize } = require('./models');

async function insertMapping() {
  try {
    const [result, metadata] = await sequelize.query(`
      INSERT INTO rsm_state_mapping (rsm_user_id, state_id, role_id, is_active, created_at, updated_at)
      VALUES (1, 27, 8, 1, GETDATE(), GETDATE())
    `);
    console.log('Mapping inserted: RSM rsm_user_id=1, state_id=27, role_id=8');
  } catch (err) {
    console.error('Error inserting mapping:', err);
  } finally {
    await sequelize.close();
  }
}

insertMapping();
