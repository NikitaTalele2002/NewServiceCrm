import { sequelize } from '../db.js';

/**
 * Sync only the models (without forcing recreate) to allow
 * Sequelize to update schema to match model definitions.
 *
 * Usage: `node server/scripts/sync_associations.js`
 */
async function run() {
  try {
    console.log('Syncing all models (alter: true, force: false)...');
    await sequelize.sync({ alter: true, force: false });
    console.log('✓ Models synced successfully');
    process.exit(0);
  } catch (err) {
    console.error('Error syncing models:', err && err.message ? err.message : err);
    process.exit(1);
  }
}

run();
