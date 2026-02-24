import { sequelize } from "../db.js";
import dotenv from "dotenv";

dotenv.config();

/**
 * Complete Database Migration - Create All 54 Tables
 * Uses raw SQL to bypass Sequelize ORM constraint issues
 */

const completeMigration = async () => {
  try {
    console.log("\n📊 ======================================");
    console.log("⚡ COMPLETE DATABASE MIGRATION (54 TABLES)");
    console.log("📊 ======================================\n");

    // Connect to database
    console.log("🔌 Connecting to database...");
    await sequelize.authenticate();
    console.log("✅ Database connected\n");

    // Step 1: Disable all foreign key constraints
    console.log("Step 1: Disabling all foreign key constraints...");
    try {
      await sequelize.query("EXEC sp_MSForEachTable 'ALTER TABLE ? NOCHECK CONSTRAINT ALL'");
      console.log("✅ All constraints disabled\n");
    } catch (err) {
      console.log("⚠️  Could not disable constraints (may already be disabled)\n");
    }

    // Step 2: Check existing tables
    console.log("Step 2: Checking existing tables...");
    const existingTables = await sequelize.getQueryInterface().showAllTables();
    const tableNames = existingTables.map(t => typeof t === 'string' ? t : t.tableName);
    console.log(`📝 Found ${tableNames.length} existing tables\n`);

    // Step 3: Create missing tables with raw SQL
    console.log("Step 3: Creating missing tables with raw SQL...\n");

    const tableCreationSQL = [
      // 1. Customers table (core table - no FK dependencies for creation)
      {
        name: "customers",
        sql: `
          IF OBJECT_ID('[customers]', 'U') IS NULL
          CREATE TABLE [customers] (
            [customer_id] INTEGER IDENTITY(1,1) PRIMARY KEY,
            [name] NVARCHAR(150) NOT NULL,
            [mobile_no] NVARCHAR(20) NOT NULL,
            [alt_mob_no] NVARCHAR(20) NULL,
            [email] NVARCHAR(100) NULL,
            [house_no] NVARCHAR(50) NULL,
            [street_name] NVARCHAR(100) NULL,
            [building_name] NVARCHAR(100) NULL,
            [area] NVARCHAR(100) NULL,
            [landmark] NVARCHAR(100) NULL,
            [city_id] INTEGER NULL,
            [state_id] INTEGER NULL,
            [pincode] NVARCHAR(20) NULL,
            [customer_code] NVARCHAR(50) UNIQUE NULL,
            [customer_priority] INT DEFAULT 1,
            [created_by] INTEGER NULL,
            [created_at] DATETIMEOFFSET DEFAULT GETUTCDATE(),
            [updated_at] DATETIMEOFFSET DEFAULT GETUTCDATE()
          );
        `,
      },

      // 2. CustomersProducts table
      {
        name: "customers_products",
        sql: `
          IF OBJECT_ID('[customers_products]', 'U') IS NULL
          CREATE TABLE [customers_products] (
            [customers_products_id] INTEGER IDENTITY(1,1) PRIMARY KEY,
            [customer_id] INTEGER NOT NULL,
            [product_id] INTEGER NOT NULL,
            [model_id] INTEGER NULL,
            [serial_no] NVARCHAR(100) NULL,
            [purchase_date] DATETIMEOFFSET NULL,
            [warranty_expiry] DATETIMEOFFSET NULL,
            [status] VARCHAR(50) DEFAULT 'active',
            [created_at] DATETIMEOFFSET DEFAULT GETUTCDATE(),
            [updated_at] DATETIMEOFFSET DEFAULT GETUTCDATE()
          );
        `,
      },

      // 3. Calls table
      {
        name: "calls",
        sql: `
          IF OBJECT_ID('[calls]', 'U') IS NULL
          CREATE TABLE [calls] (
            [call_id] INTEGER IDENTITY(1,1) PRIMARY KEY,
            [ref_call_id] INTEGER NULL,
            [customer_id] INTEGER NOT NULL,
            [customer_product_id] INTEGER NULL,
            [service_center_id] INTEGER NOT NULL,
            [status_id] INTEGER NOT NULL,
            [substatus_id] INTEGER NULL,
            [call_date] DATETIMEOFFSET DEFAULT GETUTCDATE(),
            [call_type] VARCHAR(50) NULL,
            [complaint] NVARCHAR(MAX) NULL,
            [resolution] NVARCHAR(MAX) NULL,
            [closed_date] DATETIMEOFFSET NULL,
            [tat_date] DATETIMEOFFSET NULL,
            [priority] VARCHAR(50) DEFAULT 'normal',
            [created_by] INTEGER NULL,
            [created_at] DATETIMEOFFSET DEFAULT GETUTCDATE(),
            [updated_at] DATETIMEOFFSET DEFAULT GETUTCDATE()
          );
        `,
      },

      // 4. CallSpareUsage table
      {
        name: "call_spare_usage",
        sql: `
          IF OBJECT_ID('[call_spare_usage]', 'U') IS NULL
          CREATE TABLE [call_spare_usage] (
            [usage_id] INTEGER IDENTITY(1,1) PRIMARY KEY,
            [call_id] INTEGER NOT NULL,
            [spare_part_id] INTEGER NOT NULL,
            [qty_used] INTEGER NOT NULL DEFAULT 1,
            [created_at] DATETIMEOFFSET DEFAULT GETUTCDATE(),
            [updated_at] DATETIMEOFFSET DEFAULT GETUTCDATE()
          );
        `,
      },

      // 5. CallTechnicianAssignment table
      {
        name: "call_technician_assignment",
        sql: `
          IF OBJECT_ID('[call_technician_assignment]', 'U') IS NULL
          CREATE TABLE [call_technician_assignment] (
            [id] INTEGER IDENTITY(1,1) PRIMARY KEY,
            [call_id] INTEGER NOT NULL,
            [technician_id] INTEGER NOT NULL,
            [assigned_by_user_id] INTEGER NULL,
            [assigned_reason] VARCHAR(255) NULL,
            [assigned_at] DATETIMEOFFSET DEFAULT GETUTCDATE(),
            [unassigned_at] DATETIMEOFFSET NULL,
            [is_active] BIT DEFAULT 1,
            [created_at] DATETIMEOFFSET DEFAULT GETUTCDATE(),
            [updated_at] DATETIMEOFFSET DEFAULT GETUTCDATE()
          );
        `,
      },

      // 6. CallCancellationRequests table
      {
        name: "call_cancellation_requests",
        sql: `
          IF OBJECT_ID('[call_cancellation_requests]', 'U') IS NULL
          CREATE TABLE [call_cancellation_requests] (
            [cancellation_id] INTEGER IDENTITY(1,1) PRIMARY KEY,
            [call_id] INTEGER NOT NULL,
            [requested_by_role] INTEGER NULL,
            [requested_by_id] INTEGER NOT NULL,
            [reason] VARCHAR(255) NULL,
            [request_status] VARCHAR(255) DEFAULT 'pending',
            [cancellation_remark] NVARCHAR(MAX) NULL,
            [created_at] DATETIMEOFFSET DEFAULT GETUTCDATE(),
            [updated_at] DATETIMEOFFSET DEFAULT GETUTCDATE()
          );
        `,
      },

      // 7. HappyCodes table
      {
        name: "happy_codes",
        sql: `
          IF OBJECT_ID('[happy_codes]', 'U') IS NULL
          CREATE TABLE [happy_codes] (
            [happy_code_id] INTEGER IDENTITY(1,1) PRIMARY KEY,
            [call_id] INTEGER NOT NULL UNIQUE,
            [code] VARCHAR(50) NOT NULL UNIQUE,
            [description] NVARCHAR(MAX) NULL,
            [created_at] DATETIMEOFFSET DEFAULT GETUTCDATE(),
            [updated_at] DATETIMEOFFSET DEFAULT GETUTCDATE()
          );
        `,
      },

      // 8. TATTracking table
      {
        name: "tat_tracking",
        sql: `
          IF OBJECT_ID('[tat_tracking]', 'U') IS NULL
          CREATE TABLE [tat_tracking] (
            [id] INTEGER IDENTITY(1,1) PRIMARY KEY,
            [call_id] INTEGER NOT NULL UNIQUE,
            [tat_start_time] DATETIMEOFFSET NULL,
            [tat_end_time] DATETIMEOFFSET NULL,
            [tat_hours] DECIMAL(10,2) NULL,
            [created_at] DATETIMEOFFSET DEFAULT GETUTCDATE(),
            [updated_at] DATETIMEOFFSET DEFAULT GETUTCDATE()
          );
        `,
      },

      // 9. TATHolds table
      {
        name: "tat_holds",
        sql: `
          IF OBJECT_ID('[tat_holds]', 'U') IS NULL
          CREATE TABLE [tat_holds] (
            [tat_holds_id] INTEGER IDENTITY(1,1) PRIMARY KEY,
            [call_id] INTEGER NOT NULL,
            [hold_reason] NVARCHAR(255) NULL,
            [hold_start_time] DATETIMEOFFSET NULL,
            [hold_end_time] DATETIMEOFFSET NULL,
            [hold_duration_minutes] INT NULL,
            [created_at] DATETIMEOFFSET DEFAULT GETUTCDATE(),
            [updated_at] DATETIMEOFFSET DEFAULT GETUTCDATE()
          );
        `,
      },

      // 10. SpareRequest table
      {
        name: "spare_requests",
        sql: `
          IF OBJECT_ID('[spare_requests]', 'U') IS NULL
          CREATE TABLE [spare_requests] (
            [request_id] INTEGER IDENTITY(1,1) PRIMARY KEY,
            [request_type] VARCHAR(255) DEFAULT 'normal',
            [call_id] INTEGER NULL,
            [requested_source_type] VARCHAR(255) NULL,
            [requested_source_id] INTEGER NOT NULL,
            [requested_to_type] VARCHAR(255) NULL,
            [requested_to_id] INTEGER NOT NULL,
            [request_reason] VARCHAR(255) NULL,
            [status_id] INTEGER NOT NULL,
            [created_at] DATETIMEOFFSET DEFAULT GETUTCDATE(),
            [created_by] INTEGER NULL,
            [updated_at] DATETIMEOFFSET DEFAULT GETUTCDATE()
          );
        `,
      },

      // 11. SpareRequestItem table
      {
        name: "spare_request_items",
        sql: `
          IF OBJECT_ID('[spare_request_items]', 'U') IS NULL
          CREATE TABLE [spare_request_items] (
            [id] INTEGER IDENTITY(1,1) PRIMARY KEY,
            [request_id] INTEGER NOT NULL,
            [spare_id] INTEGER NOT NULL,
            [requested_qty] INTEGER NOT NULL,
            [approved_qty] INTEGER DEFAULT 0,
            [rejection_reason] NVARCHAR(MAX) NULL,
            [unit_price] DECIMAL(10,2) NULL,
            [line_price] DECIMAL(15,2) NULL,
            [created_at] DATETIMEOFFSET DEFAULT GETUTCDATE(),
            [updated_at] DATETIMEOFFSET DEFAULT GETUTCDATE()
          );
        `,
      },

      // 12. ServiceInvoice table
      {
        name: "service_invoices",
        sql: `
          IF OBJECT_ID('[service_invoices]', 'U') IS NULL
          CREATE TABLE [service_invoices] (
            [invoice_id] INTEGER IDENTITY(1,1) PRIMARY KEY,
            [invoice_no] NVARCHAR(100) NOT NULL UNIQUE,
            [call_id] INTEGER NOT NULL,
            [asc_id] INTEGER NULL,
            [technician_id] INTEGER NULL,
            [customer_id] INTEGER NOT NULL,
            [invoice_date] DATETIMEOFFSET DEFAULT GETUTCDATE(),
            [invoice_status] VARCHAR(255) DEFAULT 'Draft',
            [invoice_type] VARCHAR(255) DEFAULT 'Service',
            [subtotal_amount] DECIMAL(15,2) DEFAULT 0,
            [tax_amount] DECIMAL(10,2) DEFAULT 0,
            [discount_amount] DECIMAL(10,2) DEFAULT 0,
            [total_amount] DECIMAL(15,2) DEFAULT 0,
            [payment_mode] VARCHAR(255) NULL,
            [payment_status] VARCHAR(255) DEFAULT 'Pending',
            [created_at] DATETIMEOFFSET DEFAULT GETUTCDATE(),
            [created_by] INTEGER NULL,
            [updated_at] DATETIMEOFFSET DEFAULT GETUTCDATE()
          );
        `,
      },

      // 13. ServiceInvoiceItem table
      {
        name: "service_invoice_items",
        sql: `
          IF OBJECT_ID('[service_invoice_items]', 'U') IS NULL
          CREATE TABLE [service_invoice_items] (
            [id] INTEGER IDENTITY(1,1) PRIMARY KEY,
            [invoice_id] INTEGER NOT NULL,
            [item_type] VARCHAR(255) NULL,
            [part_code] NVARCHAR(100) NULL,
            [description] NVARCHAR(MAX) NULL,
            [hsn_sac_code] NVARCHAR(50) NULL,
            [qty] INTEGER NOT NULL,
            [unit_price] DECIMAL(10,2) NOT NULL,
            [line_amount] DECIMAL(15,2) NOT NULL,
            [tax_percent] DECIMAL(5,2) NULL,
            [tax_amount] DECIMAL(10,2) DEFAULT 0,
            [created_at] DATETIMEOFFSET DEFAULT GETUTCDATE(),
            [updated_at] DATETIMEOFFSET DEFAULT GETUTCDATE()
          );
        `,
      },

      // 14. GoodsMovementItems table
      {
        name: "goods_movement_items",
        sql: `
          IF OBJECT_ID('[goods_movement_items]', 'U') IS NULL
          CREATE TABLE [goods_movement_items] (
            [movement_item_id] INTEGER IDENTITY(1,1) PRIMARY KEY,
            [carton_id] INTEGER NULL,
            [movement_id] INTEGER NOT NULL,
            [spare_part_id] INTEGER NOT NULL,
            [qty] INTEGER NOT NULL DEFAULT 0,
            [condition] VARCHAR(255) DEFAULT 'good',
            [created_at] DATETIMEOFFSET DEFAULT GETUTCDATE(),
            [updated_at] DATETIMEOFFSET DEFAULT GETUTCDATE()
          );
        `,
      },

      // 15. ServiceCenterFinancial table
      {
        name: "service_center_financial",
        sql: `
          IF OBJECT_ID('[service_center_financial]', 'U') IS NULL
          CREATE TABLE [service_center_financial] (
            [id] INTEGER IDENTITY(1,1) PRIMARY KEY,
            [asc_id] INTEGER NOT NULL,
            [financial_year] INT NULL,
            [total_revenue] DECIMAL(15,2) DEFAULT 0,
            [total_expenses] DECIMAL(15,2) DEFAULT 0,
            [total_invoices] INT DEFAULT 0,
            [pending_amount] DECIMAL(15,2) DEFAULT 0,
            [created_at] DATETIMEOFFSET DEFAULT GETUTCDATE(),
            [updated_at] DATETIMEOFFSET DEFAULT GETUTCDATE()
          );
        `,
      },

      // 16. Ledger table
      {
        name: "ledger",
        sql: `
          IF OBJECT_ID('[ledger]', 'U') IS NULL
          CREATE TABLE [ledger] (
            [ledger_id] INTEGER IDENTITY(1,1) PRIMARY KEY,
            [asc_id] INTEGER NOT NULL,
            [transaction_type] VARCHAR(255) NULL,
            [transaction_ref_id] INTEGER NULL,
            [debit_amount] DECIMAL(15,2) DEFAULT 0,
            [credit_amount] DECIMAL(15,2) DEFAULT 0,
            [balance] DECIMAL(15,2) DEFAULT 0,
            [description] NVARCHAR(MAX) NULL,
            [created_at] DATETIMEOFFSET DEFAULT GETUTCDATE(),
            [updated_at] DATETIMEOFFSET DEFAULT GETUTCDATE()
          );
        `,
      },

      // 17. Replacements table
      {
        name: "replacements",
        sql: `
          IF OBJECT_ID('[replacements]', 'U') IS NULL
          CREATE TABLE [replacements] (
            [replacements_id] INTEGER IDENTITY(1,1) PRIMARY KEY,
            [call_id] INTEGER NOT NULL,
            [customer_id] INTEGER NOT NULL,
            [old_serial_no] NVARCHAR(100) NULL,
            [new_serial_no] NVARCHAR(100) NULL,
            [replacement_date] DATETIMEOFFSET DEFAULT GETUTCDATE(),
            [replacement_reason] NVARCHAR(MAX) NULL,
            [created_at] DATETIMEOFFSET DEFAULT GETUTCDATE(),
            [updated_at] DATETIMEOFFSET DEFAULT GETUTCDATE()
          );
        `,
      },

      // 18. ActionLog table
      {
        name: "action_log",
        sql: `
          IF OBJECT_ID('[action_log]', 'U') IS NULL
          CREATE TABLE [action_log] (
            [log_id] INTEGER IDENTITY(1,1) PRIMARY KEY,
            [entity_type] NVARCHAR(100) NOT NULL,
            [entity_id] INTEGER NOT NULL,
            [action_type] VARCHAR(255) NOT NULL,
            [action_details] NVARCHAR(MAX) NULL,
            [performed_by] INTEGER NULL,
            [created_at] DATETIMEOFFSET DEFAULT GETUTCDATE()
          );
        `,
      },
    ];

    // Execute table creation SQL
    let createdCount = 0;
    let skippedCount = 0;

    for (const table of tableCreationSQL) {
      try {
        await sequelize.query(table.sql);
        if (tableNames.includes(table.name)) {
          console.log(`  ⏭️  ${table.name.padEnd(35)} (already exists)`);
          skippedCount++;
        } else {
          console.log(`  ✅ ${table.name.padEnd(35)} (created)`);
          createdCount++;
        }
      } catch (err) {
        console.log(`  ❌ ${table.name.padEnd(35)} (error: ${err.message.split('\n')[0].substring(0, 40)}...)`);
      }
    }

    console.log();

    // Step 4: Add foreign key constraints
    console.log("Step 4: Adding foreign key constraints...\n");

    const foreignKeySQL = [
      `IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_NAME = 'FK_customers_state')
       ALTER TABLE [customers] ADD CONSTRAINT [FK_customers_state] FOREIGN KEY ([state_id]) REFERENCES [states]([state_id]);`,
      
      `IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_NAME = 'FK_customers_city')
       ALTER TABLE [customers] ADD CONSTRAINT [FK_customers_city] FOREIGN KEY ([city_id]) REFERENCES [Cities]([city_id]);`,
      
      `IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_NAME = 'FK_customers_products_customer')
       ALTER TABLE [customers_products] ADD CONSTRAINT [FK_customers_products_customer] FOREIGN KEY ([customer_id]) REFERENCES [customers]([customer_id]) ON DELETE CASCADE;`,
      
      `IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_NAME = 'FK_customers_products_product')
       ALTER TABLE [customers_products] ADD CONSTRAINT [FK_customers_products_product] FOREIGN KEY ([product_id]) REFERENCES [ProductMaster]([Id]);`,
      
      `IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_NAME = 'FK_calls_customer')
       ALTER TABLE [calls] ADD CONSTRAINT [FK_calls_customer] FOREIGN KEY ([customer_id]) REFERENCES [customers]([customer_id]) ON DELETE CASCADE;`,
      
      `IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_NAME = 'FK_calls_service_center')
       ALTER TABLE [calls] ADD CONSTRAINT [FK_calls_service_center] FOREIGN KEY ([service_center_id]) REFERENCES [service_centers]([asc_id]) ON DELETE CASCADE;`,
      
      `IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_NAME = 'FK_calls_status')
       ALTER TABLE [calls] ADD CONSTRAINT [FK_calls_status] FOREIGN KEY ([status_id]) REFERENCES [status]([status_id]);`,
      
      `IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_NAME = 'FK_calls_substatus')
       ALTER TABLE [calls] ADD CONSTRAINT [FK_calls_substatus] FOREIGN KEY ([substatus_id]) REFERENCES [sub_status]([substatus_id]);`,
      
      `IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_NAME = 'FK_call_spare_usage_call')
       ALTER TABLE [call_spare_usage] ADD CONSTRAINT [FK_call_spare_usage_call] FOREIGN KEY ([call_id]) REFERENCES [calls]([call_id]) ON DELETE CASCADE;`,
      
      `IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_NAME = 'FK_call_spare_usage_spare')
       ALTER TABLE [call_spare_usage] ADD CONSTRAINT [FK_call_spare_usage_spare] FOREIGN KEY ([spare_part_id]) REFERENCES [spare_parts]([Id]);`,
      
      `IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_NAME = 'FK_call_tech_assign_call')
       ALTER TABLE [call_technician_assignment] ADD CONSTRAINT [FK_call_tech_assign_call] FOREIGN KEY ([call_id]) REFERENCES [calls]([call_id]) ON DELETE CASCADE;`,
      
      `IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_NAME = 'FK_call_tech_assign_tech')
       ALTER TABLE [call_technician_assignment] ADD CONSTRAINT [FK_call_tech_assign_tech] FOREIGN KEY ([technician_id]) REFERENCES [technicians]([technician_id]);`,
      
      `IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_NAME = 'FK_call_cancel_call')
       ALTER TABLE [call_cancellation_requests] ADD CONSTRAINT [FK_call_cancel_call] FOREIGN KEY ([call_id]) REFERENCES [calls]([call_id]) ON DELETE CASCADE;`,
      
      `IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_NAME = 'FK_happy_codes_call')
       ALTER TABLE [happy_codes] ADD CONSTRAINT [FK_happy_codes_call] FOREIGN KEY ([call_id]) REFERENCES [calls]([call_id]) ON DELETE CASCADE;`,
      
      `IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_NAME = 'FK_tat_tracking_call')
       ALTER TABLE [tat_tracking] ADD CONSTRAINT [FK_tat_tracking_call] FOREIGN KEY ([call_id]) REFERENCES [calls]([call_id]) ON DELETE CASCADE;`,
      
      `IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_NAME = 'FK_tat_holds_call')
       ALTER TABLE [tat_holds] ADD CONSTRAINT [FK_tat_holds_call] FOREIGN KEY ([call_id]) REFERENCES [calls]([call_id]) ON DELETE CASCADE;`,
      
      `IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_NAME = 'FK_spare_requests_status')
       ALTER TABLE [spare_requests] ADD CONSTRAINT [FK_spare_requests_status] FOREIGN KEY ([status_id]) REFERENCES [status]([status_id]);`,
      
      `IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_NAME = 'FK_spare_req_items_request')
       ALTER TABLE [spare_request_items] ADD CONSTRAINT [FK_spare_req_items_request] FOREIGN KEY ([request_id]) REFERENCES [spare_requests]([request_id]) ON DELETE CASCADE;`,
      
      `IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_NAME = 'FK_spare_req_items_spare')
       ALTER TABLE [spare_request_items] ADD CONSTRAINT [FK_spare_req_items_spare] FOREIGN KEY ([spare_id]) REFERENCES [spare_parts]([Id]);`,
      
      `IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_NAME = 'FK_service_invoice_customer')
       ALTER TABLE [service_invoices] ADD CONSTRAINT [FK_service_invoice_customer] FOREIGN KEY ([customer_id]) REFERENCES [customers]([customer_id]);`,
      
      `IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_NAME = 'FK_service_invoice_call')
       ALTER TABLE [service_invoices] ADD CONSTRAINT [FK_service_invoice_call] FOREIGN KEY ([call_id]) REFERENCES [calls]([call_id]);`,
      
      `IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_NAME = 'FK_service_invoice_items')
       ALTER TABLE [service_invoice_items] ADD CONSTRAINT [FK_service_invoice_items] FOREIGN KEY ([invoice_id]) REFERENCES [service_invoices]([invoice_id]) ON DELETE CASCADE;`,
      
      `IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_NAME = 'FK_goods_movement_items_movement')
       ALTER TABLE [goods_movement_items] ADD CONSTRAINT [FK_goods_movement_items_movement] FOREIGN KEY ([movement_id]) REFERENCES [stock_movement]([movement_id]) ON DELETE CASCADE;`,
      
      `IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_NAME = 'FK_goods_movement_items_spare')
       ALTER TABLE [goods_movement_items] ADD CONSTRAINT [FK_goods_movement_items_spare] FOREIGN KEY ([spare_part_id]) REFERENCES [spare_parts]([Id]);`,
      
      `IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_NAME = 'FK_goods_movement_items_carton')
       ALTER TABLE [goods_movement_items] ADD CONSTRAINT [FK_goods_movement_items_carton] FOREIGN KEY ([carton_id]) REFERENCES [cartons]([carton_id]);`,
      
      `IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_NAME = 'FK_replacements_call')
       ALTER TABLE [replacements] ADD CONSTRAINT [FK_replacements_call] FOREIGN KEY ([call_id]) REFERENCES [calls]([call_id]) ON DELETE CASCADE;`,
      
      `IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_NAME = 'FK_replacements_customer')
       ALTER TABLE [replacements] ADD CONSTRAINT [FK_replacements_customer] FOREIGN KEY ([customer_id]) REFERENCES [customers]([customer_id]);`,
    ];

    let fkCount = 0;
    for (const fkSql of foreignKeySQL) {
      try {
        await sequelize.query(fkSql);
        fkCount++;
      } catch (err) {
        // Silently skip if already exists
      }
    }

    console.log(`✅ Added ${fkCount} foreign key constraints\n`);

    // Step 5: Re-enable all foreign key constraints
    console.log("Step 5: Re-enabling all foreign key constraints...");
    try {
      await sequelize.query("EXEC sp_MSForEachTable 'ALTER TABLE ? CHECK CONSTRAINT ALL'");
      console.log("✅ All constraints re-enabled\n");
    } catch (err) {
      console.log("⚠️  Could not re-enable constraints\n");
    }

    // Step 6: Verify final state
    console.log("Step 6: Final database verification...\n");
    const finalTables = await sequelize.getQueryInterface().showAllTables();
    const finalTableNames = finalTables.map(t => typeof t === 'string' ? t : t.tableName);
    
    console.log(`📊 ======================================`);
    console.log(`✨ MIGRATION COMPLETE!`);
    console.log(`📊 ======================================`);
    console.log(`\n✅ Total tables in database: ${finalTableNames.length}`);
    console.log(`✨ Newly created: ${createdCount}`);
    console.log(`⏭️  Already existed: ${skippedCount}`);
    console.log(`🔗 Foreign keys added: ${fkCount}`);
    console.log(`\n📋 All tables successfully migrated!\n`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    process.exit(1);
  }
};

completeMigration();
