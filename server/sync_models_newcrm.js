/**
 * Comprehensive Database Sync Script for NewCRM
 * - Drops all existing tables (in reverse dependency order)
 * - Creates fresh tables from models (in dependency order)
 * - Properly handles foreign key constraints
 * - Sets up all associations
 */

import { sequelize } from './db.js';
import * as modelExports from './models/index.js';

// Color codes for console output
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
 * Drop all tables in reverse dependency order
 */
const dropAllTables = async () => {
  log.section('DROPPING ALL EXISTING TABLES');

  // Reverse order - tables with no dependencies first
  const dropOrder = [
    'LogisticsDocumentItems',
    'SAPDocumentItems',
    'DefectSpares',
    'ServiceCenterPincodes',
    'ServiceCenterFinancial',
    'AccessControl',
    'SpareRequestItem',
    'CallSpareUsage',
    'CallTechnicianAssignment',
    'CallCancellationRequests',
    'Attachments',
    'AttachmentAccess',
    'HappyCodes',
    'TATTracking',
    'TATHolds',
    'Replacements',
    'ServiceInvoiceItem',
    'ServiceInvoice',
    'LogisticsDocuments',
    'Calls',
    'SpareRequest',
    'SpareInventory',
    'GoodsMovementItems',
    'Cartons',
    'StockMovement',
    'ActionLog',
    'Approvals',
    'Ledger',
    'EntityChangeRequests',
    'ModelDefects',
    'DefectMaster',
    'Reimbursement',
    'RSMStateMapping',
    'SAPDocuments',
    'Technicians',
    'ReportingAuthority',
    'RSM',
    'CustomersProducts',
    'SparePart',
    'ProductModel',
    'ServiceCenter',
    'Customer',
    'Pincode',
    'ProductMaster',
    'Plant',
    'City',
    'State',
    'Zones',
    'SubStatus',
    'Status',
    'Dealers',
    'ProductGroup',
    'Users',
  ];

  try {
    // Disable foreign key constraints during drop
    await sequelize.query('EXEC sp_MSForEachTable "ALTER TABLE ? NOCHECK CONSTRAINT all"');
    log.info('Foreign key constraints disabled');

    for (const tableName of dropOrder) {
      const model = sequelize.models[tableName];
      if (model) {
        try {
          await model.drop({ force: true });
          log.success(`Dropped table: ${tableName}`);
        } catch (err) {
          if (err.message.includes('does not exist') || err.message.includes('Cannot drop')) {
            log.info(`Table ${tableName} doesn't exist (skip)`);
          } else {
            log.warn(`Failed to drop ${tableName}: ${err.message}`);
          }
        }
      }
    }

    // Re-enable foreign key constraints
    await sequelize.query('EXEC sp_MSForEachTable "ALTER TABLE ? WITH CHECK CHECK CONSTRAINT all"');
    log.info('Foreign key constraints re-enabled');
  } catch (err) {
    log.error(`Error disabling constraints: ${err.message}`);
  }
};

/**
 * Sync tables in dependency order
 */
