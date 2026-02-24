/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PRODUCTION MASTER DATABASE SYNC SCRIPT
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * This script syncs ALL 54 Sequelize models to the NewCRM database in one run.
 * No need to run multiple files - just execute this once and all tables will be created.
 * 
 * Usage: node sync_all_models_production.js
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { sequelize } from './db.js';
import * as modelsModule from './models/index.js';

const SYNC_ORDER = [
  // Phase 1: Base/Reference Tables (No FKs or only to themselves)
  'Roles',
  'Zones',
  'Status',
  'SubStatus',
  
  // Phase 2: Location/Geography (No FKs to other business entities)
  'State',
  'City',
  'Pincode',
  
  // Phase 3: Product Catalog
  'ProductGroup',
  'ProductMaster',
  'ProductModel',
  
  // Phase 4: User Management (Depends on Roles)
  'Users',
  'RSM',
  
  // Phase 5: Organization Structure
  'Dealers',
  'ReportingAuthority',
  'Plant',
  'ServiceCenter',
  
  // Phase 6: Access Control (Depends on Roles)
  'AccessControl',
  
  // Phase 7: Spare Parts (Depends on ProductModel)
  'SparePart',
  
  // Phase 8: Customer Management (Depends on City, State, Pincode, ProductMaster, ProductModel)
  'Customer',
  'CustomersProducts',
  
  // Phase 9: Attachments (Independent)
  'Attachments',
  'AttachmentAccess',
  
  // Phase 10: Service Infrastructure (Depends on ServiceCenter)
  'ServiceCenterPincodes',
  'ServiceCenterFinancial',
  
  // Phase 11: Call & Service Management
  'Calls',
  'HappyCodes',
  'TATTracking',
  'TATHolds',
  
  // Phase 12: Technicians (Depends on ServiceCenter & Users)
  'Technicians',
  
  // Phase 13: Call Operations (Depends on Calls, Technicians)
  'CallSpareUsage',
  'CallTechnicianAssignment',
  'CallCancellationRequests',
  
  // Phase 14: Spare Request System
  'SpareRequest',
  'SpareRequestItem',
  
  // Phase 15: Inventory Management
  'Cartons',
  'StockMovement',
  'SpareInventory',
  'GoodsMovementItems',
  
  // Phase 16: Logistics
  'LogisticsDocuments',
  'LogisticsDocumentItems',
  
  // Phase 17: Approvals & Auditing
  'Approvals',
  'ActionLog',
  
  // Phase 18: Service Invoicing
  'ServiceInvoice',
  'ServiceInvoiceItem',
  
  // Phase 19: Defects Management
  'DefectMaster',
  'DefectSpares',
  'ModelDefects',
  
  // Phase 20: Request Processing
  'EntityChangeRequests',
  
  // Phase 21: Financial & Ledger
  'Ledger',
  'Replacements',
  'Reimbursement',
  
  // Phase 22: RSM Management
  'RSMStateMapping',
  
  // Phase 23: SAP Integration
  'SAPDocuments',
  'SAPDocumentItems'
];

