/**
 * Check existing tables and create missing ones
 */

import { sequelize } from './db.js';
import * as modelExports from './models/index.js';

async function main() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to NewCRM\n');

    // Get all existing tables
    const [existingTables] = await sequelize.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'dbo' 
      AND TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `, { raw: true });

    const existingTableNames = existingTables.map(t => t.TABLE_NAME.toLowerCase());
    console.log(`📋 Existing tables (${existingTableNames.length}):`);
    existingTableNames.forEach(t => console.log(`   - ${t}`));

    // List of tables that should exist based on models
    const expectedModels = [
      'Technicians', 'ActionLog', 'Ledger', 'Customer', 'CustomersProducts',
      'RSMStateMapping', 'ServiceCenterFinancial', 'Calls', 'HappyCodes',
      'TATTracking', 'TATHolds', 'CallTechnicianAssignment', 'CallCancellationRequests',
      'CallSpareUsage', 'ServiceInvoice', 'ServiceInvoiceItem', 'Replacements',
      'GoodsMovementItems', 'SpareRequest', 'SpareRequestItem'
    ];

    console.log(`\n❌ Missing tables:`);
    const missingTables = expectedModels.filter(tbl => 
      !existingTableNames.includes(tbl.toLowerCase())
    );
    missingTables.forEach(t => console.log(`   - ${t}`));

    console.log(`\n✅ Total: ${existingTableNames.length} tables exist`);
    console.log(`❌ Missing: ${missingTables.length} tables\n`);

    // Try to sync just the missing tables
    if (missingTables.length > 0) {
      console.log('🔄 Attempting to create missing tables...\n');

      for (const modelName of missingTables) {
        const model = sequelize.models[modelName];
        if (model) {
          try {
            await model.sync({ force: false, alter: false });
            console.log(`✅ Created: ${modelName}`);
          } catch (err) {
            console.log(`❌ Failed: ${modelName}`);
            console.error(`   Error: ${err.message}`);
            if (err.original?.message) {
              console.error(`   Original: ${err.original.message}`);
            }
          }
        }
      }
    }

    // Final verification
    const [finalTables] = await sequelize.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'dbo' 
      AND TABLE_TYPE = 'BASE TABLE'
    `);

    console.log(`\n✅ Final count: ${finalTables.length} tables in database`);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
