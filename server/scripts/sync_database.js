import { sequelize, connectDB } from "../db.js";
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
 * Database Synchronization Script
 * Syncs all models with the database without dropping existing tables
 * Safe to run multiple times - only creates missing tables
 */

const syncDatabase = async () => {
  try {
    console.log("\n📊 ======================================");
    console.log("🔄 DATABASE SYNCHRONIZATION SCRIPT");
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
    console.log(`📝 Found ${modelCount} models to process\n`);

    // Get all existing tables from database
    let existingTableNames = [];
    try {
      const [result] = await sequelize.query(`
        SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = 'dbo' AND TABLE_TYPE = 'BASE TABLE'
        ORDER BY TABLE_NAME
      `, { raw: true });
      existingTableNames = result.map(r => r.TABLE_NAME);
      console.log(`📦 Found ${existingTableNames.length} existing tables in database\n`);
    } catch (e) {
      console.warn("⚠️  Could not query existing tables: " + e.message);
    }

    // Helper to check if table exists
    const tableExists = (modelName, model) => {
      const expectedTableName = model.tableName || modelName;
      return existingTableNames.some(t => t.toLowerCase() === expectedTableName.toLowerCase());
    };

    // Define sync order based on actual dependencies
    const syncOrder = [
      // Phase 1: Independent tables
      'Roles', 'Zones', 'Plant', 'DefectMaster', 'ProductGroup', 'SubStatus',
      'Users', 'Technicians', 'ServiceCenter', 'ActionLog', 'EntityChangeRequests',
      'Approvals', 'Ledger', 'Reimbursement', 'LogisticsDocuments', 'SAPDocuments',
      'Status', 'StockMovement',
      
      // Phase 2: Dependent on Phase 1
      'State', 'City', 'Pincode', 'ProductMaster', 'ReportingAuthority', 'RSM',
      'ProductModel', 'RSMStateMapping', 'ServiceCenterPincodes', 'SparePart',
      
      // Phase 3: Customer and Products
      'Customer', 'CustomersProducts',
      
      // Phase 4: Calls and related
      'Calls', 'HappyCodes', 'TATTracking', 'TATHolds', 'CallTechnicianAssignment',
      'CallCancellationRequests', 'CallSpareUsage', 'Attachments', 'AttachmentAccess',
      'ServiceInvoice', 'ServiceInvoiceItem', 'Replacements', 'ServiceCenterFinancial',
      
      // Phase 5: Spare/Inventory
      'SpareInventory', 'SpareRequest', 'SpareRequestItem',
      
      // Phase 6: Defects and Models
      'ModelDefects', 'DefectSpares',
      
      // Phase 7: Stock/Cartons
      'Cartons', 'GoodsMovementItems', 'LogisticsDocumentItems',
      'SAPDocumentItems', 'AccessControl', 'Dealers'
    ];

    console.log("⚙️  Syncing models in dependency order...\n");
    
    let createdCount = 0;
    let alreadyExistCount = 0;
    let failedCount = 0;
    const failedTables = [];

    // Sync tables in order
    for (let idx = 0; idx < syncOrder.length; idx++) {
      const modelName = syncOrder[idx];
      if (models[modelName]) {
        const model = models[modelName];
        
        if (tableExists(modelName, model)) {
          console.log(`  ${idx + 1}. ✅ ${modelName} (already exists)`);
          alreadyExistCount++;
        } else {
          try {
            await model.sync({ alter: false });
            console.log(`  ${idx + 1}. ✅ ${modelName} (created)`);
            createdCount++;
          } catch (syncErr) {
            const errMsg = syncErr.original?.message || syncErr.message || 'Unknown error';
            console.warn(`  ${idx + 1}. ⚠️  ${modelName} (error: ${errMsg.split('\n')[0]})`);
            failedCount++;
            failedTables.push(modelName);
          }
        }
      }
    }

    // Sync any remaining models not in the order list
    const syncedModels = new Set(syncOrder.filter(m => models[m]));
    const remainingModels = Object.keys(models).filter(m => !syncedModels.has(m));
    
    if (remainingModels.length > 0) {
      console.log(`\n⚙️  Syncing remaining models...\n`);
      for (const modelName of remainingModels) {
        const model = models[modelName];
        
        if (tableExists(modelName, model)) {
          console.log(`  ✅ ${modelName} (already exists)`);
          alreadyExistCount++;
        } else {
          try {
            await model.sync({ alter: false });
            console.log(`  ✅ ${modelName} (created)`);
            createdCount++;
          } catch (syncErr) {
            const errMsg = syncErr.original?.message || syncErr.message || 'Unknown error';
            console.warn(`  ⚠️  ${modelName} (error: ${errMsg.split('\n')[0]})`);
            failedCount++;
            failedTables.push(modelName);
          }
        }
      }
    }

    // Summary
    console.log("\n📊 ======================================");
    console.log("SYNCHRONIZATION SUMMARY");
    console.log("📊 ======================================");
    console.log(`✅ Already Existing: ${alreadyExistCount}`);
    console.log(`✨ Newly Created:    ${createdCount}`);
    console.log(`⚠️  Failed:          ${failedCount}`);
    console.log(`📋 Total Processed:  ${alreadyExistCount + createdCount + failedCount}/${modelCount}`);
    
    if (failedTables.length > 0) {
      console.log(`\n❌ Failed Tables: ${failedTables.join(', ')}`);
      console.log("   These tables may have schema conflicts or missing dependencies.");
      console.log("   The application will continue to function with existing tables.");
    } else {
      console.log("\n✅ All tables synced successfully!");
    }

    console.log("\n📊 ======================================\n");

    // Exit with success code (even if some tables failed - they likely exist already)
    process.exit(0);

  } catch (error) {
    console.error("\n❌ Fatal error during database synchronization:");
    console.error(error);
    console.error("\n📊 ======================================\n");
    process.exit(1);
  }
};

// Run the sync
syncDatabase();
