import { sequelize, 
  Customer, Product, Users, State, City, Pincode, ProductGroup, ProductModel, SparePart, 
  SpareRequest, SpareRequestItem, Roles, AccessControl, Dealers, ReportingAuthority, 
  Zones, Plant, CustomersProducts, Status, SubStatus, Calls, CallSpareUsage, Attachments, 
  AttachmentAccess, HappyCodes, TATTracking, TATHolds, ActionLog, Approvals, SpareInventory, 
  StockMovement, Cartons, GoodsMovementItems, ServiceCenter, Technicians, CallTechnicianAssignment, 
  CallCancellationRequests, LogisticsDocuments, LogisticsDocumentItems, ServiceInvoice, 
  ServiceInvoiceItem, DefectMaster, DefectSpares, ModelDefects, EntityChangeRequests, Ledger, 
  Replacements, Reimbursement, RSMStateMapping, SAPDocuments, SAPDocumentItems, 
  ServiceCenterFinancial, ServiceCenterPincodes 
} from "../models/index.js";
import dotenv from "dotenv";

dotenv.config();

// Define table creation order based on dependencies
// Base tables first (no foreign keys), then dependent tables
const creationOrder = [
  // Base/Independent tables (no FK dependencies)
  'State', 'City', 'Pincode', 'ProductGroup', 'ProductModel', 
  'Roles', 'Status', 'SubStatus', 'Zones', 'Plant',
  'Dealers', 'DefectMaster',
  
  // Tables that only reference base tables
  'Users', 'ReportingAuthority', 'AccessControl',
  'Product', 'SparePart', 'RSMStateMapping',
  
  // Tables that reference Users
  'Customer', 'ServiceCenter', 'Technicians', 'Replacements', 'Reimbursement',
  'TATTracking', 'TATHolds', 'HappyCodes', 'Approvals',
  'ActionLog', 'Attachments', 'Cartons',
  
  // Tables that reference Customer and/or other tables
  'CustomersProducts', 'SubStatus', 'Calls',
  
  // Tables that reference Calls and other tables
  'CallSpareUsage', 'CallTechnicianAssignment', 'CallCancellationRequests',
  'SpareRequest', 'SpareRequestItem', 
  
  // Invoice related
  'ServiceInvoice', 'ServiceInvoiceItem',
  
  // Logistics and other tables
  'AttachmentAccess', 'StockMovement', 'GoodsMovementItems',
  'LogisticsDocuments', 'LogisticsDocumentItems',
  'DefectSpares', 'ModelDefects', 'SpareInventory',
  'ServiceCenterFinancial', 'ServiceCenterPincodes',
  'EntityChangeRequests', 'Ledger',
  'SAPDocuments', 'SAPDocumentItems'
];

const smartSyncDatabase = async () => {
  try {
    console.log("🔄 Starting SMART database synchronization...");
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    
    // Test database connection
    console.log("🔌 Testing database connection...");
    await sequelize.authenticate();
    console.log("✅ Database connection successful");

    // Drop constraints before table creation
    console.log("🔧 Preparing database...");
    try {
      await sequelize.query(`
        DECLARE @sql NVARCHAR(MAX) = '';
        SELECT @sql += 'ALTER TABLE [' + TABLE_SCHEMA + '].[' + TABLE_NAME + '] DROP CONSTRAINT ' + CONSTRAINT_NAME + '; '
        FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
        WHERE CONSTRAINT_TYPE = 'FOREIGN KEY';
        IF LEN(@sql) > 0
        EXEC sp_executesql @sql;
      `);
      console.log("✅ Dropped existing constraints");
    } catch (e) {
      console.log("ℹ️  No existing constraints to drop");
    }

    // Get models map
    const models = sequelize.models;
    console.log(`📝 Found ${Object.keys(models).length} models`);

    // Sync tables in dependency order
    console.log("\n⚙️  Syncing models in dependency order...\n");
    
    let successCount = 0;
    let failCount = 0;
    const failedModels = [];

    for (const modelName of creationOrder) {
      if (!models[modelName]) {
        console.log(`⏭️  ${modelName} - Not found in models`);
        continue;
      }

      try {
        await models[modelName].sync({ alter: false, force: true });
        console.log(`✅ ${modelName} - Synced successfully`);
        successCount++;
      } catch (error) {
        const errorMsg = error.original?.message || error.message || error.sql || 'Unknown error';
        console.log(`❌ ${modelName} - Failed`);
        console.log(`   Error: ${errorMsg.split('\n')[0].substring(0, 100)}`);
        failedModels.push({ name: modelName, error: errorMsg.split('\n')[0].substring(0, 100) });
        failCount++;
      }
    }

    // Sync any remaining models not in the order list
    console.log("\n🔄 Syncing remaining models...\n");
    for (const [modelName, model] of Object.entries(models)) {
      if (!creationOrder.includes(modelName)) {
        try {
          await model.sync({ alter: false, force: true });
          console.log(`✅ ${modelName} - Synced successfully`);
          successCount++;
        } catch (error) {
          const errorMsg = error.original?.message || error.message || error.sql || 'Unknown error';
          console.log(`❌ ${modelName} - Failed`);
          console.log(`   Error: ${errorMsg.split('\n')[0].substring(0, 100)}`);
          failedModels.push({ name: modelName, error: errorMsg.split('\n')[0].substring(0, 100) });
          failCount++;
        }
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log(`✅ Successfully synced: ${successCount} tables`);
    if (failCount > 0) {
      console.log(`❌ Failed: ${failCount} tables`);
      console.log(`\n   Failed models with errors:`);
      failedModels.forEach(({ name, error }) => {
        console.log(`   • ${name}: ${error}`);
      });
    }
    console.log("=".repeat(60));

    if (failCount === 0) {
      console.log("\n✅ Database synchronization completed successfully!");
    } else {
      console.log("\n⚠️  Database synchronization completed with some failures.");
      console.log("   These might be due to:");
      console.log("   - Missing referenced tables");
      console.log("   - Circular dependencies");
      console.log("   - Invalid column definitions");
    }

    process.exit(failCount === 0 ? 0 : 1);
  } catch (error) {
    console.error("❌ Error during database synchronization:", error.message);
    process.exit(1);
  }
};

smartSyncDatabase();
