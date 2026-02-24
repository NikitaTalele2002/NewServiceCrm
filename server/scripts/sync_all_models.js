import { sequelize } from "../models/index.js";
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const logPath = path.resolve(process.cwd(), 'sync_all_models.log');
fs.writeFileSync(logPath, `Full model sync run at ${new Date().toISOString()}\n\n`);

// Dependency-ordered list: base tables first, then dependent tables
const syncOrder = [
  // Base tables (no dependencies)
  'State', 'City', 'Pincode', 'ProductGroup', 'ProductModel',
  'Plant', 'Zones', 'Dealers', 'ServiceCenter', 'ReportingAuthority',
  'Roles', 'AccessControl', 'DefectMaster',
  'Status', 'SubStatus',
  
  // User-related
  'Users',
  
  // Product/Spare tables
  'Product', 'SparePart', 'ModelDefects',
  
  // Technician
  'Technicians',
  
  // Customer-related
  'Customer', 'CustomersProducts',
  
  // Inventory/Stock
  'SpareInventory', 'StockMovement',
  
  // Calls and dependent tables
  'Calls', 'HappyCodes', 'TATTracking', 'TATHolds',
  'CallSpareUsage', 'CallTechnicianAssignment', 'CallCancellationRequests',
  'Replacements',
  
  // Spare request/logistics
  'SpareRequest', 'SpareRequestItem',
  
  // Cartons and goods movement
  'Cartons', 'GoodsMovementItems',
  
  // Service invoices
  'ServiceInvoice', 'ServiceInvoiceItem',
  
  // SAP/Logistics documents
  'DefectSpares', 'SAPDocumentItems', 'LogisticsDocuments', 'LogisticsDocumentItems',
  'Approvals', 'EntityChangeRequests', 'Ledger', 'Reimbursement',
  'RSMStateMapping', 'SAPDocuments', 'ServiceCenterFinancialYear',
  'ServiceCenterPincodes',
  
  // Attachments (last, as they may reference other entities)
  'Attachments', 'AttachmentAccess'
];

const run = async () => {
  try {
    console.log('🔌 Testing DB connection...');
    await sequelize.authenticate();
    console.log('✅ Connected\n');

    let successCount = 0;
    let failureCount = 0;
    const failures = [];

    for (const modelName of syncOrder) {
      const model = sequelize.models[modelName];
      if (!model) {
        const msg = `⏭️  ${modelName} - model not found`;
        console.log(msg);
        fs.appendFileSync(logPath, msg + '\n');
        continue;
      }

      try {
        process.stdout.write(`⏳ Syncing ${modelName}... `);
        // Use force:false to preserve existing tables
        await model.sync({ force: false, alter: false });
        const ok = `✅ Synced`;
        console.log(ok);
        fs.appendFileSync(logPath, `${modelName} - synced successfully\n`);
        successCount++;
      } catch (err) {
        const message = err.original?.message || err.message || String(err);
        const sql = err.original?.sql || '';
        const stack = err.stack || '';
        console.log(`❌ FAILED`);
        
        const out = [`${modelName} - FAILED\nError: ${message}\nSQL: ${sql}\nSTACK: ${stack}\n---`].join('\n');
        fs.appendFileSync(logPath, out + '\n\n');
        failureCount++;
        failures.push(modelName);
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`✅ Successfully synced: ${successCount}`);
    console.log(`❌ Failed: ${failureCount}`);
    if (failures.length > 0) {
      console.log(`\nFailed models: ${failures.join(', ')}`);
    }
    console.log(`\n➡️  Full details: sync_all_models.log`);
    process.exit(failureCount > 0 ? 1 : 0);
  } catch (e) {
    console.error('Fatal error:', e.message || e);
    fs.appendFileSync(logPath, `Fatal: ${e.stack || e}\n`);
    process.exit(1);
  }
};

run();
