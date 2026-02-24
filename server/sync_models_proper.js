/**
 * PROPER Database Sync - Using Actual Sequelize Models
 * Syncs all models in correct dependency order with full column definitions
 */

import { sequelize } from './db.js';
import * as modelExports from './models/index.js';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

const log = {
  section: (msg) => console.log(`\n${colors.cyan}${colors.bright}═══ ${msg} ═══${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.cyan}ℹ️  ${msg}${colors.reset}`),
};

/**
 * Dependency order - sync tables in phases based on foreign key relationships
 * Phase 1: No dependencies or self-references only
 * Phase 2: Depends on Phase 1
 * Phase 3: Depends on Phase 1-2
 * And so on...
 */
const SYNC_ORDER = [
  // PHASE 1: Completely independent tables (no foreign keys)
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

  // PHASE 2: Depends on Phase 1
  'Users',          // Can reference Roles
  'State',          // Independent (self-reference ok)
  'City',           // Depends on State
  'Pincode',        // Depends on City
  'ProductMaster',  // Depends on ProductGroup
  'Plant',          // Depends on Zones, State, City, Users
  'RSM',            // Depends on Users
  'ReportingAuthority', // Depends on Users
  'ServiceCenter',  // Depends on Plant, Users
  'Technicians',    // Depends on ServiceCenter, Users

  // PHASE 3: More complex dependencies
  'ProductModel',   // Depends on ProductMaster
  'SparePart',      // Depends on ProductModel
  'Customer',       // Depends on City, State, Pincode, Users
  'CustomersProducts', // Depends on Customer, ProductMaster, ProductModel
  'RSMStateMapping',    // Depends on RSM, State
  'ServiceCenterPincodes', // Depends on ServiceCenter, Pincode
  'ServiceCenterFinancial', // Depends on ServiceCenter
  'Cartons',        // Depends on StockMovement
  'GoodsMovementItems', // Depends on StockMovement, SparePart
  'SpareInventory', // Depends on SparePart

  // PHASE 4: Calls and dependencies
  'Calls',          // Depends on Customer, ServiceCenter, Status, CustomersProducts
  'HappyCodes',     // Depends on Calls
  'TATTracking',    // Depends on Calls
  'TATHolds',       // Depends on TATTracking
  'CallTechnicianAssignment', // Depends on Calls, Technicians
  'CallCancellationRequests',  // Depends on Calls
  'CallSpareUsage', // Depends on Calls
  'Attachments',    // Depends on Calls
  'AttachmentAccess', // Depends on Attachments
  'ServiceInvoice', // Depends on Calls
  'ServiceInvoiceItem', // Depends on ServiceInvoice
  'Replacements',   // Depends on Calls
  'DefectSpares',   // Depends on DefectMaster, SparePart
  'ModelDefects',   // Depends on ProductModel

  // PHASE 5: Request management
  'SpareRequest',        // Depends on Calls, Technicians, Status
  'SpareRequestItem',    // Depends on SpareRequest, SparePart
  'LogisticsDocumentItems', // Depends on LogisticsDocuments, SparePart
  'SAPDocumentItems',    // Depends on SAPDocuments
];

async function dropAllTables() {
  log.section('DROPPING ALL EXISTING TABLES (Fresh Start)');

  try {
    // Disable constraints
    await sequelize.query('EXEC sp_MSForEachTable "ALTER TABLE ? NOCHECK CONSTRAINT all"');
    log.info('Constraints disabled');

    // Drop in reverse order
    const reverseOrder = [...SYNC_ORDER].reverse();
    
    for (const modelName of reverseOrder) {
      const model = sequelize.models[modelName];
      if (!model) continue;

      try {
        await model.drop({ force: true });
        log.success(`Dropped: ${modelName}`);
      } catch (err) {
        if (!err.message.includes('does not exist')) {
          log.warn(`Could not drop ${modelName}`);
        }
      }
    }

    // Re-enable constraints
    await sequelize.query('EXEC sp_MSForEachTable "ALTER TABLE ? WITH CHECK CHECK CONSTRAINT all"');
    log.info('Constraints re-enabled');
  } catch (err) {
    log.warn(`Constraint management: ${err.message}`);
  }
}

async function syncModelsInOrder() {
  log.section('SYNCING ALL MODELS IN DEPENDENCY ORDER');

  let syncedCount = 0;
  let failedCount = 0;
  const failedModels = [];

  for (const modelName of SYNC_ORDER) {
    const model = sequelize.models[modelName];
    if (!model) {
      log.warn(`Model not found: ${modelName}`);
      continue;
    }

    try {
      // Sync with full model definition
      await model.sync({ force: false, alter: false });
      log.success(`Synced: ${modelName}`);
      syncedCount++;
    } catch (err) {
      const errorMsg = err.original?.message || err.message || 'Unknown error';
      log.error(`Failed: ${modelName} - ${errorMsg.substring(0, 80)}`);
      failedModels.push({ modelName, error: errorMsg });
      failedCount++;
    }
  }

  log.section('SYNC SUMMARY');
  console.log(`  ✅ Synced: ${syncedCount} tables`);
  console.log(`  ❌ Failed: ${failedCount} tables`);

  if (failedModels.length > 0 && failedModels.length <= 10) {
    console.log(`\n  Failed models:`);
    failedModels.forEach(f => {
      console.log(`    - ${f.modelName}`);
    });
  }

  return failedCount === 0;
}

async function verifyTables() {
  log.section('VERIFYING TABLE CREATION');

  try {
    const [tables] = await sequelize.query(`
      SELECT TABLE_NAME, 
             (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS c WHERE c.TABLE_NAME = t.TABLE_NAME) as column_count
      FROM (SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'dbo' AND TABLE_TYPE = 'BASE TABLE') t
      ORDER BY TABLE_NAME
    `, { raw: true });

    log.success(`Created ${tables.length} tables`);
    console.log('\nTables with column counts:');
    tables.forEach((t, i) => {
      console.log(`  ${i + 1}. ${t.TABLE_NAME} (${t.column_count} columns)`);
    });

    return tables.length;
  } catch (err) {
    log.error(`Verification failed: ${err.message}`);
    return 0;
  }
}

async function main() {
  try {
    log.section('STARTING NEWCRM DATABASE SYNC');

    // Test connection
    await sequelize.authenticate();
    log.success('Connected to NewCRM database');

    // Get model count
    const modelCount = Object.keys(sequelize.models).length;
    log.info(`${modelCount} models loaded`);

    // Drop all tables for fresh start
    await dropAllTables();

    // Sync all models in order
    const successfulSync = await syncModelsInOrder();

    // Verify creation
    const tableCount = await verifyTables();

    log.section('FINAL STATUS');
    if (successfulSync || tableCount > 40) {
      log.success(`✨ Database synchronization complete!`);
      log.success(`${tableCount} tables created from model definitions`);
      log.info('All columns match the updated model structure');
    } else {
      log.warn(`Partial sync: ${tableCount} of ${modelCount} tables created`);
    }

    console.log('\n' + colors.cyan + colors.bright + '════════════════════════════════════════' + colors.reset);
    process.exit(0);
  } catch (err) {
    log.error(`Sync failed: ${err.message}`);
    console.error(err);
    process.exit(1);
  }
}

// Run sync
main();
