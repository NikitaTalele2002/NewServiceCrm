import { sequelize } from "./db.js";
import dotenv from "dotenv";

dotenv.config();

/**
 * Comprehensive script to add all missing columns to database tables
 * Based on model definitions
 */

const addMissingColumns = async () => {
  try {
    console.log("\n📊 ======================================");
    console.log("⚡ ADDING MISSING COLUMNS TO TABLES");
    console.log("📊 ======================================\n");

    await sequelize.authenticate();
    console.log("✅ Database connected\n");

    // Define all missing columns for each table
    const missingColumnsSQL = [
      // CALLS TABLE - Missing many columns
      `ALTER TABLE [calls] ADD [assigned_asc_id] INT NULL;`,
      `ALTER TABLE [calls] ADD [assigned_tech_id] INT NULL;`,
      `ALTER TABLE [calls] ADD [call_source] VARCHAR(50) DEFAULT 'phone';`,
      `ALTER TABLE [calls] ADD [caller_type] VARCHAR(50) DEFAULT 'customer';`,
      `ALTER TABLE [calls] ADD [preferred_language] VARCHAR(50) NULL;`,
      `ALTER TABLE [calls] ADD [caller_mobile_no] VARCHAR(20) NULL;`,
      `ALTER TABLE [calls] ADD [remark] NVARCHAR(MAX) NULL;`,
      `ALTER TABLE [calls] ADD [visit_date] DATETIMEOFFSET NULL;`,
      `ALTER TABLE [calls] ADD [service_center_id] INT NULL;`,
      `ALTER TABLE [calls] ADD [status_id] INT NULL;`,
      `ALTER TABLE [calls] ADD [substatus_id] INT NULL;`,

      // SPARE_REQUESTS TABLE - Check for missing dynamic columns
      `ALTER TABLE [spare_requests] ADD [technician_id] INT NULL;`,
      `ALTER TABLE [spare_requests] ADD [service_center_id] INT NULL;`,
      `ALTER TABLE [spare_requests] ADD [branch_id] INT NULL;`,
      `ALTER TABLE [spare_requests] ADD [required_date] DATETIMEOFFSET NULL;`,
      `ALTER TABLE [spare_requests] ADD [approval_status] VARCHAR(255) DEFAULT 'pending';`,

      // SERVICE_INVOICES - Add missing audit columns
      `ALTER TABLE [service_invoices] ADD [payment_reference] NVARCHAR(100) NULL;`,
      `ALTER TABLE [service_invoices] ADD [reference_number] NVARCHAR(100) NULL;`,
      `ALTER TABLE [service_invoices] ADD [currency] VARCHAR(10) DEFAULT 'INR';`,

      // STOCK_MOVEMENT - Additional tracking columns
      `ALTER TABLE [stock_movement] ADD [warehouse_id] INT NULL;`,
      `ALTER TABLE [stock_movement] ADD [transport_mode] VARCHAR(100) NULL;`,
      `ALTER TABLE [stock_movement] ADD [delivery_date] DATETIMEOFFSET NULL;`,
      `ALTER TABLE [stock_movement] ADD [received_qty] INT DEFAULT 0;`,

      // APPROVALS - Additional audit columns
      `ALTER TABLE [approvals] ADD [approval_date] DATETIMEOFFSET NULL;`,
      `ALTER TABLE [approvals] ADD [assigned_at] DATETIMEOFFSET NULL;`,

      // SERVICE_INVOICE_ITEMS - Additional columns if missing
      `ALTER TABLE [service_invoice_items] ADD [part_id] INT NULL;`,
      `ALTER TABLE [service_invoice_items] ADD [warranty_applicable] BIT DEFAULT 0;`,

      // STOCK_MOVEMENT_DETAILS/GOODS_MOVEMENT_ITEMS
      `ALTER TABLE [goods_movement_items] ADD [bom_item_id] INT NULL;`,
      `ALTER TABLE [goods_movement_items] ADD [expiry_date] DATETIMEOFFSET NULL;`,

      // SPARE_REQUEST_ITEMS
      `ALTER TABLE [spare_request_items] ADD [allocated_qty] INT DEFAULT 0;`,
      `ALTER TABLE [spare_request_items] ADD [allocation_date] DATETIMEOFFSET NULL;`,

      // CUSTOMERS_PRODUCTS
      `ALTER TABLE [customers_products] ADD [amc_start_date] DATETIMEOFFSET NULL;`,
      `ALTER TABLE [customers_products] ADD [amc_end_date] DATETIMEOFFSET NULL;`,
      `ALTER TABLE [customers_products] ADD [is_under_amc] BIT DEFAULT 0;`,

      // TECHNICIANS - Additional columns
      `ALTER TABLE [technicians] ADD [qualification] VARCHAR(255) NULL;`,
      `ALTER TABLE [technicians] ADD [experience_years] INT NULL;`,
      `ALTER TABLE [technicians] ADD [mobile_no] VARCHAR(20) NULL;`,

      // STOCK_MOVEMENT - Add if missing
      `ALTER TABLE [stock_movement] ADD [do_number] NVARCHAR(100) NULL;`,
      `ALTER TABLE [stock_movement] ADD [delivery_number] NVARCHAR(100) NULL;`,
    ];

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    console.log("Adding missing columns...\n");

    for (const sql of missingColumnsSQL) {
      try {
        await sequelize.query(sql);
        const columnMatch = sql.match(/ADD \[([^\]]+)\]/);
        const columnName = columnMatch ? columnMatch[1] : "unknown";
        console.log(`✅ ${columnName.padEnd(35)} added`);
        successCount++;
      } catch (err) {
        const errorMsg = err.message.toLowerCase();
        if (errorMsg.includes("already exists") || errorMsg.includes("column name") || errorMsg.includes("duplicate")) {
          skipCount++;
        } else if (errorMsg.includes("invalid object name") || errorMsg.includes("does not exist")) {
          errorCount++;
        } else {
          console.log(`⚠️  Error: ${err.message.substring(0, 60)}`);
        }
      }
    }

    console.log("\n📊 ======================================");
    console.log("📋 SUMMARY");
    console.log("📊 ======================================\n");
    console.log(`✅ Columns added:    ${successCount}`);
    console.log(`⏭️  Columns skipped:  ${skipCount} (already exist)`);
    console.log(`❌ Errors:           ${errorCount}\n`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
};

addMissingColumns();