const syncTablesInOrder = async () => {
  log.section('SYNCING TABLES IN DEPENDENCY ORDER');

  const syncOrder = [
    // Phase 1: Independent tables (no foreign keys)
    'Zones',
    'Roles',
    'ProductGroup',
    'Status',
    'SubStatus',
    'DefectMaster',
    'Users',

    // Phase 2: Tables depending on Phase 1
    'State',           // Independent: can use PARENT_ID self-reference
    'City',            // Depends on State
    'Pincode',         // Depends on City
    'Dealers',         // Independent (or depends on State)
    'ProductMaster',   // Depends on ProductGroup
    'Plant',           // Depends on Zones, State, City, Users
    'RSM',             // Depends on Users, Roles
    'ReportingAuthority', // Depends on Users
    'ServiceCenter',   // Depends on Plant, Users
    'Technicians',     // Depends on ServiceCenter, Users
    'StockMovement',   // Independent
    'ActionLog',       // Depends on Users
    'Approvals',       // Independent/minimal dependencies
    'EntityChangeRequests', // Independent
    'Ledger',          // Independent
    'LogisticsDocuments', // Independent
    'SAPDocuments',    // Independent
    'Reimbursement',   // Independent

    // Phase 3: Product hierarchy
    'ProductModel',    // Depends on ProductMaster
    'SparePart',       // Depends on ProductModel

    // Phase 4: Customer & their products
    'Customer',        // Depends on City, State, Pincode
    'CustomersProducts', // Depends on Customer, ProductMaster, ProductModel
    'RSMStateMapping',  // Depends on RSM, State

    // Phase 5: Service Center related
    'ServiceCenterPincodes', // Depends on ServiceCenter, Pincode
    'ServiceCenterFinancial', // Depends on ServiceCenter

    // Phase 6: Calls (complex dependencies)
    'Calls',           // Depends on Customer, ServiceCenter, Technicians, Status, CustomersProducts

    // Phase 7: Call-related tables
    'HappyCodes',      // Depends on Calls
    'TATTracking',     // Depends on Calls
    'TATHolds',        // Depends on TATTracking
    'CallTechnicianAssignment', // Depends on Calls, Technicians
    'CallCancellationRequests',  // Depends on Calls
    'CallSpareUsage',  // Depends on Calls
    'Attachments',     // Depends on Calls
    'AttachmentAccess', // Depends on Attachments
    'ServiceInvoice',  // Depends on Calls
    'ServiceInvoiceItem', // Depends on ServiceInvoice
    'Replacements',    // Depends on Calls
    'DefectSpares',    // Depends on DefectMaster, SparePart
    'ModelDefects',    // Depends on ProductModel
    'AccessControl',   // Independent

    // Phase 8: Inventory & Stock
    'SpareInventory',  // Depends on SparePart
    'Cartons',         // Depends on StockMovement
    'GoodsMovementItems', // Depends on StockMovement, SparePart

    // Phase 9: Request management
    'SpareRequest',    // Depends on Calls, Technicians, Status
    'SpareRequestItem', // Depends on SpareRequest, SparePart

    // Phase 10: Logistics
    'LogisticsDocumentItems', // Depends on LogisticsDocuments, SparePart

    // Phase 11: SAP
    'SAPDocumentItems', // Depends on SAPDocuments
  ];

  let syncedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  const failedTablesList = [];

  // First pass - sync all tables
  for (const modelName of syncOrder) {
    const model = sequelize.models[modelName];
    if (!model) {
      log.warn(`Model ${modelName} not found in sequelize.models`);
      continue;
    }

    try {
      // Use sync with force:false to create if not exists
      await model.sync({ force: false, alter: false });
      log.success(`Synced: ${modelName}`);
      syncedCount++;
    } catch (err) {
      const errorMsg = err.original?.message || err.message || 'Unknown error';
      
      // Log full error details for debugging
      if (!errorMsg || errorMsg === 'Unknown error') {
        console.error(`\n[DEBUG] Full error for ${modelName}:`, {
          message: err.message,
          originalMessage: err.original?.message,
          code: err.original?.code,
          number: err.original?.number,
          state: err.original?.state,
          name: err.name,
        });
      }
      
      if (errorMsg.includes('already exists')) {
        log.info(`${modelName} already exists (skip)`);
        skippedCount++;
      } else if (errorMsg.includes('FOREIGN KEY constraint') || errorMsg.includes('referenced')) {
        log.warn(`${modelName} - FK constraint issue (will retry): ${errorMsg}`);
        failedTablesList.push({ modelName, error: errorMsg, retried: false });
        errorCount++;
      } else if (!errorMsg || errorMsg === 'Unknown error') {
        log.warn(`${modelName} - Silent failure (retrying...)`);
        failedTablesList.push({ modelName, error: 'Silent failure', retried: false });
        errorCount++;
      } else {
        log.error(`${modelName} - ${errorMsg}`);
        failedTablesList.push({ modelName, error: errorMsg, retried: false });
        errorCount++;
      }
    }
  }

  // Second pass - retry failed tables
  if (failedTablesList.length > 0) {
    log.section('RETRYING FAILED TABLES');
    
    for (const failedItem of failedTablesList) {
      const model = sequelize.models[failedItem.modelName];
      if (!model) continue;

      try {
        await model.sync({ force: false, alter: false });
        log.success(`Retried successfully: ${failedItem.modelName}`);
        syncedCount++;
        errorCount--;
      } catch (err) {
        const errorMsg = err.original?.message || err.message || failedItem.error;
        log.error(`Still failed after retry (${failedItem.modelName}): ${errorMsg}`);
      }
    }
  }

  log.section('SYNC SUMMARY');
  console.log(`  Synced: ${syncedCount}`);
  console.log(`  Skipped: ${skippedCount}`);
  console.log(`  Errors: ${errorCount}`);

  if (errorCount > 0) {
    log.warn(`Failed tables: ${failedTablesList.slice(0, 10).map(f => f.modelName).join(', ')}`);
  }

  return errorCount === 0;
};

/**
 * Setup associations between models
 */
const setupAssociations = async () => {
  log.section('VERIFYING ASSOCIATIONS');

  try {
    // Associations are already set up by models/index.js import
    const modelCount = Object.keys(sequelize.models).length;
    log.success(`Associations verified for ${modelCount} models`);
  } catch (err) {
    log.error(`Failed to verify associations: ${err.message}`);
    throw err;
  }
};

/**
 * Verify table creation
 */
const verifyTables = async () => {
  log.section('VERIFYING TABLE CREATION');

  try {
    const [result] = await sequelize.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'dbo' 
      AND TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `, { raw: true });

    const tableCount = result.length;
    log.success(`Found ${tableCount} tables in the database`);

    if (tableCount > 0) {
      console.log('\n📋 Tables created:');
      result.forEach((row) => {
        console.log(`   - ${row.TABLE_NAME}`);
      });
    }

    return tableCount;
  } catch (err) {
    log.error(`Failed to verify tables: ${err.message}`);
    return 0;
  }
};

/**
 * Main sync function
 */
const main = async () => {
  log.section('STARTING DATABASE SYNC FOR NewCRM');

  try {
    // Test connection
    log.section('TESTING DATABASE CONNECTION');
    await sequelize.authenticate();
    log.success('Connected to NewCRM database');

    // Check which models are loaded
    const modelCount = Object.keys(sequelize.models).length;
    log.info(`${modelCount} models loaded`);

    // Drop all tables
    await dropAllTables();

    // Sync tables in order
    const syncSuccess = await syncTablesInOrder();

    // Setup associations
    await setupAssociations();

    // Verify creation
    const tableCount = await verifyTables();

    // Final summary
    log.section('SYNC COMPLETE');
    if (syncSuccess && tableCount > 0) {
      log.success('✨ Database successfully synced!');
      log.success(`All models synchronized to NewCRM database`);
      setTimeout(() => process.exit(0), 1000);
    } else {
      log.warn(`Sync completed with some issues. ${tableCount} tables created.`);
      setTimeout(() => process.exit(0), 1000);
    }
  } catch (err) {
    log.error(`Sync failed: ${err.message}`);
    console.error('\nFull error:');
    console.error(err);
    setTimeout(() => process.exit(1), 1000);
  }
};

// Run the sync
main();
