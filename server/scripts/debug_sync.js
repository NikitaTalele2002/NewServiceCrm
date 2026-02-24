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
import fs from "fs";

dotenv.config();

const debugLog = [];

const syncDatabase = async () => {
  try {
    console.log("🔄 Starting database synchronization...");
    debugLog.push("🔄 Starting database synchronization...");
    
    await sequelize.authenticate();
    console.log("✅ Database connection successful");
    debugLog.push("✅ Database connection successful");

    const models = sequelize.models;
    console.log(`📝 Found ${Object.keys(models).length} models to sync`);
    debugLog.push(`📝 Found ${Object.keys(models).length} models to sync`);

    // Skip cleanup - just test sync
    console.log("⚙️  Testing individual model sync...");
    debugLog.push("⚙️  Testing individual model sync...");

    const syncOrder = [
      'Roles', 'Status', 'Users', 'State', 'Pincode', 'City', 'ProductGroup', 'DefectMaster', 'Product',
      'ProductModel', 'SparePart', 'Plant', 'Zones', 'Dealers', 'ServiceCenter', 'Technicians',
      'ReportingAuthority', 'Customer', 'CustomersProducts', 'Calls', 'Attachments', 'CallSpareUsage'
    ];

    for (const modelName of syncOrder) {
      if (models[modelName]) {
        try {
          await models[modelName].sync({ alter: false });
          console.log(`✅ ${modelName}`);
          debugLog.push(`✅ ${modelName}`);
        } catch (err) {
          const errMsg = `❌ ${modelName}`;
          console.log(errMsg);
          debugLog.push(errMsg);
          // Check for errors array (AggregateError)
          if (err.original && err.original.errors && Array.isArray(err.original.errors)) {
            err.original.errors.forEach((e, idx) => {
              debugLog.push(`   Error ${idx}: ${e.message || e}`);
            });
          }
          // Log full error  
          debugLog.push(`   Type: ${err.constructor.name}`);
          if (err.original) debugLog.push(`   Original Type: ${err.original.constructor.name}`);
          if (err.sql) {
            const sqlSummary = err.sql.substring(0, 300).replace(/\n/g, ' ');
            debugLog.push(`   SQL: ${sqlSummary}...`);
          }
          debugLog.push('');
        }
      }
    }

    // Write debug log to file
    fs.writeFileSync('debug_sync.log', debugLog.join('\n'), 'utf8');
    console.log("\n📝 Debug log written to debug_sync.log");
    process.exit(0);

  } catch (error) {
    console.error("❌ Fatal error:", error.message);
    debugLog.push(`❌ Fatal error: ${error.message}`);
    fs.writeFileSync('debug_sync.log', debugLog.join('\n'), 'utf8');
    process.exit(1);
  }
};

syncDatabase();
