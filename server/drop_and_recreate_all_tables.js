import { sequelize } from './db.js';
import sql from 'mssql';
import './models/index.js';
import dotenv from 'dotenv';

dotenv.config();

const config = {
  user: process.env.DB_USER || 'crm_user',
  password: process.env.DB_PASS || 'StrongPassword123!',
  database: process.env.DB_NAME || 'NewCRM',
  server: process.env.DB_SERVER || 'localhost',
  instanceName: process.env.DB_INSTANCE || 'SQLEXPRESS',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    requestTimeout: 60000,
  },
};

async function dropAndRecreateAllTables() {
  let pool;
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🗑️  DATABASE RESET - DROP ALL TABLES & RECREATE FROM MODELS');
    console.log('='.repeat(80) + '\n');

    pool = new sql.ConnectionPool(config);
    await pool.connect();
    console.log('✅ Connected to database\n');

    // Step 1: Get all table names
    console.log('📋 Step 1: Getting list of all tables...\n');
    const tablesResult = await pool.request().query(`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'dbo' AND TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `);

    const tableNames = tablesResult.recordset.map(r => r.TABLE_NAME);
    console.log(`Found ${tableNames.length} tables to drop:\n`);
    tableNames.forEach((name, idx) => {
      console.log(`  ${(idx + 1).toString().padStart(3)}. ${name}`);
    });

    if (tableNames.length === 0) {
      console.log('✅ No tables found to drop. Database is already empty.\n');
    } else {
      // Step 2: Drop all foreign key constraints
      console.log('\n📝 Step 2: Dropping all foreign key constraints...\n');
      try {
        const allConstraints = await pool.request().query(`
          SELECT CONSTRAINT_NAME, TABLE_NAME 
          FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS
        `);
        
        const dropConstraintQueries = await pool.request().query(`
          SELECT CONSTRAINT_NAME, TABLE_NAME 
          FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
          WHERE REFERENCED_TABLE_NAME IS NOT NULL
        `);

        for (const constraint of dropConstraintQueries.recordset) {
          try {
            await pool.request().query(
              `ALTER TABLE [${constraint.TABLE_NAME}] DROP CONSTRAINT [${constraint.CONSTRAINT_NAME}]`
            );
          } catch (err) {
            // Might already be dropped
          }
        }
        console.log('✅ Foreign key constraints dropped\n');
      } catch (err) {
        console.log('⚠️  Could not drop FK constraints (might already be gone)\n');
      }

      // Step 3: Drop all check constraints
      console.log('📝 Step 3: Dropping all check constraints...\n');
      try {
        const checkConstraints = await pool.request().query(`
          SELECT CONSTRAINT_NAME, TABLE_NAME 
          FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
          WHERE CONSTRAINT_TYPE = 'CHECK'
        `);
        
        for (const constraint of checkConstraints.recordset) {
          try {
            await pool.request().query(
              `ALTER TABLE [${constraint.TABLE_NAME}] DROP CONSTRAINT [${constraint.CONSTRAINT_NAME}]`
            );
          } catch (err) {
            // Might already be dropped
          }
        }
        console.log('✅ Check constraints dropped\n');
      } catch (err) {
        console.log('⚠️  Could not drop check constraints (might already be gone)\n');
      }

      // Step 4: Disable all triggers
      console.log('📝 Step 4: Disabling all triggers...\n');
      try {
        await pool.request().query(`
          EXEC sp_MSForEachTable 'ALTER TABLE ? DISABLE TRIGGER all'
        `);
        console.log('✅ All triggers disabled\n');
      } catch (err) {
        console.log('⚠️  Could not disable triggers\n');
      }

      // Step 5: Drop all tables
      console.log('📝 Step 5: Dropping all tables...\n');
      for (const tableName of tableNames) {
        try {
          await pool.request().query(`DROP TABLE IF EXISTS [${tableName}]`);
          console.log(`  ✅ Dropped: ${tableName}`);
        } catch (err) {
          console.log(`  ⚠️  Could not drop ${tableName}: ${err.message}`);
        }
      }

      // Final verification
      console.log('\n📝 Step 6: Verifying tables are dropped...\n');
      const verifyResult = await pool.request().query(`
        SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = 'dbo' AND TABLE_TYPE = 'BASE TABLE'
      `);
      const remainingTables = verifyResult.recordset[0].count;
      if (remainingTables === 0) {
        console.log('✅ All tables successfully dropped!\n');
      } else {
        console.log(`⚠️  ${remainingTables} tables still remain\n`);
      }
    }

    await pool.close();

    // Step 7: Recreate tables from models
    console.log('📝 Step 7: Recreating tables from Sequelize models...\n');
    await sequelize.authenticate();
    console.log('✅ Sequelize authenticated\n');

    // Sync all models - this will create all tables
    console.log('⏳ Creating tables from models (this may take a moment)...\n');
    await sequelize.sync({ force: false, alter: false });
    console.log('✅ Tables recreated from models\n');

    // Step 8: Verify all tables created
    console.log('📝 Step 8: Verifying tables were recreated...\n');
    pool = new sql.ConnectionPool(config);
    await pool.connect();

    const finalResult = await pool.request().query(`
      SELECT TABLE_NAME, 
             (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
              WHERE TABLE_NAME = t.TABLE_NAME) as ColumnCount
      FROM INFORMATION_SCHEMA.TABLES t
      WHERE TABLE_SCHEMA = 'dbo' AND TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `);

    const recreatedTables = finalResult.recordset;
    console.log(`✅ Recreated ${recreatedTables.length} tables:\n`);
    
    recreatedTables.forEach((table, idx) => {
      console.log(`  ${(idx + 1).toString().padStart(3)}. ${table.TABLE_NAME.padEnd(35)} (${table.ColumnCount} columns)`);
    });

    await pool.close();

    console.log('\n' + '='.repeat(80));
    console.log('✨ DATABASE RESET COMPLETE!');
    console.log('='.repeat(80));
    console.log('\n📊 Summary:');
    console.log(`  ✅ Dropped ${tableNames.length} old tables`);
    console.log(`  ✅ Recreated ${recreatedTables.length} tables from models`);
    console.log(`  ✅ All table schemas are fresh and clean\n`);

    console.log('⚠️  NOTE: All data has been deleted. This is a fresh start!\n');

    process.exit(0);

  } catch (err) {
    console.error('\n❌ ERROR:', err.message);
    console.error(err.stack);
    if (pool) await pool.close();
    process.exit(1);
  }
}

// Run the migration
dropAndRecreateAllTables();
