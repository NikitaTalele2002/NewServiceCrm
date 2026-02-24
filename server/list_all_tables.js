import { sequelize } from "./db.js";
import dotenv from "dotenv";

dotenv.config();

(async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connected\n");

    const tables = await sequelize.getQueryInterface().showAllTables();
    console.log(`📊 Total tables found: ${tables.length}\n`);
    console.log("📋 Tables in database:");
    const tableNames = tables.map(t => typeof t === 'string' ? t : t.tableName || JSON.stringify(t));
    tableNames.sort().forEach((table, index) => {
      console.log(`${index + 1}. ${table}`);
    });

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
})();
