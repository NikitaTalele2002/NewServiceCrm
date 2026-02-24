import { sequelize } from "../db.js";
import dotenv from "dotenv";

dotenv.config();

/**
 * Database Sync Status Diagnosis
 * Analyzes current database state and recommends next steps
 */

const diagnoseSyncStatus = async () => {
  try {
    console.log("\n📊 ======================================");
    console.log("🔍 DATABASE SYNC STATUS DIAGNOSIS");
    console.log("📊 ======================================\n");
    
    // Connect to database
    console.log("🔌 Checking database connection...");
    try {
      await sequelize.authenticate();
      console.log("✅ Database connected\n");
    } catch (err) {
      console.error("❌ Cannot connect to database:", err.message);
      process.exit(1);
    }

    // Get all tables
    console.log("📦 Scanning database tables...\n");
    let existingTables = [];
    try {
      const [result] = await sequelize.query(`
        SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = 'dbo' AND TABLE_TYPE = 'BASE TABLE'
        ORDER BY TABLE_NAME
      `, { raw: true });
      existingTables = result.map(r => r.TABLE_NAME);
    } catch (e) {
      console.warn("⚠️  Could not query tables");
    }

    // Known problem tables
    const problemTables = [
      'ActionLog', 'Ledger', 'Customer', 'CustomersProducts', 'Calls', 'HappyCodes',
      'TATTracking', 'TATHolds', 'CallTechnicianAssignment', 'CallCancellationRequests',
      'CallSpareUsage', 'ServiceInvoice', 'ServiceInvoiceItem', 'Replacements',
      'ServiceCenterFinancial', 'SpareRequest', 'SpareRequestItem', 'GoodsMovementItems'
    ];

    // Find which problem tables exist
    const problemTablesExisting = problemTables.filter(t => 
      existingTables.some(et => et.toLowerCase() === t.toLowerCase())
    );

    // Health metrics
    const totalTables = existingTables.length;
    const problemTablesCount = problemTablesExisting.length;
    const healthyTablesCount = totalTables - problemTablesCount;
    const healthPercentage = Math.round((healthyTablesCount / totalTables) * 100);

    // Display status
    console.log("📊 DATABASE HEALTH REPORT:\n");
    console.log(`   Total Tables:        ${totalTables}`);
    console.log(`   ✅ Healthy Tables:   ${healthyTablesCount} (${healthPercentage}%)`);
    console.log(`   ⚠️  Problem Tables:   ${problemTablesCount} (${100 - healthPercentage}%)\n`);

    // Check for data in problem tables
    console.log("🔍 Checking for data in problem tables...\n");
    
    let dataCounts = {};
    let hasData = false;

    for (const table of problemTablesExisting) {
      try {
        const tableName = table.toLowerCase();
        const [result] = await sequelize.query(
          `SELECT COUNT(*) as cnt FROM [dbo].[${tableName}]`,
          { raw: true }
        );
        const count = result[0]?.cnt || 0;
        if (count > 0) {
          hasData = true;
          dataCounts[table] = count;
          console.log(`   ${table}: ${count} rows`);
        }
      } catch (e) {
        // Ignore errors for specific tables
      }
    }

    if (!hasData) {
      console.log("   ✅ No data in problem tables\n");
    }

    // Diagnosis and recommendation
    console.log("\n📋 DIAGNOSTIC ANALYSIS:\n");

    const recommendation = analyzeAndRecommend(healthPercentage, problemTablesCount, hasData);
    console.log(recommendation);

    console.log("\n📊 ======================================\n");

    process.exit(0);

  } catch (error) {
    console.error("\n❌ Error during diagnosis:");
    console.error(error.message);
    process.exit(1);
  }
};

function analyzeAndRecommend(healthPercentage, problemCount, hasData) {
  let recommendation = "";

  if (healthPercentage === 100) {
    recommendation = `✅ EXCELLENT STATUS
   All ${problemCount} known problem tables are either:
   • Already properly synced, OR
   • Not yet created in the database
   
   RECOMMENDATION: Run npm run sync-database
   • Safe and non-destructive
   • Will create any missing tables
   • No data is at risk`;
  } else if (healthPercentage >= 75) {
    recommendation = `✅ GOOD STATUS
   Database is mostly healthy (${healthPercentage}% of expected tables synced)
   ${problemCount} tables have schema conflicts
   
   ${hasData ? `   ${Object.keys({}).length} tables contain data` : '   No critical data in problem tables'}
   
   RECOMMENDATION: Run npm run sync-database
   • Start with the safe approach
   • No data will be lost
   • Can always upgrade to ALTER if needed`;
  } else if (healthPercentage >= 50) {
    recommendation = `⚠️  MODERATE ISSUES
   ${problemCount} problem tables detected (${100 - healthPercentage}% affected)
   ${hasData ? `   ⚠️  Data in problem tables detected` : '   ✅ Problem tables are empty'}
   
   RECOMMENDATION:
   ${hasData ? 
     `   Step 1: npm run sync-with-alter
      • Preserves your data
      • Attempts to fix schema conflicts
      • Use if data is valuable` : 
     `   Step 1: npm run sync-drop-recreate
      • Tables are empty (safe to drop)
      • Creates clean schema
      • Fastest solution`}`;
  } else {
    recommendation = `❌ CRITICAL ISSUES
   Too many problem tables (only ${healthPercentage}% synced)
   
   ${hasData ? 
     `   ⚠️  Multiple tables contain data
   
   BEFORE proceeding:
   1. Backup your database immediately
   2. Assess data importance
   3. Determine if data can be regenerated
   
   RECOMMENDATION:
   • npm run sync-database (safest first step)
   • npm run sync-with-alter (try to fix while keeping data)
   • npm run sync-drop-recreate (only if data isn't essential)` :
     `   ✅ Problem tables are empty
   
   RECOMMENDATION: Run npm run sync-drop-recreate
   • All problem tables will be dropped and recreated
   • No data loss (they're already empty)
   • Cleanest solution`}`;
  }

  return recommendation;
}

diagnoseSyncStatus();
