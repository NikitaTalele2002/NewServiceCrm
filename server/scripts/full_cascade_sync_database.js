import { sequelize } from "../models/index.js";
import dotenv from "dotenv";

dotenv.config();

// Define table creation order based on dependencies
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

const fullCascadeSyncDatabase = async () => {
  try {
    console.log("🔄 Starting FULL CASCADE database synchronization...");
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    
    // Test database connection
    console.log("🔌 Testing database connection...");
    await sequelize.authenticate();
    console.log("✅ Database connection successful");

    // Drop ALL foreign key constraints
    console.log("🔧 Dropping all foreign key constraints...");
    try {
      await sequelize.query(`
        DECLARE @sql NVARCHAR(MAX) = '';
        SELECT @sql += 'ALTER TABLE [' + TABLE_SCHEMA + '].[' + TABLE_NAME + '] DROP CONSTRAINT ' + CONSTRAINT_NAME + '; '
        FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
        WHERE CONSTRAINT_TYPE = 'FOREIGN KEY';
        IF LEN(@sql) > 0
          EXEC sp_executesql @sql;
      `);
      console.log("✅ All foreign key constraints dropped");
    } catch (e) {
      console.log("ℹ️  No existing constraints to drop:", e.message);
    }

    // Disable foreign key constraint checking
    console.log("🔧 Disabling FK constraint checks...");
    try {
      await sequelize.query("EXEC sp_MSForEachTable 'ALTER TABLE ? NOCHECK CONSTRAINT ALL'");
      console.log("✅ FK constraint checks disabled");
    } catch (e) {
      console.log("ℹ️ Could not disable all FK checks");
    }

    // Drop all tables in REVERSE order (to respect FK dependencies)
    console.log("\n🗑️  Dropping all tables in reverse dependency order...\n");
    const reverseOrder = [...creationOrder].reverse();
    const models = sequelize.models;

    for (const modelName of reverseOrder) {
      if (!models[modelName]) continue;
      try {
        await sequelize.query(`DROP TABLE IF EXISTS [${models[modelName].getTableName()}]`);
        console.log(`✅ Dropped: ${modelName}`);
      } catch (error) {
        console.log(`ℹ️  ${modelName} - Not found or already dropped`);
      }
    }

    // Re-enable foreign key constraint checking
    console.log("\n🔧 Re-enabling FK constraint checks...");
    try {
      await sequelize.query("EXEC sp_MSForEachTable 'ALTER TABLE ? CHECK CONSTRAINT ALL'");
      console.log("✅ FK constraint checks re-enabled");
    } catch (e) {
      console.log("ℹ️ Could not re-enable FK checks");
    }

    // Now sync all tables in dependency order
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
        await models[modelName].sync({ alter: false, force: false });
        console.log(`✅ ${modelName} - Synced successfully`);
        successCount++;
      } catch (error) {
        const errorMsg = error.original?.message || error.message || error.sql || 'Unknown error';
        const shortError = errorMsg.split('\n')[0].substring(0, 150);
        console.log(`❌ ${modelName} - Failed`);
        console.log(`   Error: ${shortError}`);
        failedModels.push({ name: modelName, error: shortError });
        failCount++;
      }
    }

    // Sync any remaining models not in the order list
    console.log("\n🔄 Syncing remaining models...\n");
    for (const [modelName, model] of Object.entries(models)) {
      if (!creationOrder.includes(modelName)) {
        try {
          await model.sync({ alter: false, force: false });
          console.log(`✅ ${modelName} - Synced successfully`);
          successCount++;
        } catch (error) {
          const errorMsg = error.original?.message || error.message || error.sql || 'Unknown error';
          const shortError = errorMsg.split('\n')[0].substring(0, 150);
          console.log(`❌ ${modelName} - Failed`);
          console.log(`   Error: ${shortError}`);
          failedModels.push({ name: modelName, error: shortError });
          failCount++;
        }
      }
    }

    console.log("\n" + "=".repeat(70));
    console.log(`✅ Successfully synced: ${successCount} tables`);
    if (failCount > 0) {
      console.log(`❌ Failed: ${failCount} tables`);
      console.log(`\n   Failed models with errors:`);
      failedModels.forEach(({ name, error }) => {
        console.log(`   • ${name}`);
        console.log(`     ${error}`);
      });
    }
    console.log("=".repeat(70));

    if (failCount === 0) {
      console.log("\n✅ Database synchronization completed successfully!");
      process.exit(0);
    } else {
      console.log("\n⚠️  Database synchronization completed with some failures.");
      process.exit(1);
    }
  } catch (error) {
    console.error("❌ Error during database synchronization:", error.message);
    console.error(error.stack);
    process.exit(1);
  }
};

fullCascadeSyncDatabase();
