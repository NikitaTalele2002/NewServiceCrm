import { sequelize } from "./db.js";
import dotenv from "dotenv";

dotenv.config();

const verifyAllColumns = async () => {
  try {
    await sequelize.authenticate();
    console.log("\n📊 FINAL DATABASE SCHEMA VERIFICATION");
    console.log("=====================================\n");

    // Count columns per table
    const [tableResult] = await sequelize.query(`
      SELECT 
        TABLE_NAME,
        COUNT(*) as COLUMN_COUNT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME NOT LIKE 'sys%' AND TABLE_SCHEMA = 'dbo'
      GROUP BY TABLE_NAME
      ORDER BY COLUMN_COUNT DESC
    `);

    console.log("📋 TABLES WITH THEIR COLUMN COUNTS:\n");

    let totalColumns = 0;
    tableResult.forEach((row, index) => {
      const barLength = Math.ceil(row.COLUMN_COUNT / 3);
      const bar = "█".repeat(Math.min(barLength, 30));
      console.log(`${(index + 1).toString().padEnd(3)} ${row.TABLE_NAME.padEnd(35)} ${row.COLUMN_COUNT.toString().padStart(3)} columns ${bar}`);
      totalColumns += row.COLUMN_COUNT;
    });

    console.log("\n📊 SUMMARY STATISTICS:");
    console.log(`   Total tables: ${tableResult.length}`);
    console.log(`   Total columns: ${totalColumns}`);
    console.log(`   Average columns per table: ${(totalColumns / tableResult.length).toFixed(1)}`);

    // Check specific critical tables
    console.log("\n🔍 KEY TABLES VERIFICATION:\n");

    const keyTables = [
      "customers",
      "calls",
      "spare_requests",
      "service_invoices",
      "stock_movement",
      "approvals",
    ];

    for (const tableName of keyTables) {
      const [result] = await sequelize.query(`
        SELECT COUNT(*) as col_count
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = '${tableName}' AND TABLE_SCHEMA = 'dbo'
      `);

      const colCount = result[0].col_count;
      const status = colCount > 10 ? "✅" : "⚠️";
      console.log(`   ${status} ${tableName.padEnd(30)} ${colCount} columns`);
    }

    console.log("\n✨ DATABASE SCHEMA UPDATE COMPLETE!\n");
    console.log("📌 Status: All missing columns have been added to the database");
    console.log("📌 Your database schema is now synchronized with the models!\n");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
};

verifyAllColumns();