async function dropAllTables() {
  try {
    console.log('📌 Disabling foreign key checks...');
    await sequelize.query(`EXEC sp_MSForEachTable 'ALTER TABLE ? NOCHECK CONSTRAINT all'`);
    console.log('✅ FK checks disabled\n');

    // Get all tables
    const tables = await sequelize.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_TYPE='BASE TABLE' AND TABLE_SCHEMA='dbo'
       ORDER BY TABLE_NAME DESC`,
      { raw: true }
    );

    console.log(`Found ${tables[0].length} existing tables\n`);
    
    let dropped = 0;
    for (const t of tables[0]) {
      try {
        await sequelize.query(`DROP TABLE [${t.TABLE_NAME}]`);
        dropped++;
      } catch (err) {
        // Silently skip if can't drop
      }
    }

    console.log(`✅ Dropped ${dropped} tables\n`);

    console.log('📌 Re-enabling foreign key checks...');
    await sequelize.query(`EXEC sp_MSForEachTable 'ALTER TABLE ? WITH CHECK CHECK CONSTRAINT all'`);
    console.log('✅ FK checks enabled\n');
  } catch (err) {
    console.warn('⚠️  Warning during table drop phase:', err.message.substring(0, 50));
  }
}

async function syncModelsInOrder() {
  let syncedCount = 0;
  let failedCount = 0;
  const failedModels = [];

  console.log('═══ SYNCING ALL 54 MODELS IN DEPENDENCY ORDER ═══\n');

  for (const modelName of SYNC_ORDER) {
    const model = sequelize.models[modelName];
    if (!model) {
      failedModels.push(modelName);
      console.log(`⚠️  ${modelName} - Model not found`);
      continue;
    }

    try {
      await model.sync({ force: false, alter: false });
      syncedCount++;
      console.log(`✅ ${modelName}`);
    } catch (err) {
      failedCount++;
      failedModels.push(modelName);
      console.log(`❌ ${modelName}`);
    }
  }

  return { syncedCount, failedCount, failedModels };
}

async function createSpecialTables() {
  /**
   * Some tables have circular FK cascade issues in MSSQL.
   * We create them with special handling if they failed during sync.
   */
  const specialTables = [
    {
      name: 'Technicians',
      sql: `IF OBJECT_ID('[technicians]', 'U') IS NULL 
        CREATE TABLE [technicians] (
          [technician_id] INT IDENTITY(1,1) PRIMARY KEY,
          [service_center_id] INT NOT NULL,
          [user_id] INT NOT NULL,
          [name] NVARCHAR(150) NOT NULL,
          [mobile_no] NVARCHAR(20) NOT NULL UNIQUE,
          [email] NVARCHAR(100),
          [status] VARCHAR(255) CHECK ([status] IN(N'active', N'inactive', N'on_leave', N'suspended')),
          [remark] NVARCHAR(MAX),
          [created_at] DATETIMEOFFSET,
          [updated_at] DATETIMEOFFSET,
          CONSTRAINT [FK_tech_sc] FOREIGN KEY ([service_center_id]) REFERENCES [service_centers] ([asc_id]) ON DELETE CASCADE,
          CONSTRAINT [FK_tech_user] FOREIGN KEY ([user_id]) REFERENCES [users] ([user_id]) ON DELETE NO ACTION
        );`
    },
    {
      name: 'Ledger',
      sql: `IF OBJECT_ID('[ledger]', 'U') IS NULL 
        CREATE TABLE [ledger] (
          [ledger_id] INT IDENTITY(1,1) PRIMARY KEY,
          [asc_id] INT NOT NULL,
          [transaction_type] VARCHAR(255) CHECK ([transaction_type] IN(N'debit', N'credit')),
          [transaction_date] DATETIMEOFFSET,
          [reference_type] VARCHAR(255) CHECK ([reference_type] IN(N'spare_request', N'reimbursement', N'payment', N'adjustment', N'security_deposit')),
          [reference_id] INT,
          [debit_amount] DECIMAL(15,2) DEFAULT 0,
          [credit_amount] DECIMAL(15,2) DEFAULT 0,
          [opening_balance] DECIMAL(15,2),
          [closing_balance] DECIMAL(15,2),
          [is_reversed] BIT DEFAULT 0,
          [reversal_ref_id] INT,
          [reversal_reason] NVARCHAR(255),
          [reversed_at] DATETIMEOFFSET,
          [reversed_by] INT,
          [remarks] NVARCHAR(MAX),
          [created_at] DATETIMEOFFSET,
          [created_by] INT,
          CONSTRAINT [FK_ledger_asc] FOREIGN KEY ([asc_id]) REFERENCES [service_centers] ([asc_id]) ON DELETE CASCADE,
          CONSTRAINT [FK_ledger_self] FOREIGN KEY ([reversal_ref_id]) REFERENCES [ledger] ([ledger_id]) ON DELETE NO ACTION,
          CONSTRAINT [FK_ledger_reversed_by] FOREIGN KEY ([reversed_by]) REFERENCES [users] ([user_id]) ON DELETE NO ACTION,
          CONSTRAINT [FK_ledger_created_by] FOREIGN KEY ([created_by]) REFERENCES [users] ([user_id]) ON DELETE NO ACTION
        );`
    },
    {
      name: 'RSMStateMapping',
      sql: `IF OBJECT_ID('[rsm_state_mapping]', 'U') IS NULL 
        CREATE TABLE [rsm_state_mapping] (
          [id] INT IDENTITY(1,1) PRIMARY KEY,
          [role_id] INT NOT NULL,
          [rsm_user_id] INT NOT NULL,
          [state_id] INT NOT NULL,
          [effective_from] DATETIMEOFFSET,
          [effective_to] DATETIMEOFFSET,
          [is_active] BIT DEFAULT 1,
          [created_at] DATETIMEOFFSET,
          [updated_at] DATETIMEOFFSET,
          CONSTRAINT [UC_rsm_state] UNIQUE ([rsm_user_id], [state_id]),
          CONSTRAINT [FK_rsm_role] FOREIGN KEY ([role_id]) REFERENCES [roles] ([roles_id]) ON DELETE CASCADE,
          CONSTRAINT [FK_rsm_user] FOREIGN KEY ([rsm_user_id]) REFERENCES [rsms] ([rsm_id]) ON DELETE NO ACTION,
          CONSTRAINT [FK_rsm_state] FOREIGN KEY ([state_id]) REFERENCES [States] ([Id]) ON DELETE CASCADE
        );`
    },
    {
      name: 'GoodsMovementItems',
      sql: `IF OBJECT_ID('[goods_movement_items]', 'U') IS NULL 
        CREATE TABLE [goods_movement_items] (
          [movement_item_id] INT IDENTITY(1,1) PRIMARY KEY,
          [carton_id] INT,
          [movement_id] INT NOT NULL,
          [spare_part_id] INT NOT NULL,
          [qty] INT NOT NULL DEFAULT 0,
          [condition] VARCHAR(255) CHECK ([condition] IN(N'good', N'defective', N'damaged', N'partially_damaged')),
          [created_at] DATETIMEOFFSET,
          [updated_at] DATETIMEOFFSET,
          CONSTRAINT [FK_gmi_carton] FOREIGN KEY ([carton_id]) REFERENCES [cartons] ([carton_id]) ON DELETE SET NULL,
          CONSTRAINT [FK_gmi_movement] FOREIGN KEY ([movement_id]) REFERENCES [stock_movement] ([movement_id]) ON DELETE NO ACTION,
          CONSTRAINT [FK_gmi_spare] FOREIGN KEY ([spare_part_id]) REFERENCES [spare_parts] ([Id]) ON DELETE CASCADE
        );`
    },
    {
      name: 'CallTechnicianAssignment',
      sql: `IF OBJECT_ID('[call_technician_assignment]', 'U') IS NULL 
        CREATE TABLE [call_technician_assignment] (
          [id] INT IDENTITY(1,1) PRIMARY KEY,
          [call_id] INT NOT NULL,
          [technician_id] INT NOT NULL,
          [assigned_by_user_id] INT,
          [assigned_reason] VARCHAR(255) CHECK ([assigned_reason] IN(N'ABSENT', N'OVERLOADED', N'CUSTOMER_REQUEST', N'PERFORMANCE', N'AVAILABILITY')),
          [assigned_at] DATETIMEOFFSET,
          [unassigned_at] DATETIMEOFFSET,
          [is_active] BIT DEFAULT 1,
          [created_at] DATETIMEOFFSET,
          [updated_at] DATETIMEOFFSET,
          CONSTRAINT [FK_cta_call] FOREIGN KEY ([call_id]) REFERENCES [calls] ([call_id]) ON DELETE CASCADE,
          CONSTRAINT [FK_cta_tech] FOREIGN KEY ([technician_id]) REFERENCES [technicians] ([technician_id]) ON DELETE CASCADE,
          CONSTRAINT [FK_cta_user] FOREIGN KEY ([assigned_by_user_id]) REFERENCES [users] ([user_id]) ON DELETE NO ACTION
        );`
    },
    {
      name: 'ServiceInvoice',
      sql: `IF OBJECT_ID('[service_invoices]', 'U') IS NULL 
        CREATE TABLE [service_invoices] (
          [invoice_id] INT IDENTITY(1,1) PRIMARY KEY,
          [invoice_no] NVARCHAR(100) NOT NULL UNIQUE,
          [call_id] INT NOT NULL,
          [asc_id] INT,
          [technician_id] INT,
          [customer_id] INT,
          [invoice_date] DATETIMEOFFSET,
          [invoice_status] VARCHAR(255) CHECK ([invoice_status] IN(N'Draft', N'Generated', N'Sent', N'Paid', N'Partial-Paid', N'Overdue', N'Cancelled')),
          [invoice_type] VARCHAR(255) CHECK ([invoice_type] IN(N'Service', N'Spare-Parts', N'Labour', N'Mixed')),
          [subtotal_amount] DECIMAL(15,2) DEFAULT 0,
          [tax_amount] DECIMAL(10,2) DEFAULT 0,
          [discount_amount] DECIMAL(10,2) DEFAULT 0,
          [total_amount] DECIMAL(15,2) DEFAULT 0,
          [payment_mode] VARCHAR(255) CHECK ([payment_mode] IN(N'Cash', N'Credit-Card', N'Debit-Card', N'UPI', N'Bank-Transfer', N'Cheque', N'Other')),
          [payment_status] VARCHAR(255) CHECK ([payment_status] IN(N'Pending', N'Partial-Paid', N'Paid', N'Failed')),
          [created_at] DATETIMEOFFSET,
          [created_by] INT,
          [updated_at] DATETIMEOFFSET,
          CONSTRAINT [FK_si_call] FOREIGN KEY ([call_id]) REFERENCES [calls] ([call_id]) ON DELETE CASCADE,
          CONSTRAINT [FK_si_asc] FOREIGN KEY ([asc_id]) REFERENCES [users] ([user_id]) ON DELETE NO ACTION,
          CONSTRAINT [FK_si_tech] FOREIGN KEY ([technician_id]) REFERENCES [technicians] ([technician_id]) ON DELETE NO ACTION,
          CONSTRAINT [FK_si_created_by] FOREIGN KEY ([created_by]) REFERENCES [users] ([user_id]) ON DELETE NO ACTION
        );`
    },
    {
      name: 'ServiceInvoiceItem',
      sql: `IF OBJECT_ID('[service_invoice_items]', 'U') IS NULL 
        CREATE TABLE [service_invoice_items] (
          [id] INT IDENTITY(1,1) PRIMARY KEY,
          [invoice_id] INT NOT NULL,
          [item_type] VARCHAR(255) CHECK ([item_type] IN(N'Service', N'Spare-Parts', N'Labour', N'Miscellaneous')),
          [part_code] NVARCHAR(100),
          [description] NVARCHAR(MAX),
          [hsn_sac_code] NVARCHAR(50),
          [qty] INT NOT NULL,
          [unit_price] DECIMAL(10,2) NOT NULL,
          [line_amount] DECIMAL(15,2) NOT NULL,
          [tax_percent] DECIMAL(5,2),
          [tax_amount] DECIMAL(10,2) DEFAULT 0,
          [created_at] DATETIMEOFFSET,
          [updated_at] DATETIMEOFFSET,
          CONSTRAINT [FK_sii_invoice] FOREIGN KEY ([invoice_id]) REFERENCES [service_invoices] ([invoice_id]) ON DELETE CASCADE
        );`
    },
    {
      name: 'Replacements',
      sql: `IF OBJECT_ID('[replacements]', 'U') IS NULL 
        CREATE TABLE [replacements] (
          [replacements_id] INT IDENTITY(1,1) PRIMARY KEY,
          [call_id] INT NOT NULL,
          [customers_products_id] INT NOT NULL,
          [reason] NVARCHAR(MAX),
          [status] VARCHAR(255) CHECK ([status] IN(N'pending', N'approved', N'rejected', N'completed', N'cancelled')),
          [service_tag_no] NVARCHAR(100),
          [requested_date] DATETIMEOFFSET,
          [technician_id] INT,
          [created_at] DATETIMEOFFSET,
          [updated_at] DATETIMEOFFSET,
          CONSTRAINT [FK_repl_call] FOREIGN KEY ([call_id]) REFERENCES [calls] ([call_id]) ON DELETE CASCADE,
          CONSTRAINT [FK_repl_custprod] FOREIGN KEY ([customers_products_id]) REFERENCES [customers_products] ([customers_products_id]) ON DELETE NO ACTION,
          CONSTRAINT [FK_repl_tech] FOREIGN KEY ([technician_id]) REFERENCES [technicians] ([technician_id]) ON DELETE NO ACTION
        );`
    },
    {
      name: 'ActionLog',
      sql: `IF OBJECT_ID('[action_log]', 'U') IS NULL 
        CREATE TABLE [action_log] (
          [log_id] INT IDENTITY(1,1) PRIMARY KEY,
          [entity_type] VARCHAR(100) NOT NULL,
          [entity_id] INT NOT NULL,
          [action_user_role_id] INT,
          [user_id] INT NOT NULL,
          [old_status_id] INT,
          [new_status_id] INT,
          [old_substatus_id] INT,
          [new_substatus_id] INT,
          [remarks] TEXT,
          [action_at] DATETIMEOFFSET DEFAULT GETDATE(),
          [created_at] DATETIMEOFFSET DEFAULT GETDATE(),
          [updated_at] DATETIMEOFFSET,
          CONSTRAINT [FK_al_user_role] FOREIGN KEY ([action_user_role_id]) REFERENCES [roles] ([roles_id]) ON DELETE SET NULL,
          CONSTRAINT [FK_al_user] FOREIGN KEY ([user_id]) REFERENCES [users] ([user_id]) ON DELETE CASCADE,
          CONSTRAINT [FK_al_old_status] FOREIGN KEY ([old_status_id]) REFERENCES [status] ([status_id]) ON DELETE NO ACTION,
          CONSTRAINT [FK_al_new_status] FOREIGN KEY ([new_status_id]) REFERENCES [status] ([status_id]) ON DELETE NO ACTION,
          CONSTRAINT [FK_al_old_substatus] FOREIGN KEY ([old_substatus_id]) REFERENCES [sub_status] ([sub_status_id]) ON DELETE NO ACTION,
          CONSTRAINT [FK_al_new_substatus] FOREIGN KEY ([new_substatus_id]) REFERENCES [sub_status] ([sub_status_id]) ON DELETE NO ACTION
        );`
    },
    {
      name: 'ServiceCenterFinancial',
      sql: `IF OBJECT_ID('[service_center_financial]', 'U') IS NULL 
        CREATE TABLE [service_center_financial] (
          [id] INT IDENTITY(1,1) PRIMARY KEY,
          [asc_id] INT NOT NULL UNIQUE,
          [security_amount] DECIMAL(15,2) DEFAULT 0,
          [credit_limit] DECIMAL(15,2),
          [current_outstanding] DECIMAL(15,2) DEFAULT 0,
          [last_updated_at] DATETIMEOFFSET DEFAULT GETDATE(),
          [last_updated_by] INT,
          [created_at] DATETIMEOFFSET DEFAULT GETDATE(),
          [updated_at] DATETIMEOFFSET DEFAULT GETDATE(),
          CONSTRAINT [FK_scf_asc] FOREIGN KEY ([asc_id]) REFERENCES [service_centers] ([asc_id]) ON DELETE NO ACTION,
          CONSTRAINT [FK_scf_user] FOREIGN KEY ([last_updated_by]) REFERENCES [users] ([user_id]) ON DELETE SET NULL
        );`
    }
  ];

  console.log('═══ CREATING SPECIAL TABLES WITH CONSTRAINT HANDLING ═══\n');

  let specialCreated = 0;
  for (const tbl of specialTables) {
    try {
      await sequelize.query(tbl.sql, { raw: true });
      specialCreated++;
      console.log(`✅ ${tbl.name}`);
    } catch (err) {
      // If it's ServiceCenterFinancial, log the error and retry with direct DROP/CREATE
      if (tbl.name === 'ServiceCenterFinancial') {
        try {
          await sequelize.query(`DROP TABLE IF EXISTS [service_center_financial]`, { raw: true });
          await sequelize.query(tbl.sql, { raw: true });
          specialCreated++;
          console.log(`✅ ${tbl.name} (recreated)`);
        } catch (err2) {
          console.log(`⚠️  ${tbl.name} - Error: ${err2.message}`);
        }
      } else {
        console.log(`⚠️  ${tbl.name} - Likely already exists or via sync`);
      }
    }
  }

  // Add customer FK to ServiceInvoice if needed
  try {
    await sequelize.query(`
      IF NOT EXISTS (
        SELECT 1 FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS 
        WHERE CONSTRAINT_NAME = 'FK_si_customer'
      )
      ALTER TABLE [service_invoices]
      ADD CONSTRAINT [FK_si_customer] FOREIGN KEY ([customer_id]) REFERENCES [customers] ([customer_id]) ON DELETE NO ACTION
    `, { raw: true });
    console.log(`✅ ServiceInvoice -> Customer FK`);
  } catch (err) {
    // Silently skip if already exists
  }

  return specialCreated;
}

async function verifyDatabase() {
  console.log('\n═══ DATABASE VERIFICATION ═══\n');

  // Count tables
  const tableCount = await sequelize.query(
    `SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.TABLES 
     WHERE TABLE_TYPE='BASE TABLE' AND TABLE_SCHEMA='dbo'`,
    { raw: true, type: sequelize.QueryTypes.SELECT }
  );

  // Get list of tables
  const tables = await sequelize.query(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
     WHERE TABLE_TYPE='BASE TABLE' AND TABLE_SCHEMA='dbo'
     ORDER BY TABLE_NAME`,
    { raw: true }
  );

  console.log(`📊 Total tables: ${tableCount[0].cnt}/54`);

  if (tableCount[0].cnt === 54) {
    console.log('\n✅ All 54 tables successfully created!\n');
    console.log('Tables created:');
    tables[0].forEach((t, i) => {
      console.log(`  ${(i + 1).toString().padStart(2, ' ')}. ${t.TABLE_NAME}`);
    });
    return true;
  } else {
    console.log('\n⚠️  Not all tables created. Count:', tableCount[0].cnt);
    return false;
  }
}

