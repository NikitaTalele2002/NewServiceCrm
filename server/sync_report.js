/**
 * Database Sync Verification and Final Report
 */

import { sequelize } from './db.js';
import * as modelExports from './models/index.js';

async function main() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to NewCRM database\n');

    // Get all tables
    const [tables] = await sequelize.query(`
      SELECT TABLE_NAME, 
             COLUMN_COUNT = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS c WHERE c.TABLE_NAME = t.TABLE_NAME)
      FROM (
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = 'dbo' AND TABLE_TYPE = 'BASE TABLE'
      ) t
      ORDER BY TABLE_NAME
    `, { raw: true });

    // Get all possible models
    const allModels = Object.keys(sequelize.models);
    const existingTableNames = new Set(tables.map(t => t.TABLE_NAME.toLowerCase()));

    console.log('═══════════════════════════════════════════════');
    console.log('   DATABASE SYNCHRONIZATION REPORT - NewCRM');
    console.log('═══════════════════════════════════════════════\n');

    console.log(`✅ SUCCESSFULLY CREATED TABLES (${tables.length}):\n`);
    tables.forEach(t => {
      console.log(`   📦 ${t.TABLE_NAME}`);
    });

    const missingModels = allModels.filter(m => 
      !existingTableNames.has(m.toLowerCase())
    );

    if (missingModels.length > 0) {
      console.log(`\n⚠️  MODELS PENDING CREATION (${missingModels.length}):\n`);
      missingModels.forEach(m => {
        console.log(`   ❌ ${m}`);
      });
    }

    console.log(`\n═══════════════════════════════════════════════`);
    console.log(`📊 SYNC STATISTICS:`);
    console.log(`   Total models defined: ${allModels.length}`);
    console.log(`   Tables created: ${tables.length}`);
    console.log(`   Tables pending: ${missingModels.length}`);
    console.log(`   Completion: ${Math.round((tables.length / allModels.length) * 100)}%`);
    console.log(`═══════════════════════════════════════════════\n`);

    // Check for specific issues
    if (missingModels.length > 0) {
      console.log('🔍 ANALYSIS:\n');
      console.log('The following tables were NOT created due to probable FK/constraint issues:');
      console.log(`   ${missingModels.slice(0, 10).join(', ')}${missingModels.length > 10 ? '...' : ''}`);
      console.log('\n💡 Next steps:');
      console.log('   1. These models have complex foreign key relationships');
      console.log('   2. You can manually create them using raw SQL ALTER TABLE statements');
      console.log('   3. Or modify the model definitions to remove FK constraints');
      console.log('   4. Then re-run: node sync_models_newcrm.js\n');
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
