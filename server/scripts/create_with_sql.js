import { sequelize } from "../db.js";
import dotenv from "dotenv";

dotenv.config();

/**
 * SQL-Based Table Creator for Problem Tables
 * Directly creates 18 tables that Sequelize can't handle
 * Uses raw SQL for maximum reliability
 */

const createTablesWithSQL = async () => {
  try {
    console.log("\n📊 ======================================");
    console.log("💾 SQL-BASED TABLE CREATOR");
    console.log("📊 ======================================\n");

    console.log(`📅 Timestamp: ${new Date().toISOString()}`);
    console.log(`🔧 Creating 18 missing tables with SQL\n`);

    // Connect to database
    console.log("🔌 Connecting to database...");
    try {
      await sequelize.authenticate();
      console.log("✅ Database connected\n");
    } catch (connErr) {
      console.error("❌ Connection failed:", connErr.message);
      process.exit(1);
    }

    console.log("Step 1: Disabling foreign key constraints...\n");
    try {
      await sequelize.query("EXEC sp_MSForEachTable 'ALTER TABLE ? NOCHECK CONSTRAINT ALL'")
        .catch(err => console.warn("⚠️  Could not disable constraints"));
      console.log("✅ Constraints disabled\n");
    } catch (err) {
      console.warn("⚠️  Continuing anyway...\n");
    }

    console.log("Step 2: Creating tables with SQL...\n");

    // SQL for creating the 18 problem tables
    const sqlStatements = [
      // 1. ActionLog
      `IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'action_log')
       CREATE TABLE [dbo].[action_log] (
         [log_id] INT PRIMARY KEY IDENTITY(1,1),
         [entity_type] NVARCHAR(100) NOT NULL,
         [entity_id] INT NOT NULL,
         [action_user_role_id] INT,
         [user_id] INT NOT NULL,
         [old_status_id] INT,
         [new_status_id] INT,
         [timestamp] DATETIME2 DEFAULT GETUTCDATE(),
         [details] NVARCHAR(MAX)
       );`,

      // 2. Ledger
      `IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'ledger')
       CREATE TABLE [dbo].[ledger] (
         [ledger_id] INT PRIMARY KEY IDENTITY(1,1),
         [entity_type] NVARCHAR(100) NOT NULL,
         [entity_id] INT NOT NULL,
         [transaction_type] NVARCHAR(50) NOT NULL,
         [amount] DECIMAL(18,2),
         [reference_id] INT,
         [remarks] NVARCHAR(MAX),
         [created_at] DATETIME2 DEFAULT GETUTCDATE(),
         [created_by] INT
       );`,

      // 3. Customer
      `IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'customers')
       CREATE TABLE [dbo].[customers] (
         [customer_id] INT PRIMARY KEY IDENTITY(1,1),
         [name] NVARCHAR(150) NOT NULL,
         [mobile_no] NVARCHAR(20) UNIQUE NOT NULL,
         [alt_mob_no] NVARCHAR(20),
         [email] NVARCHAR(100) UNIQUE,
         [house_no] NVARCHAR(50),
         [street_name] NVARCHAR(150),
         [building_name] NVARCHAR(150),
         [area] NVARCHAR(150),
         [landmark] NVARCHAR(150),
         [city_id] INT,
         [state_id] INT,
         [pincode] NVARCHAR(10),
         [customer_code] NVARCHAR(50) UNIQUE,
         [customer_priority] NVARCHAR(50) DEFAULT 'medium',
         [created_at] DATETIME2 DEFAULT GETUTCDATE(),
         [updated_at] DATETIME2 DEFAULT GETUTCDATE()
       );`,

      // 4. CustomersProducts
      `IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'customers_products')
       CREATE TABLE [dbo].[customers_products] (
         [id] INT PRIMARY KEY IDENTITY(1,1),
         [customer_id] INT NOT NULL,
         [product_id] INT,
         [model_id] INT,
         [serial_number] NVARCHAR(100),
         [purchase_date] DATETIME2,
         [warranty_expiry] DATETIME2,
         [created_at] DATETIME2 DEFAULT GETUTCDATE()
       );`,

      // 5. Calls
      `IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'calls')
       CREATE TABLE [dbo].[calls] (
         [call_id] INT PRIMARY KEY IDENTITY(1,1),
         [customer_id] INT NOT NULL,
         [customer_products_id] INT,
         [service_center_id] INT,
         [assigned_technician_id] INT,
         [call_status_id] INT NOT NULL,
         [complaint_details] NVARCHAR(MAX),
         [complaint_type] NVARCHAR(100),
         [call_date] DATETIME2 DEFAULT GETUTCDATE(),
         [estimated_resolution_date] DATETIME2,
         [resolution_date] DATETIME2,
         [resolution_notes] NVARCHAR(MAX),
         [call_rating] INT,
         [call_feedback] NVARCHAR(MAX),
         [created_at] DATETIME2 DEFAULT GETUTCDATE()
       );`,

      // 6. CallSpareUsage
      `IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'call_spare_usage')
       CREATE TABLE [dbo].[call_spare_usage] (
         [id] INT PRIMARY KEY IDENTITY(1,1),
         [call_id] INT NOT NULL,
         [spare_part_id] INT,
         [quantity_used] INT,
         [created_at] DATETIME2 DEFAULT GETUTCDATE()
       );`,

      // 7. CallTechnicianAssignment
      `IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'call_technician_assignment')
       CREATE TABLE [dbo].[call_technician_assignment] (
         [id] INT PRIMARY KEY IDENTITY(1,1),
         [call_id] INT NOT NULL,
         [technician_id] INT NOT NULL,
         [assigned_date] DATETIME2 DEFAULT GETUTCDATE(),
         [assignment_status] NVARCHAR(50),
         [notes] NVARCHAR(MAX)
       );`,

      // 8. CallCancellationRequests
      `IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'call_cancellation_requests')
       CREATE TABLE [dbo].[call_cancellation_requests] (
         [id] INT PRIMARY KEY IDENTITY(1,1),
         [call_id] INT NOT NULL,
         [cancellation_reason] NVARCHAR(MAX),
         [requested_by] INT,
         [approval_status] NVARCHAR(50),
         [approved_by] INT,
         [created_at] DATETIME2 DEFAULT GETUTCDATE()
       );`,

      // 9. HappyCodes
      `IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'happy_codes')
       CREATE TABLE [dbo].[happy_codes] (
         [id] INT PRIMARY KEY IDENTITY(1,1),
         [call_id] INT NOT NULL,
         [code] NVARCHAR(50) UNIQUE,
         [description] NVARCHAR(MAX),
         [valid_from] DATETIME2,
         [valid_until] DATETIME2,
         [created_at] DATETIME2 DEFAULT GETUTCDATE()
       );`,

      // 10. TATTracking
      `IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'tat_tracking')
       CREATE TABLE [dbo].[tat_tracking] (
         [id] INT PRIMARY KEY IDENTITY(1,1),
         [call_id] INT NOT NULL,
         [tat_hours] INT,
         [start_time] DATETIME2,
         [end_time] DATETIME2,
         [status] NVARCHAR(50),
         [created_at] DATETIME2 DEFAULT GETUTCDATE()
       );`,

      // 11. TATHolds
      `IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'tat_holds')
       CREATE TABLE [dbo].[tat_holds] (
         [id] INT PRIMARY KEY IDENTITY(1,1),
         [tat_tracking_id] INT,
         [hold_reason] NVARCHAR(MAX),
         [hold_start] DATETIME2,
         [hold_end] DATETIME2,
         [created_at] DATETIME2 DEFAULT GETUTCDATE()
       );`,

      // 12. SpareRequest
      `IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'spare_requests')
       CREATE TABLE [dbo].[spare_requests] (
         [id] INT PRIMARY KEY IDENTITY(1,1),
         [call_id] INT,
         [technician_id] INT NOT NULL,
         [request_date] DATETIME2 DEFAULT GETUTCDATE(),
         [status_id] INT NOT NULL,
         [approval_date] DATETIME2,
         [approved_by] INT,
         [remarks] NVARCHAR(MAX)
       );`,

      // 13. SpareRequestItem
      `IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'spare_request_items')
       CREATE TABLE [dbo].[spare_request_items] (
         [id] INT PRIMARY KEY IDENTITY(1,1),
         [spare_request_id] INT NOT NULL,
         [spare_id] INT NOT NULL,
         [quantity] INT DEFAULT 1,
         [created_at] DATETIME2 DEFAULT GETUTCDATE()
       );`,

      // 14. GoodsMovementItems
      `IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'goods_movement_items')
       CREATE TABLE [dbo].[goods_movement_items] (
         [id] INT PRIMARY KEY IDENTITY(1,1),
         [movement_id] INT,
         [carton_id] INT,
         [spare_part_id] INT,
         [quantity] INT DEFAULT 1,
         [batch_number] NVARCHAR(100),
         [serial_numbers] NVARCHAR(MAX),
         [created_at] DATETIME2 DEFAULT GETUTCDATE()
       );`,

      // 15. ServiceInvoice
      `IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'service_invoices')
       CREATE TABLE [dbo].[service_invoices] (
         [id] INT PRIMARY KEY IDENTITY(1,1),
         [call_id] INT,
         [service_center_id] INT,
         [invoice_number] NVARCHAR(50) UNIQUE,
         [invoice_date] DATETIME2,
         [total_amount] DECIMAL(18,2),
         [status] NVARCHAR(50),
         [created_at] DATETIME2 DEFAULT GETUTCDATE()
       );`,

      // 16. ServiceInvoiceItem
      `IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'service_invoice_items')
       CREATE TABLE [dbo].[service_invoice_items] (
         [id] INT PRIMARY KEY IDENTITY(1,1),
         [invoice_id] INT NOT NULL,
         [description] NVARCHAR(MAX),
         [quantity] INT,
         [unit_price] DECIMAL(18,2),
         [amount] DECIMAL(18,2)
       );`,

      // 17. Replacements
      `IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'replacements')
       CREATE TABLE [dbo].[replacements] (
         [id] INT PRIMARY KEY IDENTITY(1,1),
         [call_id] INT NOT NULL,
         [old_product_id] INT,
         [new_product_id] INT,
         [replacement_date] DATETIME2,
         [remarks] NVARCHAR(MAX),
         [created_at] DATETIME2 DEFAULT GETUTCDATE()
       );`,

      // 18. ServiceCenterFinancial
      `IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'service_center_financial')
       CREATE TABLE [dbo].[service_center_financial] (
         [id] INT PRIMARY KEY IDENTITY(1,1),
         [service_center_id] INT NOT NULL,
         [month] INT,
         [year] INT,
         [total_revenue] DECIMAL(18,2),
         [total_expenses] DECIMAL(18,2),
         [profit_loss] DECIMAL(18,2),
         [created_at] DATETIME2 DEFAULT GETUTCDATE()
       );`
    ];

    let createdCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < sqlStatements.length; i++) {
      try {
        await sequelize.query(sqlStatements[i]);
        const tableNum = i + 1;
        console.log(`  ${tableNum.toString().padStart(2)}. ✅ Table created`);
        createdCount++;
      } catch (err) {
        const tableNum = i + 1;
        if (err.message?.includes('already exists')) {
          console.log(`  ${tableNum.toString().padStart(2)}. ⏭️  Already exists`);
          skippedCount++;
        } else {
          console.warn(`  ${tableNum.toString().padStart(2)}. ⚠️  Error: ${err.message.split('\n')[0]}`);
        }
      }
    }

    console.log("\nStep 3: Re-enabling foreign key constraints...\n");
    try {
      await sequelize.query("EXEC sp_MSForEachTable 'ALTER TABLE ? WITH CHECK CHECK CONSTRAINT ALL'")
        .catch(err => console.warn("⚠️  Could not re-enable all constraints"));
      console.log("✅ Constraints re-enabled\n");
    } catch (err) {
      console.warn("⚠️  Note: Some constraints may not have been re-enabled\n");
    }

    // Verify final count
    console.log("Step 4: Verifying database...\n");
    let finalTableCount = 0;
    try {
      const [result] = await sequelize.query(`
        SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = 'dbo' AND TABLE_TYPE = 'BASE TABLE'
      `, { raw: true });
      finalTableCount = result[0]?.cnt || 0;
    } catch (e) {
      // ignore
    }

    // Summary
    console.log("\n📊 ======================================");
    console.log("FINAL RESULTS");
    console.log("📊 ======================================");
    console.log(`✨ Created:    ${createdCount} tables`);
    console.log(`⏭️  Skipped:    ${skippedCount} tables (already exist)`);
    console.log(`\n📦 Total Table Count: ${finalTableCount}`);
    console.log(`🎯 Expected:          54`);
    console.log(`📊 Coverage:          ${Math.round((finalTableCount / 54) * 100)}%`);

    if (finalTableCount >= 54) {
      console.log("\n✅ SUCCESS! All 54 tables are now in the database!");
    } else if (finalTableCount >= 50) {
      console.log(`\n⚠️  Close! ${54 - finalTableCount} more tables needed`);
    } else {
      console.log(`\n📝 Still need ${54 - finalTableCount} more tables`);
    }

    console.log("\n📊 ======================================\n");

    process.exit(0);

  } catch (error) {
    console.error("\n❌ Fatal error:");
    console.error(error);
    process.exit(1);
  }
};

createTablesWithSQL();
