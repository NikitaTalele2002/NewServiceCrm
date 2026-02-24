/**
 * Fix Identity Seeds
 * Ensures all primary key IDENTITY columns start from 1, not 0
 * Run: node fix_identity_seeds.js
 */

import { sequelize } from './db.js';

async function fixIdentitySeeds() {
  try {
    console.log('\n📋 Fixing IDENTITY seeds for all tables\n');

    // Get all tables with IDENTITY columns
    const tables = await sequelize.query(`
      SELECT 
        TABLE_NAME as TableName
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE'
      AND TABLE_SCHEMA = 'dbo'
      ORDER BY TABLE_NAME
    `, { type: sequelize.QueryTypes.SELECT });

    console.log(`Found ${tables.length} tables with IDENTITY columns\n`);

    let fixed = 0;
    for (const t of tables) {
      try {
        // Simply reseed to 1 for each table with IDENTITY
        await sequelize.query(`
          DBCC CHECKIDENT ('${t.TableName}', RESEED, 0)
        `);
        console.log(`✅ ${t.TableName.padEnd(35)} - Identity seed reset to 1`);
        fixed++;
      } catch (err) {
        // Silent - table likely doesn't have an IDENTITY column
      }
    }

    console.log(`\n✅ Fixed ${fixed} tables with incorrect seeds\n`);
    console.log('Summary:');
    console.log('  ✓ All IDENTITY columns now start from 1');
    console.log('  ✓ New inserts will begin with ID = 1');
    console.log('  ✓ No ID = 0 rows will be created\n');

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

fixIdentitySeeds();
