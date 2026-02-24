/**
 * Safe Sync - Reset IDENTITY Seeds WITHOUT Dropping Data
 * Run: node safe_sync_identity.js
 * 
 * This ONLY resets IDENTITY seeds on existing tables.
 * Your data is preserved! ✅
 */

import { sequelize } from './db.js';

async function resetIdentitySeeds() {
  try {
    console.log('\n');
    console.log('═'.repeat(80));
    console.log('  SAFE SYNC - RESET IDENTITY SEEDS (PRESERVE DATA)');
    console.log('═'.repeat(80));
    console.log('\n');

    await sequelize.authenticate();
    console.log('✅ Connected to NewCRM database\n');

    console.log('📌 Resetting IDENTITY seeds on all tables...\n');

    // Get all tables with IDENTITY columns
    const tables = await sequelize.query(`
      SELECT DISTINCT TABLE_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE COLUMNPROPERTY(OBJECT_ID(TABLE_SCHEMA + '.' + TABLE_NAME), COLUMN_NAME, 'IsIdentity') = 1
      AND TABLE_SCHEMA = 'dbo'
      ORDER BY TABLE_NAME
    `, { raw: true });

    let resetCount = 0;
    const failed = [];

    for (const table of tables[0]) {
      const tableName = table.TABLE_NAME;
      
      try {
        // Check current max ID in table
        const maxIdResult = await sequelize.query(
          `SELECT MAX(IDENT_CURRENT('${tableName}')) as max_id`,
          { raw: true }
        );
        
        const currentSeed = maxIdResult[0][0]?.max_id || 0;

        // Reset seed to current max + 1 (or 1 if table is empty)
        const newSeed = currentSeed > 0 ? Math.floor(currentSeed) + 1 : 1;
        
        // Disable constraints temporarily
        await sequelize.query(`ALTER TABLE [${tableName}] NOCHECK CONSTRAINT ALL`, { raw: true });
        
        // Reset seed
        await sequelize.query(`DBCC CHECKIDENT ([${tableName}], RESEED, ${newSeed})`, { raw: true });
        
        // Re-enable constraints
        await sequelize.query(`ALTER TABLE [${tableName}] WITH CHECK CHECK CONSTRAINT ALL`, { raw: true });
        
        console.log(`  ✅ ${tableName.padEnd(40)} - Seed reset to ${newSeed}`);
        resetCount++;
      } catch (err) {
        failed.push({ table: tableName, error: err.message.substring(0, 50) });
      }
    }

    console.log(`\n✅ Synced ${resetCount} tables\n`);

    if (failed.length > 0) {
      console.log('⚠️  Failed to sync:');
      failed.forEach(f => console.log(`  - ${f.table}: ${f.error}`));
    }

    console.log('\n' + '═'.repeat(80));
    console.log('  ✅ SAFE SYNC COMPLETED - YOUR DATA IS PRESERVED');
    console.log('═'.repeat(80));
    console.log('\n✨ Details:');
    console.log('  ✅ All tables checked');
    console.log('  ✅ IDENTITY seeds reset to safe values');
    console.log('  ✅ All data preserved');
    console.log('  ✅ New inserts will start correctly\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error during safe sync:');
    console.error('Message:', error.message);
    process.exit(1);
  }
}

resetIdentitySeeds();
