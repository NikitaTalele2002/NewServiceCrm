/**
 * Retry Failed Tables with Better Error Handling
 */

import { sequelize } from './db.js';
import * as modelExports from './models/index.js';

const failedModels = [
  'Ledger',
  'ActionLog', 
  'Technicians',
  'RSMStateMapping',
  'ServiceCenterFinancial',
  'GoodsMovementItems',
  'CallTechnicianAssignment',
  'ServiceInvoice',
  'ServiceInvoiceItem',
  'Replacements'
];

async function main() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to NewCRM\n');

    console.log('🔄 Retrying failed models with detailed error reporting...\n');

    let successCount = 0;
    let stillFailingCount = 0;

    for (const modelName of failedModels) {
      const model = sequelize.models[modelName];
      if (!model) {
        console.log(`⚠️  ${modelName} - Model not found`);
        continue;
      }

      try {
        await model.sync({ force: false, alter: false });
        console.log(`✅ ${modelName}`);
        successCount++;
      } catch (err) {
        console.log(`❌ ${modelName}`);
        console.log(`   Error: ${err.message}`);
        if (err.original?.message) {
          console.log(`   SQL Error: ${err.original.message}`);
        }
        if (err.sql) {
          console.log(`   SQL: ${err.sql.substring(0, 200)}...`);
        }
        stillFailingCount++;
      }
    }

    console.log(`\n✅ Retry Summary:`);
    console.log(`   Successfully created: ${successCount}`);
    console.log(`   Still failing: ${stillFailingCount}`);

    // Final count
    const [tableCount] = await sequelize.query(`
      SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'dbo' AND TABLE_TYPE = 'BASE TABLE'
    `);

    console.log(`\n📊 Final database state:`);
    console.log(`   Total tables: ${tableCount[0].count}`);

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
