/**
 * Debug failing tables with detailed error output
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
    console.log('✅ Database connection successful\n');

    for (const modelName of failedModels) {
      const model = sequelize.models[modelName];
      if (!model) {
        console.log(`⚠️  ${modelName} - Model not found in sequelize.models`);
        continue;
      }

      console.log(`\n📋 ATTEMPTING: ${modelName}`);
      console.log('─'.repeat(60));
      
      try {
        // Add detailed logging
        const result = await model.sync({ 
          force: false, 
          alter: false,
          logging: (sql) => console.log('  SQL:', sql)
        });
        console.log(`✅ ${modelName} synced successfully`);
      } catch (err) {
        console.log(`❌ ${modelName} FAILED`);
        console.log('Error Name:', err.name);
        console.log('Error Code:', err.code);
        console.log('Error Message:', err.message);
        console.log('Error SQL:', err.sql);
        console.log('Full Error:', JSON.stringify(err, null, 2));
        
        // Try to get table creation SQL
        if (model.rawAttributes) {
          console.log('\n📊 Model Attributes:');
          for (const [attr, def] of Object.entries(model.rawAttributes)) {
            const field = def.field || attr;
            console.log(`  - ${field}: ${def.type.toString().substring(0, 30)}`);
            if (def.references) {
              console.log(`    → References: ${def.references.model}.${def.references.key}`);
            }
          }
        }
      }
    }

    await sequelize.close();
    console.log('\n✅ Debug complete');
  } catch (err) {
    console.error('Fatal error:', err.message);
    process.exit(1);
  }
}

main();
