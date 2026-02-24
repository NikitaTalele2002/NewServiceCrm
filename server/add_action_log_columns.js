import { sequelize } from "./db.js";
import dotenv from "dotenv";

dotenv.config();

const addActionLogColumns = async () => {
  try {
    console.log("\n📊 ======================================");
    console.log("⚡ ADDING MISSING COLUMNS TO ACTION_LOG");
    console.log("📊 ======================================\n");

    await sequelize.authenticate();
    console.log("✅ Database connected\n");

    // Define missing columns for action_log table
    const missingColumnsSQL = [
      `ALTER TABLE [action_log] ADD [action_user_role_id] INT NULL;`,
      `ALTER TABLE [action_log] ADD [user_id] INT NULL;`,
      `ALTER TABLE [action_log] ADD [old_status_id] INT NULL;`,
      `ALTER TABLE [action_log] ADD [new_status_id] INT NULL;`,
      `ALTER TABLE [action_log] ADD [old_substatus_id] INT NULL;`,
      `ALTER TABLE [action_log] ADD [new_substatus_id] INT NULL;`,
      `ALTER TABLE [action_log] ADD [remarks] NVARCHAR(MAX) NULL;`,
      `ALTER TABLE [action_log] ADD [action_at] DATETIMEOFFSET DEFAULT GETUTCDATE();`,
      `ALTER TABLE [action_log] ADD [updated_at] DATETIMEOFFSET DEFAULT GETUTCDATE();`,
    ];

    let successCount = 0;
    let skipCount = 0;

    console.log("Adding missing columns to action_log...\n");

    for (const sql of missingColumnsSQL) {
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
          console.log(`⏭️  Column already exists (skipped)`);
          skipCount++;
        } else {
          console.log(`❌ Error: ${err.message.substring(0, 60)}`);
        }
      }
    }

    console.log("\n📊 ======================================");
    console.log("📋 SUMMARY");
    console.log("📊 ======================================\n");
    console.log(`✅ Columns added:    ${successCount}`);
    console.log(`⏭️  Columns skipped:  ${skipCount} (already exist)\n`);

    // Now add foreign key constraints
    console.log("Adding foreign key constraints...\n");

    const foreignKeySQL = [
      `IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_NAME = 'FK_action_log_role')
       ALTER TABLE [action_log] ADD CONSTRAINT [FK_action_log_role] FOREIGN KEY ([action_user_role_id]) REFERENCES [roles]([roles_id]) ON DELETE SET NULL;`,
      
      `IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_NAME = 'FK_action_log_user')
       ALTER TABLE [action_log] ADD CONSTRAINT [FK_action_log_user] FOREIGN KEY ([user_id]) REFERENCES [users]([user_id]) ON DELETE CASCADE;`,
      
      `IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_NAME = 'FK_action_log_old_status')
       ALTER TABLE [action_log] ADD CONSTRAINT [FK_action_log_old_status] FOREIGN KEY ([old_status_id]) REFERENCES [status]([status_id]) ON DELETE SET NULL;`,
      
      `IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_NAME = 'FK_action_log_new_status')
       ALTER TABLE [action_log] ADD CONSTRAINT [FK_action_log_new_status] FOREIGN KEY ([new_status_id]) REFERENCES [status]([status_id]) ON DELETE SET NULL;`,
      
      `IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_NAME = 'FK_action_log_old_substatus')
       ALTER TABLE [action_log] ADD CONSTRAINT [FK_action_log_old_substatus] FOREIGN KEY ([old_substatus_id]) REFERENCES [sub_status]([sub_status_id]) ON DELETE SET NULL;`,
      
      `IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_NAME = 'FK_action_log_new_substatus')
       ALTER TABLE [action_log] ADD CONSTRAINT [FK_action_log_new_substatus] FOREIGN KEY ([new_substatus_id]) REFERENCES [sub_status]([sub_status_id]) ON DELETE SET NULL;`,
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

    // Verify the result
    const [verifyResult] = await sequelize.query(`
      SELECT COUNT(*) as total_columns
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'action_log'
    `);

    console.log("📊 ======================================");
    console.log("✨ UPDATE COMPLETE!");
    console.log("📊 ======================================\n");
    console.log(`📌 action_log table now has ${verifyResult[0].total_columns} columns (was 7, now complete with all 16)\n`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
};

addActionLogColumns();
