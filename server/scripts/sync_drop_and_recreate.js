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
 * Aggressive Database Sync Script
 * Drops and recreates problematic tables
 * WARNING: This will delete data from these tables!
 */

const syncDropAndRecreate = async () => {
  try {
    console.log("\n📊 ======================================");
    console.log("⚠️  DROP & RECREATE SYNC (DATA LOSS!)");
    console.log("📊 ======================================\n");
    
    console.log(`📅 Timestamp: ${new Date().toISOString()}`);
    console.log("⚠️  WARNING: This will DROP tables and DELETE all data!");
    console.log("    Make sure to backup your database first!\n");
    
    // Test database connection
    console.log("🔌 Testing database connection...");
    try {
      await sequelize.authenticate();
      console.log("✅ Database connection successful\n");
    } catch (connErr) {
      console.error("❌ Database connection failed:", connErr.message);
      process.exit(1);
    }

    const models = sequelize.models;

    // Tables to drop and recreate (those that failed)
    const dropTables = [
      'ActionLog', 'Ledger', 'Customer', 'CustomersProducts', 'Calls', 'HappyCodes',
      'TATTracking', 'TATHolds', 'CallTechnicianAssignment', 'CallCancellationRequests',
      'CallSpareUsage', 'ServiceInvoice', 'ServiceInvoiceItem', 'Replacements',
      'ServiceCenterFinancial', 'SpareRequest', 'SpareRequestItem', 'GoodsMovementItems'
    ];

    console.log("Step 1: Disabling all foreign key constraints...\n");
    
    try {
      await sequelize.query("EXEC sp_MSForEachTable 'ALTER TABLE ? NOCHECK CONSTRAINT ALL'")
        .catch(err => console.warn("⚠️  Could not disable constraints"));
      console.log("✅ Constraints disabled\n");
    } catch (err) {
      console.warn("⚠️  Note: Continuing anyway...\n");
    }

    console.log("Step 2: Dropping problematic tables...\n");
    
    let droppedCount = 0;
    for (const tableName of dropTables) {
      const model = models[tableName];
      if (!model) continue;

      const actualTableName = model.tableName || tableName;
      
      try {
        // Check if table exists
        const [result] = await sequelize.query(`
          SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
          WHERE TABLE_NAME = '${actualTableName}' AND TABLE_SCHEMA = 'dbo'
        `, { raw: true });

        if (result && result.length > 0) {
          // Drop the table
          await sequelize.query(`DROP TABLE [dbo].[${actualTableName}]`);
          console.log(`  ✅ Dropped: ${tableName}`);
          droppedCount++;
        } else {
          console.log(`  ⏭️  Skipped: ${tableName} (doesn't exist)`);
        }
      } catch (dropErr) {
        console.warn(`  ⚠️  Could not drop ${tableName}: ${dropErr.message.split('\n')[0]}`);
      }
    }
    console.log();

    console.log("Step 3: Recreating tables from models...\n");
    
    let recreatedCount = 0;
    let failedCount = 0;
    const failedTables = [];

    // Recreate tables in dependency order
    const recreateOrder = [
      'ActionLog', 'Ledger', 'Customer', 'CustomersProducts', 'Calls',
      'HappyCodes', 'TATTracking', 'TATHolds', 'CallTechnicianAssignment',
      'CallCancellationRequests', 'CallSpareUsage', 'ServiceInvoice',
      'ServiceInvoiceItem', 'Replacements', 'ServiceCenterFinancial',
      'SpareRequest', 'SpareRequestItem', 'GoodsMovementItems'
    ];

    for (const tableName of recreateOrder) {
      const model = models[tableName];
      if (!model) continue;

      try {
        await model.sync({ alter: false, force: false });
        console.log(`  ✅ Created: ${tableName}`);
        recreatedCount++;
      } catch (createErr) {
        const errMsg = createErr.original?.message || createErr.message || 'Unknown error';
        console.warn(`  ⚠️  Failed: ${tableName} - ${errMsg.split('\n')[0]}`);
        failedCount++;
        failedTables.push(tableName);
      }
    }
    console.log();

    console.log("Step 4: Re-enabling foreign key constraints...\n");
    
    try {
      await sequelize.query("EXEC sp_MSForEachTable 'ALTER TABLE ? WITH CHECK CHECK CONSTRAINT ALL'")
        .catch(err => console.warn("⚠️  Could not enable constraints"));
      console.log("✅ Constraints re-enabled\n");
    } catch (err) {
      console.warn("⚠️  Note: Could not fully enable constraints\n");
    }

    // Summary
    console.log("\n📊 ======================================");
    console.log("RESULTS");
    console.log("📊 ======================================");
    console.log(`🗑️  Dropped:     ${droppedCount} tables`);
    console.log(`✨ Recreated:   ${recreatedCount} tables`);
    console.log(`⚠️  Failed:      ${failedCount} tables`);
    
    if (failedTables.length > 0) {
      console.log(`\n❌ Could not recreate: ${failedTables.join(', ')}`);
      console.log("   Check the error messages above for details");
    } else {
      console.log("\n✅ All tables successfully recreated!");
    }

    console.log("\n📊 ======================================\n");

    process.exit(0);

  } catch (error) {
    console.error("\n❌ Fatal error:");
    console.error(error);
    process.exit(1);
  }
};

syncDropAndRecreate();
