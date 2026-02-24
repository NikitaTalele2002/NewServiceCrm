/**
 * Migration script to add missing columns to the calls table
 */

import { config } from 'dotenv';
import { Sequelize } from 'sequelize';

config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'NewCRM',
  process.env.DB_USER || 'sa',
  process.env.DB_PASSWORD || 'Harsh@1234',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 1433,
    dialect: 'mssql',
    dialectOptions: {
      authentication: {
        type: 'default',
        options: {
          userName: process.env.DB_USER || 'sa',
          password: process.env.DB_PASSWORD || 'Harsh@1234'
        }
      }
    },
    logging: console.log
  }
);

async function addMissingColumns() {
  try {
    console.log('🔄 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    console.log('📝 Adding missing columns to [calls] table...\n');

    const columns = [
      { name: 'sub_status_id', type: 'INT NULL' },
      { name: 'customer_remark', type: 'NVARCHAR(MAX) NULL' },
      { name: 'cancel_reason', type: 'NVARCHAR(255) NULL' },
      { name: 'cancel_remarks', type: 'NVARCHAR(MAX) NULL' },
      { name: 'cancelled_by_userId', type: 'INT NULL' },
      { name: 'cancelled_at', type: 'DATETIME2 NULL' },
      { name: 'closed_by', type: 'DATETIME2 NULL' },
      { name: 'closed_by_user_id', type: 'INT NULL' },
      { name: 'repair_type', type: "NVARCHAR(100) NULL" },
      { name: 'call_closure_source', type: "NVARCHAR(100) NULL" }
    ];

    let addedCount = 0;
    let skippedCount = 0;

    for (const col of columns) {
      try {
        // Check if column already exists
        const checkColumn = await sequelize.query(`
          SELECT COLUMN_NAME 
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_NAME = 'calls' AND COLUMN_NAME = '${col.name}'
        `, { type: sequelize.QueryTypes.SELECT, raw: true });

        if (checkColumn.length > 0) {
          console.log(`⏭️  Column [${col.name}] already exists, skipping...`);
          skippedCount++;
        } else {
          console.log(`➕ Adding column [${col.name}] (${col.type})...`);
          await sequelize.query(`
            ALTER TABLE [calls] ADD [${col.name}] ${col.type};
          `);
          console.log(`   ✅ Added [${col.name}]\n`);
          addedCount++;
        }
      } catch (err) {
        console.error(`   ❌ Error adding [${col.name}]:`, err.message);
      }
    }

    // Add foreign key constraints for the new columns
    console.log('\n📌 Adding foreign key constraints...\n');

    const fkConstraints = [
      {
        name: 'fk_calls_sub_status',
        column: 'sub_status_id',
        refTable: 'sub_status',
        refColumn: 'sub_status_id'
      },
      {
        name: 'fk_calls_cancelled_by',
        column: 'cancelled_by_userId',
        refTable: 'users',
        refColumn: 'user_id'
      },
      {
        name: 'fk_calls_closed_by',
        column: 'closed_by_user_id',
        refTable: 'users',
        refColumn: 'user_id'
      }
    ];

    for (const fk of fkConstraints) {
      try {
        const checkFk = await sequelize.query(`
          SELECT CONSTRAINT_NAME 
          FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
          WHERE TABLE_NAME = 'calls' AND COLUMN_NAME = '${fk.column}' AND REFERENCED_TABLE_NAME IS NOT NULL
        `, { type: sequelize.QueryTypes.SELECT, raw: true });

        if (checkFk.length > 0) {
          console.log(`✓ Foreign key for [${fk.column}] already exists`);
        } else {
          console.log(`➕ Adding FK constraint [${fk.name}]...`);
          await sequelize.query(`
            ALTER TABLE [calls] 
            ADD CONSTRAINT [${fk.name}] 
            FOREIGN KEY ([${fk.column}]) 
            REFERENCES [${fk.refTable}]([${fk.refColumn}])
            ON DELETE SET NULL
            ON UPDATE CASCADE;
          `);
          console.log(`   ✅ Added [${fk.name}]\n`);
        }
      } catch (err) {
        console.warn(`   ⚠️  Could not add FK [${fk.name}]:`, err.message);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ MIGRATION COMPLETE');
    console.log('='.repeat(60));
    console.log(`Columns Added: ${addedCount}`);
    console.log(`Columns Skipped: ${skippedCount}`);
    console.log(`Total: ${addedCount + skippedCount}/${columns.length}`);

    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

addMissingColumns();
