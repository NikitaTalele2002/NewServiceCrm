/**
 * Script to compare database table columns with Sequelize model definitions
 * Focuses on critical tables: Calls, Status, SubStatus, Customer, Services, etc.
 */

import { config } from 'dotenv';
import { Sequelize, DataTypes } from 'sequelize';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Sequelize
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
    logging: false
  }
);

// Manually import critical models
import CallsModule from './models/Calls.js';
import StatusModule from './models/Status.js';
import SubStatusModule from './models/SubStatus.js';
import CustomerModule from './models/Customer.js';

const models = {
  'Calls': CallsModule(sequelize),
  'Status': StatusModule(sequelize),
  'SubStatus': SubStatusModule(sequelize),
  'Customer': CustomerModule(sequelize)
};

async function checkColumnMismatches() {
  try {
    console.log('🔄 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    const mismatchReport = [];
    const missingColumns = [];
    let totalTables = 0;
    let matchedTables = 0;

    // Check each model
    for (const [modelName, model] of Object.entries(models)) {
      const tableName = model.tableName || modelName.toLowerCase();
      totalTables++;
      
      try {
        // Get columns from database
        const dbColumns = await sequelize.query(`
          SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, CHARACTER_MAXIMUM_LENGTH
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_NAME = N'${tableName}'
          ORDER BY ORDINAL_POSITION
        `, { type: sequelize.QueryTypes.SELECT, raw: true });

        if (dbColumns.length === 0) {
          console.log(`⚠️  Table not found in database: ${tableName}`);
          continue;
        }

        console.log(`\n📋 Table: [${tableName}] (Model: ${modelName})`);
        console.log(`   DB Columns: ${dbColumns.length} | Model Attributes: ${Object.keys(model.rawAttributes).length}`);

        // Get columns from model
        const modelAttributes = model.rawAttributes;
        const modelColumnNames = new Set();
        for (const attr of Object.keys(modelAttributes)) {
          const field = modelAttributes[attr].field || attr;
          modelColumnNames.add(field);
        }

        // Get database column names
        const dbColumnNames = new Set(dbColumns.map(col => col.COLUMN_NAME));

        // Find mismatches
        const missingInDb = [];
        const missingInModel = [];

        // Check what's in model but not in DB
        for (const attr of Object.keys(modelAttributes)) {
          const field = modelAttributes[attr].field || attr;
          if (!dbColumnNames.has(field)) {
            const attrDef = modelAttributes[attr];
            missingInDb.push({
              column: field,
              attribute: attr,
              type: attrDef.type?.key || attrDef.type?.constructor?.name || typeof attrDef.type,
              allowNull: attrDef.allowNull !== false,
              length: attrDef.type?.options?.length
            });
          }
        }

        // Check what's in DB but not in model
        for (const dbCol of dbColumns) {
          const found = Array.from(modelColumnNames).includes(dbCol.COLUMN_NAME);
          if (!found) {
            missingInModel.push({
              column: dbCol.COLUMN_NAME,
              type: dbCol.DATA_TYPE,
              nullable: dbCol.IS_NULLABLE === 'YES'
            });
          }
        }

        if (missingInDb.length > 0) {
          console.log(`   ❌ Missing in database: ${missingInDb.length} column(s)`);
          missingInDb.forEach(col => {
            console.log(`      - [${col.column}] ${col.type}${col.length ? `(${col.length})` : ''} ${col.allowNull ? 'NULL' : 'NOT NULL'}`);
          });
          
          missingColumns.push({
            table: tableName,
            columns: missingInDb
          });
        } else {
          console.log(`   ✅ All model columns exist in DB`);
        }

        if (missingInModel.length > 0) {
          console.log(`   ⚠️  Extra in database: ${missingInModel.length} column(s)`);
          missingInModel.forEach(col => {
            console.log(`      - [${col.column}] ${col.type} ${col.nullable ? 'NULL' : 'NOT NULL'}`);
          });
        } else {
          console.log(`   ✅ No extra columns in DB`);
        }

        if (missingInDb.length === 0 && missingInModel.length === 0) {
          matchedTables++;
        } else {
          mismatchReport.push({
            table: tableName,
            model: modelName,
            missingInDb,
            missingInModel
          });
        }

      } catch (err) {
        console.log(`\n❌ Error checking ${tableName}:`, err.message);
      }
    }

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 SUMMARY');
    console.log('='.repeat(70));
    console.log(`Total critical tables checked: ${totalTables}`);
    console.log(`Tables with matching schema: ${matchedTables}/${totalTables}`);
    console.log(`Tables with mismatches: ${mismatchReport.length}`);
    
    if (missingColumns.length > 0) {
      console.log(`\n⚠️  MISSING COLUMNS TO ADD: ${missingColumns.length} table(s)`);
      
      // Generate SQL ALTER statements
      console.log('\n📝 SQL Statements to add missing columns:\n');
      
      for (const item of missingColumns) {
        console.log(`-- Table: ${item.table}`);
        for (const col of item.columns) {
          const nullable = col.allowNull ? 'NULL' : 'NOT NULL';
          let sqlType = 'NVARCHAR(255)';
          
          // Map Sequelize types to SQL Server types
          const typeMap = {
            'STRING': col.length ? `NVARCHAR(${col.length})` : 'NVARCHAR(255)',
            'TEXT': 'NVARCHAR(MAX)',
            'INTEGER': 'INT',
            'BIGINT': 'BIGINT',
            'BOOLEAN': 'BIT',
            'DATE': 'DATE',
            'DATEONLY': 'DATE',
            'DATETIME': 'DATETIME2',
            'ENUM': 'NVARCHAR(100)',
            'DECIMAL': 'DECIMAL(18,2)',
            'FLOAT': 'FLOAT',
            'JSON': 'NVARCHAR(MAX)'
          };
          
          sqlType = typeMap[col.type] || 'NVARCHAR(255)';
          console.log(`ALTER TABLE [${item.table}] ADD [${col.column}] ${sqlType} ${nullable};`);
        }
        console.log();
      }
    } else {
      console.log('\n✅ All model columns are defined in the database!');
    }

    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

checkColumnMismatches();
