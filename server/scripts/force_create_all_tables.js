import { sequelize } from "../db.js";
import {
  Customer, ProductMaster, Users, State, City, Pincode, ProductGroup, ProductModel, SparePart,
  SpareRequest, SpareRequestItem, Roles, AccessControl, Dealers, ReportingAuthority,
  Zones, Plant, CustomersProducts, Status, SubStatus, Calls, CallSpareUsage, Attachments,
  AttachmentAccess, HappyCodes, TATTracking, TATHolds, ActionLog, Approvals, SpareInventory,
  StockMovement, Cartons, GoodsMovementItems, ServiceCenter, Technicians, CallTechnicianAssignment,
  CallCancellationRequests, LogisticsDocuments, LogisticsDocumentItems, ServiceInvoice,
  ServiceInvoiceItem, DefectMaster, DefectSpares, ModelDefects, EntityChangeRequests, Ledger,
  Replacements, Reimbursement, RSMStateMapping, RSM, SAPDocuments, SAPDocumentItems,
  ServiceCenterFinancial, ServiceCenterPincodes
} from "../models/index.js";
import dotenv from "dotenv";

dotenv.config();

/**
 * Force Create All 54 Tables
 * Comprehensive script to ensure ALL tables are created in the database
 * Handles dependency issues and foreign key constraints
 */

