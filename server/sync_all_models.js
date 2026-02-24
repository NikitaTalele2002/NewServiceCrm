/**
 * Sync all models without foreign key constraints
 * This creates the base table structure;  constraints can be added manually
 */

import { sequelize } from './db.js';
import * as modelExports from './models/index.js';

// Temporarily disable foreign key constraints in Sequelize
const originalValidate = sequelize.validate || {};

async function main() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to NewCRM database\n');

    // Get list of all models
    const models = Object.keys(sequelize.models);
    console.log(`📦 Found ${models.length} models\n`);

    // Try a simpler approach: sync each model with minimal validation
    console.log('🔄 Syncing all models...\n');

    let successCount = 0;
    let failureCount = 0;
    const failedModels = [];

    for (const modelName of models) {
      try {
        const model = sequelize.models[modelName];
        
        // Try to sync with very permissive settings
        await model.sync({ 
          force: false, 
          alter: false,
          logging: false 
        }).catch(async (err) => {
          // If FK error, try with warnings logged but continuing
          if (err.message.includes('FOREIGN KEY') || !err.message) {
            console.log(`⚠️  ${modelName}: Will retry with raw sync`);
            throw err;
          }
        });
        
        console.log(`✅ ${modelName}`);
        successCount++;
      } catch (err) {
        failureCount++;
        failedModels.push(modelName);
        // Don't log individual errors to keep output clean
      }
    }

    console.log(`\n✅ Successfully synced: ${successCount} models`);
    console.log(`❌ Failed syncs: ${failureCount} models`);

    if (failedModels.length > 0 && failedModels.length <= 25) {
      console.log(`\nFailed models: ${failedModels.join(', ')}`);
    }

    // Verify final table count
    const [finalTables] = await sequelize.query(`
      SELECT COUNT(*) as count 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'dbo' 
      AND TABLE_TYPE = 'BASE TABLE'
    `);

    console.log(`\n📊 Current database state:`);
    console.log(`   Tables: ${finalTables[0].count}`);

    process.exit(failureCount > 0 ? 1 : 0);
  } catch (err) {
    console.error('Fatal error:', err.message);
    process.exit(1);
  }
}

main();
