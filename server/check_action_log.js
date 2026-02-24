import { sequelize } from "./db.js";
import dotenv from "dotenv";

dotenv.config();

const checkActionLogColumns = async () => {
  try {
    await sequelize.authenticate();
    console.log("\n📊 CHECKING ACTION_LOG TABLE\n");

    const [results] = await sequelize.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'action_log'
      ORDER BY ORDINAL_POSITION
    `);

    console.log("📋 CURRENT COLUMNS IN action_log TABLE:");
    console.log("==========================================\n");

    results.forEach((col, index) => {
      const nullable = col.IS_NULLABLE === "YES" ? "NULL" : "NOT NULL";
      console.log(`${(index + 1).toString().padEnd(3)} ${col.COLUMN_NAME.padEnd(25)} | ${col.DATA_TYPE.padEnd(20)} | ${nullable}`);
    });

    console.log(`\n📌 Total current columns: ${results.length}\n`);

    // Expected columns from model
    const expectedColumns = [
      "log_id",
      "entity_type",
      "entity_id",
      "action_user_role_id",
      "user_id",
      "old_status_id",
      "new_status_id",
      "old_substatus_id",
      "new_substatus_id",
      "remarks",
      "action_at",
      "created_at",
      "updated_at",
    ];

    const currentColumns = results.map(c => c.COLUMN_NAME.toLowerCase());
    const missingColumns = expectedColumns.filter(col => 
      !currentColumns.some(dbCol => dbCol === col.toLowerCase())
    );

    console.log("📊 MISSING COLUMNS FROM MODEL:");
    console.log("==========================================\n");

    if (missingColumns.length === 0) {
      console.log("✅ All columns from model are present in database!\n");
    } else {
      console.log(`⚠️  Missing ${missingColumns.length} columns:\n`);
      missingColumns.forEach(col => {
        console.log(`   - ${col}`);
      });
      console.log();
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
};

checkActionLogColumns();