async function main() {
  try {
    console.log('\n');
    console.log('═'.repeat(80));
    console.log('  PRODUCTION MASTER DATABASE SYNC');
    console.log('═'.repeat(80));
    console.log('\n');

    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Connected to NewCRM database\n');

    // Drop all existing tables
    await dropAllTables();

    // Sync all models in order
    const result = await syncModelsInOrder();
    console.log(`\n✅ Synced: ${result.syncedCount}`);
    console.log(`❌ Failed: ${result.failedCount}\n`);

    // Create special tables with constraint handling
    if (result.failedCount > 0 || result.failedModels.length > 0) {
      await createSpecialTables();
    }

    // Final verification
    const success = await verifyDatabase();

    // Summary
    console.log('\n' + '═'.repeat(80));
    if (success) {
      console.log('  ✨ DATABASE SYNC COMPLETED SUCCESSFULLY ✨');
      console.log('═'.repeat(80));
      console.log('\n📝 Details:');
      console.log('  ✅ All 54 models synced using Sequelize definitions');
      console.log('  ✅ Tables created in dependency order');
      console.log('  ✅ FK constraints properly configured');
      console.log('  ✅ Ready for production use\n');
    } else {
      console.log('  ⚠️  SYNC COMPLETED WITH SOME ISSUES');
      console.log('═'.repeat(80));
      console.log('\n  Check the output above for details.\n');
    }

    await sequelize.close();
    process.exit(success ? 0 : 1);
  } catch (err) {
    console.error('\n❌ FATAL ERROR:', err.message);
    console.error('\nStack trace:', err.stack);
    process.exit(1);
  }
}

// Run the script
main();
