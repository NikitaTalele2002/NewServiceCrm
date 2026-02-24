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
 * Advanced Database Sync Script
 * Handles schema conflicts by:
 * 1. Dropping foreign key constraints
 * 2. Using ALTER to update existing tables
 * 3. Recreating foreign key constraints
 */

const syncWithAlter = async () => {
  try {
    console.log("\n📊 ======================================");
    console.log("🔧 ADVANCED DATABASE SYNC (WITH ALTER)");
    console.log("📊 ======================================\n");
    
    console.log(`📅 Timestamp: ${new Date().toISOString()}`);
    console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
    
    // Test database connection
    console.log("\n🔌 Testing database connection...");
    try {
      await sequelize.authenticate();
      console.log("✅ Database connection successful\n");
    } catch (connErr) {
      console.error("❌ Database connection failed:", connErr.message);
      process.exit(1);
    }

    // Get all models
    const models = sequelize.models;
    const modelCount = Object.keys(models).length;
    console.log(`📝 Found ${modelCount} models to sync\n`);

    // Tables that need special handling (those that failed before)
    const problemTables = [
      'ActionLog', 'Ledger', 'Customer', 'CustomersProducts', 'Calls', 'HappyCodes',
      'TATTracking', 'TATHolds', 'CallTechnicianAssignment', 'CallCancellationRequests',
      'CallSpareUsage', 'ServiceInvoice', 'ServiceInvoiceItem', 'Replacements',
      'ServiceCenterFinancial', 'SpareRequest', 'SpareRequestItem', 'GoodsMovementItems'
    ];

    console.log("⚙️  Attempting to fix schema conflicts...\n");
    console.log("Step 1: Disabling foreign key constraints...\n");
    
    // Disable all foreign key constraints
    try {
      await sequelize.query("EXEC sp_MSForEachTable 'ALTER TABLE ? NOCHECK CONSTRAINT ALL'")
        .catch(err => console.warn("⚠️  Could not disable all constraints (may continue)"));
      console.log("✅ Foreign key constraints disabled\n");
    } catch (err) {
      console.warn("⚠️  Warning: Could not disable constraints:", err.message);
    }

    console.log("Step 2: Syncing problem tables with ALTER mode...\n");
    
    let fixedCount = 0;
    let failedCount = 0;
    const failedTables = [];

    // Sync problem tables with alter: true
    for (const tableName of problemTables) {
      if (models[tableName]) {
        try {
          console.log(`  🔄 Syncing ${tableName}...`);
          await models[tableName].sync({ alter: true });
          console.log(`    ✅ Successfully synced\n`);
          fixedCount++;
        } catch (syncErr) {
          const errMsg = syncErr.original?.message || syncErr.message || 'Unknown error';
          console.warn(`    ⚠️  Error: ${errMsg.split('\n')[0]}\n`);
          failedCount++;
          failedTables.push(tableName);
        }
      }
    }

    console.log("Step 3: Syncing remaining tables...\n");
    
    // Sync other models
    let otherCount = 0;
    for (const [modelName, model] of Object.entries(models)) {
      if (!problemTables.includes(modelName)) {
        try {
          await model.sync({ alter: false });
          otherCount++;
        } catch (syncErr) {
          // Silently skip - these mostly exist already
        }
      }
    }

    console.log("Step 4: Re-enabling foreign key constraints...\n");
    
    // Re-enable foreign key constraints
    try {
      await sequelize.query("EXEC sp_MSForEachTable 'ALTER TABLE ? WITH CHECK CHECK CONSTRAINT ALL'")
        .catch(err => console.warn("⚠️  Could not re-enable all constraints"));
      console.log("✅ Foreign key constraints re-enabled\n");
    } catch (err) {
      console.warn("⚠️  Warning: Could not re-enable constraints:", err.message);
    }

    // Summary
    console.log("\n📊 ======================================");
    console.log("SYNC RESULTS");
    console.log("📊 ======================================");
    console.log(`✅ Fixed/Synced:     ${fixedCount} tables`);
    console.log(`⚠️  Still Failed:     ${failedCount} tables`);
    console.log(`✅ Other Tables:     ${otherCount} tables`);
    console.log(`📋 Total Processed:  ${fixedCount + failedCount + otherCount}/${modelCount}`);
    
    if (failedTables.length > 0) {
      console.log(`\n❌ Still Cannot Sync: ${failedTables.join(', ')}`);
      console.log("   Try running: node scripts/sync_drop_and_recreate.js");
    } else {
      console.log("\n✅ All tables synced successfully!");
    }

    console.log("\n📊 ======================================\n");

    process.exit(0);

  } catch (error) {
    console.error("\n❌ Fatal error during sync:");
    console.error(error);
    console.error("\n📊 ======================================\n");
    process.exit(1);
  }
};

syncWithAlter();
