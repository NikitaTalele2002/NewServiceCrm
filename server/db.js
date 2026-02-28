import { Sequelize } from "sequelize";
import sql from "mssql";
import dotenv from 'dotenv';
dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_NAME || "NewCRM",
  process.env.DB_USER || "crm_user",
  process.env.DB_PASSWORD || "StrongPassword123!",
  {
    host: process.env.DB_HOST || "localhost",
    dialect: "mssql",
    dialectOptions: {
      options: {
        instanceName: process.env.DB_INSTANCE,
        encrypt: false,
        trustServerCertificate: true,
      },
    },
    logging: false,
    pool: { max: 5, min: 0, idle: 10000 },
  }
);

// Load models first to register them in sequelize.models
let modelsLoaded = false;
const loadModels = async () => {
  if (!modelsLoaded) {
    try {
      await import('./models/index.js');
      modelsLoaded = true;
    } catch (err) {
      console.error('Failed to load models:', err.message);
    }
  }
};

const connectDB = async () => {
  // Load models before connecting to DB
  await loadModels();

  try {
    await sequelize.authenticate();
    console.log("Database Connected Successfully");

    // Sync database with proper table dependency ordering
    await syncTablesInOrder();
    console.log("Database synced successfully");
  } catch (error) {
    console.error("Database connection error - full details:");
    console.error("  Message:", error && error.message ? error.message : error);
    console.error("  Stack:", error && error.stack ? error.stack : "No stack trace");
    console.warn("Server continuing without DB sync. Use ./scripts/sync_associations.js to update schema.");
  }
};

// Sync tables in dependency order to handle foreign keys correctly
const syncTablesInOrder = async () => {
  try {
    // Get all models
    const models = sequelize.models;

    // Define sync order based on actual dependencies
    const syncOrder = [
      // Phase 1: Completely independent tables (no foreign keys at all)
      'Roles', 'Zones', 'Plant', 'DefectMaster', 'ProductGroup', 'SubStatus',
      'Users', 'Technicians', 'ServiceCenter', 'ActionLog', 'EntityChangeRequests',
      'Approvals', 'Ledger', 'Reimbursement', 'LogisticsDocuments', 'SAPDocuments',
      'Status', 'StockMovement',

      // Phase 2: Tables depending on Phase 1
      'State', // independent but needs to be early
      'City', // depends on State
      'Pincode', // depends on City
      'ProductMaster', // depends on ProductGroup
      'ReportingAuthority', // depends on Users
      'RSM', // depends on Users

      // Phase 3: More complex dependencies
      'ProductModel', // depends on ProductMaster
      'RSMStateMapping', // depends on RSM, State
      'ServiceCenterPincodes', // depends on ServiceCenter, Pincode
      'SparePart', // depends on ProductModel

      // Phase 4: Customer (depends on City, State)
      'Customer',

      // Phase 5: CustomersProducts (depends on Customer, ProductMaster, ProductModel)
      'CustomersProducts',

      // Phase 6: Calls (depends on Customer, CustomersProducts, Users, Status) + self-reference
      'Calls',

      // Phase 7: Tables dependent on Calls
      'HappyCodes', // depends on Calls
      'TATTracking', // depends on Calls
      'TATHolds', // depends on TATTracking or Calls
      'CallTechnicianAssignment', // depends on Calls, Technicians
      'CallCancellationRequests', // depends on Calls
      'CallSpareUsage', // depends on Calls
      'Attachments', // depends on Calls
      'AttachmentAccess', // depends on Attachments
      'ServiceInvoice', // depends on Calls or ServiceCenter
      'ServiceInvoiceItem', // depends on ServiceInvoice
      'Replacements', // depends on Calls
      'ServiceCenterFinancial', // depends on ServiceCenter

      // Phase 8: Spare/Inventory tables
      'SpareInventory', // depends on SparePart
      'SpareRequest', // depends on Calls, Technicians, Status
      'SpareRequestItem', // depends on SpareRequest, SparePart

      // Phase 9: Defects and Models
      'ModelDefects', // depends on ProductModel
      'DefectSpares', // depends on DefectMaster, SparePart

      // Phase 10: Stock/Cartons/Goods
      'Cartons', // depends on StockMovement
      'GoodsMovementItems', // depends on StockMovement, Cartons, SparePart
      'LogisticsDocumentItems', // depends on LogisticsDocuments, SparePart

      // Phase 11: SAP
      'SAPDocumentItems', // depends on SAPDocuments

      // Phase 12: Catchall for any remaining
      'AccessControl',
    ];

    // Get all existing table names from database (case-insensitive)
    let existingTableNames = [];
    try {
      const [result] = await sequelize.query(`
        SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = 'dbo' AND TABLE_TYPE = 'BASE TABLE'
      `, { raw: true });
      // Store both original and lowercase for matching
      existingTableNames = result.map(r => r.TABLE_NAME);
    } catch (e) {
      console.warn('Could not get table list from database');
    }

    // Helper to check if table exists (case-insensitive)
    const tableExists = (modelName, model) => {
      const expectedTableName = model.tableName || modelName;
      return existingTableNames.some(t => t.toLowerCase() === expectedTableName.toLowerCase());
    };

    // Sync tables in order
    for (const modelName of syncOrder) {
      if (models[modelName]) {
        const model = models[modelName];

        if (tableExists(modelName, model)) {
          // Table already exists
          console.log(`✅ Synced table: ${modelName}`);
        } else {
          // Try to create table
          try {
            await model.sync({ alter: false });
            console.log(`✅ Synced table: ${modelName}`);
          } catch (syncErr) {
            console.warn(`⚠️ Could not sync ${modelName}:`, syncErr.original?.message || syncErr.message || '');
          }
        }
      }
    }

    // Sync any remaining models not in the order list
    for (const [modelName, model] of Object.entries(models)) {
      if (!syncOrder.includes(modelName)) {
        if (tableExists(modelName, model)) {
          console.log(`✅ Synced table: ${modelName}`);
        } else {
          try {
            await model.sync({ alter: false });
            console.log(`✅ Synced table: ${modelName}`);
          } catch (syncErr) {
            console.warn(`⚠️ Could not sync ${modelName}:`, syncErr.original?.message || syncErr.message || '');
          }
        }
      }
    }
  } catch (err) {
    console.error("Error during ordered sync:", err.message);
    throw err;
  }
};

