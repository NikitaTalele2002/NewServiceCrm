/**
 * Script to compare database table columns with Sequelize model definitions
 * Identifies missing columns and syncs them
 */

import { config } from 'dotenv';
import { Sequelize, DataTypes } from 'sequelize';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import path from 'path';

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

// Import models
const modelsPath = join(__dirname, 'models');
const modelFiles = fs.readdirSync(modelsPath).filter(file => file.endsWith('.js'));

const models = {};
for (const file of modelFiles) {
  try {
    const modelModule = await import(`file://${join(modelsPath, file)}`);
    const modelFn = modelModule.default;
    if (typeof modelFn === 'function') {
      const model = modelFn(sequelize);
      models[model.name] = model;
    }
  } catch (err) {
    console.warn(`⚠️  Could not load model from ${file}:`, err.message);
  }
}

async function checkColumnMismatches() {
  try {
    console.log('🔄 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connected\n');

    const mismatchReport = [];
    const missingColumns = [];

    // Check each model
    for (const [modelName, model] of Object.entries(models)) {
      const tableName = model.tableName || modelName.toLowerCase();
      
      try {
        // Get columns from database
        const dbColumns = await sequelize.query(`
          SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_NAME = '${tableName}'
          ORDER BY ORDINAL_POSITION
        `, { type: sequelize.QueryTypes.SELECT, raw: true });

        if (dbColumns.length === 0) {
          console.log(`⚠️  Table not found: ${tableName}`);
          continue;
        }

        // Get columns from model
        const modelAttributes = model.rawAttributes;
        const modelColumnNames = new Set(Object.keys(modelAttributes));

        // Get database column names
        const dbColumnNames = new Set(dbColumns.map(col => col.COLUMN_NAME));

        // Find mismatches
        const missingInDb = [];
        const missingInModel = [];

        for (const attr of modelColumnNames) {
          const field = modelAttributes[attr].field || attr;
          if (!dbColumnNames.has(field)) {
            missingInDb.push({
              column: field,
              attribute: attr,
              type: modelAttributes[attr].type.key || 'UNKNOWN',
              allowNull: modelAttributes[attr].allowNull !== false
            });
          }
        }

        for (const dbCol of dbColumnNames) {
          const found = Array.from(modelColumnNames).some(attr => {
            const field = modelAttributes[attr].field || attr;
            return field === dbCol;
          });
          if (!found) {
            missingInModel.push(dbCol);
          }
        }

        if (missingInDb.length > 0 || missingInModel.length > 0) {
          mismatchReport.push({
            table: tableName,
            model: modelName,
            missingInDb,
            missingInModel
          });
          
          if (missingInDb.length > 0) {
            missingColumns.push({
              table: tableName,
              columns: missingInDb
            });
          }
        }

        // Print detailed report
        console.log(`📋 Table: ${tableName} (Model: ${modelName})`);
        console.log(`   Database columns: ${dbColumns.length}`);
        console.log(`   Model attributes: ${modelColumnNames.size}`);

        if (missingInDb.length > 0) {
          console.log(`   ❌ Missing in database: ${missingInDb.length} columns`);
          missingInDb.forEach(col => {
            console.log(`      - ${col.column} (${col.type}, nullable: ${col.allowNull})`);
          });
        }

        if (missingInModel.length > 0) {
          console.log(`   ⚠️  Missing in model: ${missingInModel.length} columns`);
          missingInModel.forEach(col => {
            console.log(`      - ${col}`);
          });
        }

        if (missingInDb.length === 0 && missingInModel.length === 0) {
          console.log(`   ✅ All columns match`);
        }
        console.log();

      } catch (err) {
        console.log(`❌ Error checking ${tableName}:`, err.message);
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total tables checked: ${Object.keys(models).length}`);
    console.log(`Tables with mismatches: ${mismatchReport.length}`);
    
    if (missingColumns.length > 0) {
      console.log(`\n⚠️  MISSING COLUMNS TO ADD TO DATABASE: ${missingColumns.length} tables`);
      
      // Generate SQL ALTER statements
      console.log('\n📝 SQL Statements to add missing columns:\n');
      
      for (const item of missingColumns) {
        console.log(`-- Table: ${item.table}`);
        for (const col of item.columns) {
          const nullable = col.allowNull ? 'NULL' : 'NOT NULL';
          let sqlType = 'NVARCHAR(255)'; // default
          
          // Map Sequelize types to SQL Server types
          const typeMap = {
            'STRING': 'NVARCHAR(255)',
            'TEXT': 'NVARCHAR(MAX)',
            'INTEGER': 'INT',
            'BIGINT': 'BIGINT',
            'BOOLEAN': 'BIT',
            'DATE': 'DATE',
            'DATEONLY': 'DATE',
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
      console.log('\n✅ All database columns are defined in models!');
    }

    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

checkColumnMismatches();
