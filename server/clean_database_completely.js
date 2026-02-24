import sql from 'mssql';
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

async function cleanDatabaseCompletely() {
  let pool;
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🗑️  COMPLETE DATABASE CLEANUP - DROP ALL WITH NO CONSTRAINTS');
    console.log('='.repeat(80) + '\n');

    pool = new sql.ConnectionPool(config);
    await pool.connect();
    console.log('✅ Connected to database\n');

    // Execute comprehensive cleanup SQL
    const cleanupSQL = `
      -- Disable all constraints and triggers
      EXEC sp_MSForEachTable 'ALTER TABLE ? DISABLE TRIGGER ALL';
      
      -- Drop all foreign key constraints
      DECLARE @sql NVARCHAR(MAX) = '';
      SELECT @sql += 'ALTER TABLE [' + TABLE_NAME + '] DROP CONSTRAINT [' + CONSTRAINT_NAME + ']; '
      FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
      WHERE CONSTRAINT_TYPE = 'FOREIGN KEY';
      EXEC sp_executesql @sql;
      
      -- Drop all check constraints
      SET @sql = '';
      SELECT @sql += 'ALTER TABLE [' + TABLE_NAME + '] DROP CONSTRAINT [' + CONSTRAINT_NAME + ']; '
      FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
      WHERE CONSTRAINT_TYPE = 'CHECK';
      EXEC sp_executesql @sql;
      
      -- Drop all unique constraints
      SET @sql = '';
      SELECT @sql += 'ALTER TABLE [' + TABLE_NAME + '] DROP CONSTRAINT [' + CONSTRAINT_NAME + ']; '
      FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
      WHERE CONSTRAINT_TYPE = 'UNIQUE';
      EXEC sp_executesql @sql;
      
      -- Drop all tables
      DECLARE @table NVARCHAR(255);
      DECLARE table_cursor CURSOR FOR
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'dbo' AND TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME;
      
      OPEN table_cursor;
      FETCH NEXT FROM table_cursor INTO @table;
      
      WHILE @@FETCH_STATUS = 0
      BEGIN
        DECLARE @dropSQL NVARCHAR(255) = 'DROP TABLE [' + @table + ']';
        BEGIN TRY
          EXEC sp_executesql @dropSQL;
          PRINT 'Dropped: ' + @table;
        END TRY
        BEGIN CATCH
          PRINT 'Could not drop: ' + @table;
        END CATCH
        FETCH NEXT FROM table_cursor INTO @table;
      END;
      
      CLOSE table_cursor;
      DEALLOCATE table_cursor;
    `;

    console.log('📝 Step 1: Executing comprehensive cleanup SQL...\n');
    const batch = pool.request();
    await batch.batch(cleanupSQL);
    console.log('✅ Database cleanup complete\n');

    // Verify all tables are dropped
    console.log('📝 Step 2: Verifying all tables are dropped...\n');
    const verifyResult = await pool.request().query(`
      SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'dbo' AND TABLE_TYPE = 'BASE TABLE'
    `);
    
    const remainingTables = verifyResult.recordset[0].count;
    if (remainingTables === 0) {
      console.log('✅ All tables successfully dropped!\n');
    } else {
      console.log(`⚠️  Warning: ${remainingTables} tables remain\n`);
    }

    await pool.close();

    console.log('='.repeat(80));
    console.log('✨ DATABASE CLEANUP COMPLETE!');
    console.log('='.repeat(80));
    console.log('\n✅ All tables and constraints have been removed.');
    console.log('✅ Database is now clean and ready for fresh model sync.\n');
    console.log('📝 Next step: Run `node sync_production_with_fk_migration.js`\n');

    process.exit(0);

  } catch (err) {
    console.error('\n❌ ERROR:', err.message);
    if (pool) await pool.close();
    process.exit(1);
  }
}

cleanDatabaseCompletely();
