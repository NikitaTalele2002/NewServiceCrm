/**
 * Simple Direct Sync - No dropping, just sync all models
 */

import { sequelize } from './db.js';
import * as modelExports from './models/index.js';

const SYNC_ORDER = [
  // Phase 1
  'Roles',
  'Zones', 
  'ProductGroup',
  'Status',
  'SubStatus',
  'DefectMaster',
  'Dealers',
  'AccessControl',
  'EntityChangeRequests',
  'Approvals',
  'StockMovement',
  'Ledger',
  'Reimbursement',
  'LogisticsDocuments',
  'SAPDocuments',
  'ActionLog',

  // Phase 2
  'Users',
  'State',
  'City',
  'Pincode',
  'ProductMaster',
  'Plant',
  'RSM',
  'ReportingAuthority',
  'ServiceCenter',
  'Technicians',

  // Phase 3
  'ProductModel',
  'SparePart',
  'Customer',
  'CustomersProducts',
  'RSMStateMapping',
  'ServiceCenterPincodes',
  'ServiceCenterFinancial',
  'Cartons',
  'GoodsMovementItems',
  'SpareInventory',

  // Phase 4
  'Calls',
  'HappyCodes',
  'TATTracking',
  'TATHolds',
  'CallTechnicianAssignment',
  'CallCancellationRequests',
  'CallSpareUsage',
  'Attachments',
  'AttachmentAccess',
  'ServiceInvoice',
  'ServiceInvoiceItem',
  'Replacements',
  'DefectSpares',
  'ModelDefects',

  // Phase 5
  'SpareRequest',
  'SpareRequestItem',
  'LogisticsDocumentItems',
  'SAPDocumentItems',
];

async function main() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to NewCRM\n');

    console.log('🔄 Syncing all models using Sequelize definitions...\n');

    let syncedCount = 0;
    let alreadyExistCount = 0;
    let failedCount = 0;
    const failedModels = [];

    for (const modelName of SYNC_ORDER) {
      const model = sequelize.models[modelName];
      if (!model) continue;

      try {
        await model.sync({ force: false, alter: false });      
        syncedCount++;
        console.log(`✅ ${modelName}`);
      } catch (err) {
        const msg = err.message || 'Unknown error';
        
        // Check if it's already exists error
        if (msg.includes('already exists')) {
          alreadyExistCount++;
          console.log(`✓ ${modelName} (already exists)`);
        } else {
          failedCount++;
          failedModels.push(modelName);
          console.log(`❌ ${modelName} - ${msg.substring(0, 60)}`);
        }
      }
    }

    console.log(`\n═══════════════════════════════════════════════`);
    console.log(`✅ Synced: ${syncedCount}`);
    console.log(`✓ Already exist: ${alreadyExistCount}`);
    console.log(`❌ Failed: ${failedCount}`);

    if (failedModels.length > 0) {
      console.log(`\nFailed models: ${failedModels.join(', ')}`);
    }

    // Final verification
    const [tableCount] = await sequelize.query(`
      SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'dbo' AND TABLE_TYPE = 'BASE TABLE'
    `);

    console.log(`\n📊 Final database state:`);
    console.log(`   Total tables: ${tableCount[0].count}`);
    console.log(`═══════════════════════════════════════════════\n`);

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
