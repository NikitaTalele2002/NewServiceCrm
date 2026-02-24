// scripts/sync.js
import path from "path";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

import { sync } from "../models/index.js";
import { sequelize } from "../db.js";

// Resolve __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, "..", ".env") });

(async () => {
  try {
    // Flags: --force or --alter, or from .env
    const force = process.env.SYNC_FORCE === "true" || process.argv.includes("--force");
    const alter = process.env.SYNC_ALTER === "true" || process.argv.includes("--alter");

    console.log(` Starting Sequelize sync (force=${force}, alter=${alter})`);
    console.log(`   force=true  → drops existing tables (WARNING: data loss!)`);
    console.log(`   alter=true  → modifies existing tables to match models`);
    console.log(`   default     → creates tables if they don't exist (safe)\n`);

    await sync({ force, alter });

    // If alter, try to add FK constraint
    if (alter) {
      try {
        console.log(" Adding foreign key constraint for SpareParts.ModelID...");
        await sequelize.query(`
          IF NOT EXISTS (SELECT * FROM sys.foreign_keys WHERE name = 'FK_SpareParts_ModelID')
          BEGIN
            ALTER TABLE SpareParts
            ADD CONSTRAINT FK_SpareParts_ModelID
            FOREIGN KEY (ModelID) REFERENCES ProductModels(Id)
            ON UPDATE CASCADE
            ON DELETE SET NULL;
          END
        `);
        console.log(" ✓ FK constraint added.");
      } catch (fkErr) {
        console.warn(" Warning: Could not add FK constraint:", fkErr.message);
      }
    }

    console.log(" ✓ Models synchronized successfully.");
    await sequelize.close();
    process.exit(0);
  } catch (err) {
    console.error(" Failed to sync models:", err?.message || err);
    try {
      await sequelize.close();
    } catch (e) {}
    process.exit(1);
  }
})();

