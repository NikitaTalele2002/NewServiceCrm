import { sequelize } from "./db.js";
import dotenv from "dotenv";

dotenv.config();

/**
 * Add additional missing columns from models to database tables
 */

const addAdditionalColumns = async () => {
  try {
    console.log("\n📊 ======================================");
    console.log("⚡ ADDING ADDITIONAL MISSING COLUMNS");
    console.log("📊 ======================================\n");

    await sequelize.authenticate();
    console.log("✅ Database connected\n");

    // Additional columns discovered from full model review
    const additionalColumnsSQL = [
      // CALLS TABLE - Continue adding more missing columns
      `ALTER TABLE [calls] ADD [service_center_id] INT NULL;`,
      `ALTER TABLE [calls] ADD [status_id] INT NULL;`,
      `ALTER TABLE [calls] ADD [substatus_id] INT NULL;`,
      `ALTER TABLE [calls] ADD [complaint] NVARCHAR(MAX) NULL;`,
      `ALTER TABLE [calls] ADD [resolution] NVARCHAR(MAX) NULL;`,
      `ALTER TABLE [calls] ADD [closed_date] DATETIMEOFFSET NULL;`,
      `ALTER TABLE [calls] ADD [tat_date] DATETIMEOFFSET NULL;`,
      `ALTER TABLE [calls] ADD [priority] VARCHAR(50) DEFAULT 'normal';`,

      // SPARE_PARTS - Additional tracking columns
      `ALTER TABLE [spare_parts] ADD [category] VARCHAR(100) NULL;`,
      `ALTER TABLE [spare_parts] ADD [hsn_code] VARCHAR(50) NULL;`,
      `ALTER TABLE [spare_parts] ADD [tax_percent] DECIMAL(5,2) NULL;`,
      `ALTER TABLE [spare_parts] ADD [warranty_months] INT NULL;`,
      `ALTER TABLE [spare_parts] ADD [is_critical] BIT DEFAULT 0;`,

      // SPARE_INVENTORY - Additional tracking
      `ALTER TABLE [spare_inventory] ADD [reorder_level] INT DEFAULT 0;`,
      `ALTER TABLE [spare_inventory] ADD [max_stock] INT DEFAULT 0;`,
      `ALTER TABLE [spare_inventory] ADD [supplier_id] INT NULL;`,
      `ALTER TABLE [spare_inventory] ADD [last_received_date] DATETIMEOFFSET NULL;`,

      // TECHNICIANS - Additional profile columns
      `ALTER TABLE [technicians] ADD [email] VARCHAR(100) NULL;`,
      `ALTER TABLE [technicians] ADD [date_of_birth] DATETIMEOFFSET NULL;`,
      `ALTER TABLE [technicians] ADD [joining_date] DATETIMEOFFSET NULL;`,
      `ALTER TABLE [technicians] ADD [status] VARCHAR(50) DEFAULT 'active';`,

      // SERVICE_CENTERS - Additional columns
      `ALTER TABLE [service_centers] ADD [contact_person] VARCHAR(100) NULL;`,
      `ALTER TABLE [service_centers] ADD [contact_email] VARCHAR(100) NULL;`,
      `ALTER TABLE [service_centers] ADD [contact_mobile] VARCHAR(20) NULL;`,
      `ALTER TABLE [service_centers] ADD [manager_id] INT NULL;`,

      // STOCK_MOVEMENT - Additional handling columns
      `ALTER TABLE [stock_movement] ADD [handling_type] VARCHAR(100) NULL;`,
      `ALTER TABLE [stock_movement] ADD [po_number] NVARCHAR(100) NULL;`,
      `ALTER TABLE [stock_movement] ADD [invoice_number] NVARCHAR(100) NULL;`,

      // CARTONS - Additional tracking
      `ALTER TABLE [cartons] ADD [weight] DECIMAL(10,2) NULL;`,
      `ALTER TABLE [cartons] ADD [dimensions] VARCHAR(255) NULL;`,
      `ALTER TABLE [cartons] ADD [seal_number] NVARCHAR(100) NULL;`,

      // USERS - Additional profile columns
      `ALTER TABLE [users] ADD [phone_number] VARCHAR(20) NULL;`,
      `ALTER TABLE [users] ADD [department] VARCHAR(100) NULL;`,
      `ALTER TABLE [users] ADD [reporting_to] INT NULL;`,

      // ATTACHMENTS - Content type tracking
      `ALTER TABLE [attachments] ADD [mime_type] VARCHAR(100) NULL;`,
      `ALTER TABLE [attachments] ADD [file_size] BIGINT NULL;`,
      `ALTER TABLE [attachments] ADD [stored_path] VARCHAR(500) NULL;`,

      // APPROVALS - Additional workflow columns
      `ALTER TABLE [approvals] ADD [approval_sequence] INT NULL;`,
      `ALTER TABLE [approvals] ADD [rejection_reason] NVARCHAR(MAX) NULL;`,
      `ALTER TABLE [approvals] ADD [escalated] BIT DEFAULT 0;`,

      // CALLS - Add referenced tables foreign keys that were missing
      `ALTER TABLE [calls] ADD [call_date] DATETIMEOFFSET DEFAULT GETUTCDATE();`,
      `ALTER TABLE [calls] ADD [created_by] INT NULL;`,

      // LOGISTICS_DOCUMENTS - Additional tracking
      `ALTER TABLE [logistics_documents] ADD [vehicle_number] VARCHAR(50) NULL;`,
      `ALTER TABLE [logistics_documents] ADD [driver_name] VARCHAR(100) NULL;`,
      `ALTER TABLE [logistics_documents] ADD [transporter_id] INT NULL;`,
      `ALTER TABLE [logistics_documents] ADD [shipping_date] DATETIMEOFFSET NULL;`,
      `ALTER TABLE [logistics_documents] ADD [expected_delivery] DATETIMEOFFSET NULL;`,

      // LEDGER - Additional financial tracking
      `ALTER TABLE [ledger] ADD [invoice_id] INT NULL;`,
      `ALTER TABLE [ledger] ADD [reference_id] NVARCHAR(100) NULL;`,
      `ALTER TABLE [ledger] ADD [remarks] NVARCHAR(MAX) NULL;`,

      // REPLACEMENTS - Additional tracking
      `ALTER TABLE [replacements] ADD [replacement_type] VARCHAR(100) NULL;`,
      `ALTER TABLE [replacements] ADD [technician_id] INT NULL;`,
      `ALTER TABLE [replacements] ADD [created_at] DATETIMEOFFSET DEFAULT GETUTCDATE();`,
      `ALTER TABLE [replacements] ADD [updated_at] DATETIMEOFFSET DEFAULT GETUTCDATE();`,
    ];

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    console.log("Adding additional columns...\n");

    for (const sql of additionalColumnsSQL) {
      try {
        await sequelize.query(sql);
        const columnMatch = sql.match(/ADD \[([^\]]+)\]/);
        const columnName = columnMatch ? columnMatch[1] : "unknown";
        console.log(`✅ ${columnName.padEnd(35)} added`);
        successCount++;
      } catch (err) {
        const errorMsg = err.message.toLowerCase();
        if (
          errorMsg.includes("already exists") ||
          errorMsg.includes("column name") ||
          errorMsg.includes("duplicate")
        ) {
          skipCount++;
        } else if (
          errorMsg.includes("invalid object name") ||
          errorMsg.includes("does not exist")
        ) {
          errorCount++;
        } else {
          // console.log(`⚠️  Error: ${err.message.substring(0, 60)}`);
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

addAdditionalColumns();
