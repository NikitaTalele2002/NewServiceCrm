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

const forceSyncDatabase = async () => {
  try {
    console.log("🔄 Starting FORCE database synchronization...");
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    
    // Test database connection
    console.log("🔌 Testing database connection...");
    await sequelize.authenticate();
    console.log("✅ Database connection successful");

    // Drop all tables with CASCADE option
    console.log("🗑️  Dropping all constraints and tables...");
    
    // Drop all foreign key constraints first
    await sequelize.query(`
      DECLARE @sql NVARCHAR(MAX) = '';
      SELECT @sql += 'ALTER TABLE [' + TABLE_SCHEMA + '].[' + TABLE_NAME + '] DROP CONSTRAINT ' + CONSTRAINT_NAME + '; '
      FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
      WHERE CONSTRAINT_TYPE = 'FOREIGN KEY';
      IF LEN(@sql) > 0
      EXEC sp_executesql @sql;
    `);
    console.log("✅ Dropped all foreign key constraints");
    
    // Then drop all tables
    await sequelize.query(`
      DECLARE @sql NVARCHAR(MAX) = '';
      SELECT @sql += 'DROP TABLE [' + TABLE_SCHEMA + '].[' + TABLE_NAME + ']; '
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_TYPE = 'BASE TABLE' AND TABLE_SCHEMA = 'dbo';
      IF LEN(@sql) > 0
      EXEC sp_executesql @sql;
    `);
    console.log("✅ All tables dropped");

    // Get all models
    const models = sequelize.models;
    console.log(`📝 Found ${Object.keys(models).length} models to sync`);

    // Sync database
    console.log("⚙️  Syncing models to database...");
    await sequelize.sync({ 
      alter: false,
      force: false
    });
    
    console.log("✅ Database synchronization completed successfully!");
    console.log(`📋 Total tables synced: ${Object.keys(models).length}`);
    
    // List all created tables
    console.log("\n📊 Synced Models:");
    Object.keys(models).forEach((modelName, index) => {
      console.log(`  ${index + 1}. ${modelName}`);
    });

    process.exit(0);
  } catch (error) {
    console.error("❌ Error during database synchronization:", error.message);
    console.error(error);
    process.exit(1);
  }
};

forceSyncDatabase();