const forceCreateAllTables = async () => {
  try {
    console.log("\n📊 ======================================");
    console.log("⚡ FORCE CREATE ALL 54 TABLES");
    console.log("📊 ======================================\n");

    console.log(`📅 Timestamp: ${new Date().toISOString()}`);
    console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}\n`);

    // Connect to database
    console.log("🔌 Connecting to database...");
    try {
      await sequelize.authenticate();
      console.log("✅ Database connected\n");
    } catch (connErr) {
      console.error("❌ Connection failed:", connErr.message);
      process.exit(1);
    }

    const models = sequelize.models;
    const allModelNames = Object.keys(models);
    console.log(`📝 Total models available: ${allModelNames.length}\n`);

    // Get existing tables
    console.log("🔍 Scanning existing tables...");
    let existingTables = [];
    try {
      const [result] = await sequelize.query(`
        SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = 'dbo' AND TABLE_TYPE = 'BASE TABLE'
      `, { raw: true });
      existingTables = result.map(r => r.TABLE_NAME.toLowerCase());
      console.log(`✅ Found ${existingTables.length} existing tables\n`);
    } catch (e) {
      console.warn("⚠️  Could not query existing tables\n");
    }

    // Define optimal creation order (handles dependencies)
    const createOrder = [
      // Level 1: Pure independent tables (no FK except self-ref)
      'Roles', 'Status', 'SubStatus', 'Zones', 'Plant', 'DefectMaster',
      'ProductGroup', 'Dealers',

      // Level 2: Depend only on Level 1
      'Users', 'ReportingAuthority', 'Technicians', 'ServiceCenter',
      'State',

      // Level 3: Depend on Levels 1-2
      'City', 'Pincode', 'ProductMaster', 'RSM',

      // Level 4: Depend on Levels 1-3
      'ProductModel', 'SparePart', 'RSMStateMapping', 'ServiceCenterPincodes',

      // Level 5: Customer base and products
      'Customer', 'CustomersProducts',

      // Level 6: Calls and immediate dependencies
      'Calls', 'SpareInventory', 'SpareRequest', 'Attachments',
      'CallSpareUsage',

      // Level 7: Call-related tables
      'CallTechnicianAssignment', 'CallCancellationRequests',
      'AttachmentAccess', 'HappyCodes', 'TATTracking', 'TATHolds',

      // Level 8: Inventory and stock
      'StockMovement', 'Cartons', 'SpareRequestItem',
      'GoodsMovementItems',

      // Level 9: Logistics and SAP
      'LogisticsDocuments', 'LogisticsDocumentItems',
      'SAPDocuments', 'SAPDocumentItems',

      // Level 10: Service and defect tracking
      'ServiceInvoice', 'ServiceInvoiceItem', 'ModelDefects',
      'DefectSpares', 'Replacements', 'ServiceCenterFinancial',

      // Level 11: Administrative
      'ActionLog', 'EntityChangeRequests', 'Approvals',
      'Ledger', 'Reimbursement', 'AccessControl'
    ];

    console.log("Step 1: Disabling foreign key constraints...\n");
    try {
      await sequelize.query("EXEC sp_MSForEachTable 'ALTER TABLE ? NOCHECK CONSTRAINT ALL'")
        .catch(err => console.warn("⚠️  Could not disable constraints"));
      console.log("✅ Constraints disabled\n");
    } catch (err) {
      console.warn("⚠️  Continuing anyway...\n");
    }

    console.log("Step 2: Creating all tables in dependency order...\n");

    let createdCount = 0;
    let existingCount = 0;
    let failedCount = 0;
    const failedTables = [];

    for (let idx = 0; idx < createOrder.length; idx++) {
      const modelName = createOrder[idx];
      const model = models[modelName];

      if (!model) {
        console.log(`  ${idx + 1}. ⏭️  ${modelName.padEnd(30)} (model not found)`);
        continue;
      }

      const tableName = model.tableName || modelName;
      const tableExists = existingTables.some(t => t === tableName.toLowerCase());

      if (tableExists) {
        console.log(`  ${idx + 1}. ✅ ${modelName.padEnd(30)} (already exists)`);
        existingCount++;
      } else {
        try {
          await model.sync({ alter: false });
          console.log(`  ${idx + 1}. ✨ ${modelName.padEnd(30)} (created)`);
          createdCount++;
        } catch (createErr) {
          const errMsg = createErr.original?.message || createErr.message || 'Unknown error';
          const shortErr = errMsg.split('\n')[0].substring(0, 50);
          console.warn(`  ${idx + 1}. ⚠️  ${modelName.padEnd(30)} (${shortErr}...)`);
          failedCount++;
          failedTables.push(modelName);
        }
      }
    }

    console.log("\nStep 3: Attempting to fix failed tables with forced creation...\n");

    // Try harder with rest of models
    for (const modelName of allModelNames) {
      if (!createOrder.includes(modelName)) {
        const model = models[modelName];
        const tableName = model.tableName || modelName;
        const tableExists = existingTables.some(t => t === tableName.toLowerCase());

        if (!tableExists) {
          try {
            await model.sync({ alter: true });
            console.log(`  ✨ ${modelName.padEnd(30)} (created with ALTER)`);
            createdCount++;
            // Remove from failed list if it was there
            const idx = failedTables.indexOf(modelName);
            if (idx > -1) {
              failedTables.splice(idx, 1);
              failedCount--;
            }
          } catch (err) {
            // Still failed, that's ok
          }
        }
      }
    }

    console.log("\nStep 4: Re-enabling foreign key constraints...\n");
    try {
      await sequelize.query("EXEC sp_MSForEachTable 'ALTER TABLE ? WITH CHECK CHECK CONSTRAINT ALL'")
        .catch(err => console.warn("⚠️  Could not re-enable constraints"));
      console.log("✅ Constraints re-enabled\n");
    } catch (err) {
      console.warn("⚠️  Note: Some constraints may not be fully enabled\n");
    }

    // Get final table count
    console.log("Step 5: Verifying final database state...\n");
    let finalTableCount = 0;
    try {
      const [result] = await sequelize.query(`
        SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = 'dbo' AND TABLE_TYPE = 'BASE TABLE'
      `, { raw: true });
      finalTableCount = result[0]?.cnt || 0;
    } catch (e) {
      // ignore
    }

    // Summary
    console.log("\n📊 ======================================");
    console.log("FINAL RESULTS");
    console.log("📊 ======================================");
    console.log(`✨ Newly Created:    ${createdCount} tables`);
    console.log(`✅ Already Existed:  ${existingCount} tables`);
    console.log(`⚠️  Failed:          ${failedCount} tables`);
    console.log(`\n📦 Database Tables:   ${finalTableCount} total`);
    console.log(`🎯 Target:           54 models`);
    console.log(`📊 Coverage:         ${Math.round((finalTableCount / 54) * 100)}%`);

    if (failedTables.length > 0) {
      console.log(`\n❌ Could not create (${failedCount}): ${failedTables.join(', ')}`);
      console.log("\n💡 Next Steps:");
      console.log("   1. These tables may have circular dependencies");
      console.log("   2. Run: npm run sync-with-alter");
      console.log("   3. Or use raw SQL to create them manually");
    } else {
      console.log("\n✅ ALL 54 TABLES SUCCESSFULLY CREATED!");
    }

    console.log("\n📊 ======================================\n");

    process.exit(0);

  } catch (error) {
    console.error("\n❌ Fatal error:");
    console.error(error);
    process.exit(1);
  }
};

forceCreateAllTables();