// Also export a MSSQL connection pool (some routes use `mssql` + poolPromise)
const poolConfig = {
  user: process.env.DB_USER || 'crm_user',
  password: process.env.DB_PASSWORD || 'StrongPassword123!',
  server: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'NewCRM',
  options: {
    instanceName: process.env.DB_INSTANCE,
    encrypt: false,
    trustServerCertificate: true,
    requestTimeout: 30000,
  },
  pool: { max: 5, min: 0, idleTimeoutMillis: 10000 },
};

let poolPromise;
try {
  const pool = new sql.ConnectionPool(poolConfig);
  poolPromise = pool.connect().then((p) => {
    console.log('MSSQL pool connected');
    return p;
  }).catch((err) => {
    console.error('MSSQL pool connection error:', err && err.message ? err.message : err);
    throw err;
  });
} catch (err) {
  console.error('MSSQL pool setup error:', err && err.message ? err.message : err);
}

export {
  sequelize,
  connectDB,
  sql,
  poolPromise,
};




// // backend/db.js
// const sql = require("mssql");

// const config = {
//   user: "crm_user",
//   password: "StrongPassword123!",
//   server: "FCL40001748\\SQLEXPRESS",
//   database: "dashboard",
//   options: {
//     encrypt: false,
//     trustServerCertificate: true,
//   },
// };





// // Create a pool and export a promise
// let poolPromise;

// try {
//   const pool = new sql.ConnectionPool(config);
//   poolPromise = pool.connect(); // returns a promise
//   poolPromise
//     .then(() => console.log("MSSQL Connected Successfully"))
//     .catch((err) => console.error("MSSQL Pool Connection Error:", err));
// } catch (err) {
//   console.error("MSSQL Connection Error:", err);
// }

// module.exports = { sql, poolPromise };
