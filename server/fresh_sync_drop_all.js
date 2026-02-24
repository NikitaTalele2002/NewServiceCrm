/**
 * Drop all tables and sync with fresh Sequelize models
 */

import { sequelize } from './db.js';
import * as modelsModule from './models/index.js';

async function main() {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database\n');

    // Get all existing tables
    const tables = await sequelize.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_TYPE='BASE TABLE' AND TABLE_SCHEMA='dbo'
       ORDER BY TABLE_NAME DESC`,
      { raw: true }
    );

    console.log(`Found ${tables[0].length} existing tables\n`);
    console.log('📌 Disabling foreign key checks...');
    await sequelize.query(`EXEC sp_MSForEachTable 'ALTER TABLE ? NOCHECK CONSTRAINT all'`);
    console.log('✅ FK checks disabled\n');

    // Drop all tables in reverse order (to handle FKs)
    let dropped = 0;
    for (const t of tables[0]) {
      try {
        await sequelize.query(`DROP TABLE [${t.TABLE_NAME}]`);
        dropped++;
        console.log(`✅ Dropped: ${t.TABLE_NAME}`);
      } catch (err) {
        console.log(`⚠️  Could not drop ${t.TABLE_NAME}: ${err.message.substring(0, 40)}`);
      }
    }

    console.log(`\n✅ Dropped ${dropped} tables`);
    console.log('\n📌 Re-enabling foreign key checks...');
    await sequelize.query(`EXEC sp_MSForEachTable 'ALTER TABLE ? WITH CHECK CHECK CONSTRAINT all'`);
    console.log('✅ FK checks enabled\n');

    // Now sync all models in order
    console.log('═══ SYNCING ALL MODELS ═══\n');

    const SYNC_ORDER = [
      'Roles',
      'Zones', 
      'ProductGroup',
      'Status',
      'SubStatus',
      'State',
      'City',
      'Pincode',
      'ProductMaster', 
      'ProductModel',
      'Users',
      'Dealers',
      'ReportingAuthority',
      'Plant',
      'AccessControl',
      'ServiceCenter',
      'RSM',
      'AttachmentAccess',
      'Attachments',
      'Customer',
      'CustomersProducts',
      'SparePart',
      'CallSpareUsage',
      'Cartons',
      'StockMovement',
      'Calls',
      'HappyCodes',
      'TATTracking',
      'TATHolds',
      'Approvals',
      'SpareInventory',
      'Technicians',
      'CallTechnicianAssignment',
      'CallCancellationRequests',
      'LogisticsDocuments',
      'LogisticsDocumentItems',
      'GoodsMovementItems',
      'ServiceInvoice',
      'ServiceInvoiceItem',
      'DefectMaster',
      'DefectSpares',
      'ModelDefects',
      'EntityChangeRequests',
      'Ledger',
      'Replacements',
      'Reimbursement',
      'RSMStateMapping',
      'SAPDocuments',
      'SAPDocumentItems',
      'ServiceCenterFinancial',
      'ServiceCenterPincodes',
      'SpareRequest',
      'SpareRequestItem'
    ];

    let syncedCount = 0;
    let failedCount = 0;
    const failedModels = [];

    for (const modelName of SYNC_ORDER) {
      const model = sequelize.models[modelName];
      if (!model) {
        console.log(`⚠️  ${modelName} not found in sequelize.models`);
        continue;
      }

      try {
        await model.sync({ force: false, alter: false });
        syncedCount++;
        console.log(`✅ ${modelName}`);
      } catch (err) {
        failedCount++;
        failedModels.push(modelName);
        console.log(`❌ ${modelName} - ${(err.message || 'silent error').substring(0, 40)}`);
      }
    }

    console.log(`\n\n═══ FINAL SUMMARY ═══`);
    console.log(`✅ Synced: ${syncedCount}`);
    console.log(`❌ Failed: ${failedCount}`);
    
    if (failedModels.length > 0) {
      console.log(`\nFailed models:`);
      failedModels.forEach(m => console.log(`  - ${m}`));
    }

    // Verify final count
    const verify = await sequelize.query(
      `SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_TYPE='BASE TABLE' AND TABLE_SCHEMA='dbo'`,
      { raw: true, type: sequelize.QueryTypes.SELECT }
    );
    
    console.log(`\n📊 Total tables in database: ${verify[0].cnt}`);

    await sequelize.close();
  } catch (err) {
    console.error('Fatal error:', err.message);
    process.exit(1);
  }
}

main();
