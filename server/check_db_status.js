/**
 * Check actual database tables vs models
 */

import { sequelize } from './db.js';
import * as modelExports from './models/index.js';

async function main() {
  try {
    await sequelize.authenticate();

    // Get all models
    const allModels = Object.keys(sequelize.models).sort();

    // Get all tables from database
    const [tables] = await sequelize.query(`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'dbo' AND TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `);

    const tableNames = tables.map(t => t.TABLE_NAME.toLowerCase());

    console.log('\n═══════════════════════════════════════════════\n');
    console.log('✅ TABLES THAT EXIST IN DATABASE:\n');
    
    const existingModels = [];
    allModels.forEach(model => {
      if (tableNames.some(t => t === model.toLowerCase())) {
        existingModels.push(model);
      }
    });

    existingModels.forEach((m, i) => {
      const dbTable = tables.find(t => t.TABLE_NAME.toLowerCase() === m.toLowerCase());
      console.log(`${i + 1}. ${m.padEnd(30)} → ${dbTable.TABLE_NAME}`);
    });

    console.log(`\n\n❌ MODELS NOT YET CREATED:\n`);
    
    const missingModels = allModels.filter(model =>
      !tableNames.some(t => t === model.toLowerCase())
    );

    missingModels.forEach((m, i) => {
      console.log(`${i + 1}. ${m}`);
    });

    console.log(`\n═══════════════════════════════════════════════`);
    console.log(`\n📊 Summary:`);
    console.log(`   Total models: ${allModels.length}`);
    console.log(`   Tables created: ${existingModels.length}`);
    console.log(`   Missing: ${missingModels.length}`);
    console.log(`   Completion: ${Math.round((existingModels.length / allModels.length) * 100)}%\n`);

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
