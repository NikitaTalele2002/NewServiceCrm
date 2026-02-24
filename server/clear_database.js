import sql from "mssql";
import dotenv from "dotenv";

dotenv.config();

const config = {
  user: "crm_user",
  password: "StrongPassword123!",
  server: "localhost",
  database: "NewCRM",
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
  options: {
    encrypt: false,
    trustServerCertificate: true,
    instanceName: "SQLEXPRESS",
  },
};

async function clearDatabase() {
  const pool = new sql.ConnectionPool(config);

  try {
    console.log("🔄 Connecting to database...");
    await pool.connect();
    console.log("✅ Connected to database: NewCRM\n");

    const request = pool.request();

    console.log("⚠️  Starting database cleanup...\n");

    // Step 1: Drop all foreign key constraints
    console.log("1️⃣  Dropping all foreign key constraints...");
    await request.query(`
      DECLARE @sql NVARCHAR(MAX) = '';
      SELECT @sql += 'ALTER TABLE [' + TABLE_SCHEMA + '].[' + TABLE_NAME + '] DROP CONSTRAINT [' + CONSTRAINT_NAME + '];'
      FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
      WHERE CONSTRAINT_TYPE = 'FOREIGN KEY'
      AND TABLE_SCHEMA = 'dbo';
      
      IF LEN(@sql) > 0 EXEC(@sql);
    `);
    console.log("   ✅ All foreign key constraints dropped\n");

    // Step 2: Get all tables
    console.log("2️⃣  Retrieving all tables...");
    const tablesResult = await request.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE' 
      AND TABLE_SCHEMA = 'dbo'
      ORDER BY TABLE_NAME
    `);

    const tables = tablesResult.recordset.map((row) => row.TABLE_NAME);

    if (tables.length === 0) {
      console.log("   ℹ️  No tables found in database\n");
      console.log("✅ Database is already empty!");
      await pool.close();
      process.exit(0);
    }

    console.log(`   ✅ Found ${tables.length} tables\n`);
    console.log("   Tables to be deleted:");
    tables.forEach((table, index) => {
      console.log(`   ${index + 1}. ${table}`);
    });
    console.log();

    // Step 3: Delete all tables
    console.log("3️⃣  Deleting all tables...");
    for (const table of tables) {
      try {
        await request.query(`DROP TABLE [${table}]`);
        console.log(`   ✅ Dropped: ${table}`);
      } catch (error) {
        console.error(`   ❌ Error dropping ${table}: ${error.message}`);
      }
    }
    console.log();

    // Step 4: Verify all tables are gone
    console.log("4️⃣  Verifying cleanup...");
    const verifyResult = await request.query(`
      SELECT COUNT(*) as TableCount
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE' 
      AND TABLE_SCHEMA = 'dbo'
    `);

    const remainingTables = verifyResult.recordset[0].TableCount;

    if (remainingTables === 0) {
      console.log("   ✅ All tables successfully deleted\n");
      console.log("🎉 Database cleared successfully!");
      console.log("⚠️  WARNING: This operation cannot be undone!\n");
    } else {
      console.log(`   ⚠️  Warning: ${remainingTables} tables still remain\n`);
    }

    await pool.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error clearing database:");
    console.error(error);
    process.exit(1);
  }
}

// Run the cleanup
clearDatabase();
