import { sequelize } from "./db.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Check and identify missing columns in database tables
 */

const checkMissingColumns = async () => {
  try {
    console.log("\n📊 ======================================");
    console.log("🔍 CHECKING FOR MISSING COLUMNS");
    console.log("📊 ======================================\n");

    await sequelize.authenticate();
    console.log("✅ Database connected\n");

    const modelsPath = path.join(__dirname, "models");
    const modelFiles = fs
      .readdirSync(modelsPath)
      .filter((f) => f.endsWith(".js"));

    const issues = [];

    for (const file of modelFiles) {
      const modelPath = path.join(modelsPath, file);
      const modelModule = await import(`file://${modelPath}`);
      const model = modelModule.default;

      if (!model || !model.tableName) continue;

      const tableName = model.tableName;
      const modelAttributes = model.rawAttributes || {};

      try {
        // Get actual columns from database
        const [results] = await sequelize.query(`
          SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_NAME = '${tableName}'
          ORDER BY ORDINAL_POSITION
        `);

        const dbColumns = results.map((r) => r.COLUMN_NAME.toLowerCase());

        // Check model attributes
        const missingCols = [];
        for (const [attrName, attr] of Object.entries(modelAttributes)) {
          if (dbColumns.indexOf(attrName.toLowerCase()) === -1) {
            missingCols.push({
              column: attrName,
              type: attr.type?.key || attr.type?.toString?.() || "STRING",
            });
          }
        }

        if (missingCols.length > 0) {
          console.log(`⚠️  TABLE: ${tableName}`);
          console.log(`   Missing columns: ${missingCols.length}`);
          missingCols.forEach((col) => {
            console.log(`   - ${col.column} (${col.type})`);
          });
          console.log();
          issues.push({ table: tableName, columns: missingCols });
        }
      } catch (err) {
        console.log(`❌ Error checking ${tableName}: ${err.message.substring(0, 50)}`);
      }
    }

    console.log("\n📊 ======================================");
    console.log(`📋 SUMMARY`);
    console.log("📊 ======================================");
    console.log(`\nTables with missing columns: ${issues.length}`);

    if (issues.length === 0) {
      console.log("✅ All tables have all required columns!\n");
    } else {
      console.log("\nTables to fix:");
      issues.forEach((issue) => {
        console.log(`  - ${issue.table}: ${issue.columns.length} columns`);
      });
      console.log();
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
};

checkMissingColumns();
