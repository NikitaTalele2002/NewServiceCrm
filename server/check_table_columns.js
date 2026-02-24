import { sequelize } from "./db.js";
import dotenv from "dotenv";

dotenv.config();

const checkSchema = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Connected to database\n");

    // List of critical tables to check
    const tablesToCheck = [
      "customers",
      "calls",
      "spare_requests",
      "service_invoices",
      "stock_movement",
      "approvals",
    ];

    console.log("📊 CHECKING TABLE COLUMNS\n");
    console.log("=".repeat(80));

    for (const tableName of tablesToCheck) {
      try {
        const [results] = await sequelize.query(`
          SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_NAME = '${tableName}'
          ORDER BY ORDINAL_POSITION
        `);

        console.log(`\n📋 TABLE: ${tableName}`);
        console.log(`   Total columns: ${results.length}\n`);

        results.forEach((col) => {
          const nullable = col.IS_NULLABLE === "YES" ? "NULL" : "NOT NULL";
          console.log(
            `   ✓ ${col.COLUMN_NAME.padEnd(25)} | ${col.DATA_TYPE.padEnd(20)} | ${nullable}`
          );
        });
      } catch (err) {
        console.log(`   ❌ Error checking ${tableName}: ${err.message.substring(0, 50)}`);
      }
    }

    console.log("\n" + "=".repeat(80) + "\n");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
};

checkSchema();
