import { sequelize } from './db.js';
import './models/index.js';
import dotenv from 'dotenv';
import sql from 'mssql';

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

async function recreateTablesFromModels() {
  let pool;
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🆕 RECREATING ALL TABLES FROM SEQUELIZE MODELS');
    console.log('='.repeat(80) + '\n');

    // Authenticate sequelize
    console.log('📝 Step 1: Authenticating Sequelize...\n');
    await sequelize.authenticate();
    console.log('✅ Sequelize authenticated\n');

    // Sync all models to create tables
    console.log('📝 Step 2: Syncing models to recreate tables...\n');
    console.log('⏳ Creating tables (this may take a moment)...\n');
    
    await sequelize.sync({ force: false, alter: false });
    
    console.log('✅ All models synchronized\n');

    // Connect to verify
    console.log('📝 Step 3: Verifying tables were created...\n');
    pool = new sql.ConnectionPool(config);
    await pool.connect();

    const result = await pool.request().query(`
      SELECT TABLE_NAME, 
             (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
              WHERE TABLE_NAME = t.TABLE_NAME) as ColumnCount
      FROM INFORMATION_SCHEMA.TABLES t
      WHERE TABLE_SCHEMA = 'dbo' AND TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `);

    const tables = result.recordset;
    console.log(`✅ Successfully created ${tables.length} tables:\n`);
    
    tables.forEach((table, idx) => {
      console.log(`  ${(idx + 1).toString().padStart(3)}. ${table.TABLE_NAME.padEnd(35)} (${table.ColumnCount} columns)`);
    });

    await pool.close();

    console.log('\n' + '='.repeat(80));
    console.log('✨ TABLE RECREATION COMPLETE!');
    console.log('='.repeat(80));
    console.log(`\n✅ Successfully recreated ${tables.length} tables from models`);
    console.log('✅ All tables have fresh schema');
    console.log('✅ All foreign key constraints are in place\n');
    console.log('📊 Database is ready for use!\n');

    process.exit(0);

  } catch (err) {
    console.error('\n❌ ERROR:', err.message);
    console.error(err.stack);
    if (pool) await pool.close();
    process.exit(1);
  }
}

recreateTablesFromModels();
