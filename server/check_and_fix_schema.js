import { sequelize } from './db.js';
import sql from 'mssql';
import './models/index.js';

const config = {
  user: 'crm_user',
  password: 'StrongPassword123!',
  database: 'NewCRM',
  server: 'localhost',
  instanceName: 'SQLEXPRESS',
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
};

// Note: Table names will be obtained from model.tableName property

async function getDataTypeSQL(attrDef) {
  let typeStr = '';
  
  if (!attrDef.type) {
    return 'NVARCHAR(MAX)';
  }

  const type = attrDef.type.constructor.name;
  
  switch (type) {
    case 'STRING':
    case 'CHAR':
      const len = attrDef.type.options?.length || 255;
      typeStr = `VARCHAR(${len})`;
      break;
    case 'TEXT':
      typeStr = 'NVARCHAR(MAX)';
      break;
    case 'INTEGER':
      typeStr = 'INT';
      break;
    case 'BIGINT':
      typeStr = 'BIGINT';
      break;
    case 'FLOAT':
      typeStr = 'FLOAT';
      break;
    case 'DECIMAL':
      const precision = attrDef.type.options?.precision || 10;
      const scale = attrDef.type.options?.scale || 2;
      typeStr = `DECIMAL(${precision},${scale})`;
      break;
    case 'DATE':
      typeStr = 'DATE';
      break;
    case 'DATETIME':
    case 'DATE_ONLY':
      typeStr = 'DATETIME2';
      break;
    case 'BOOLEAN':
      typeStr = 'BIT';
      break;
    case 'ENUM':
      typeStr = `VARCHAR(50)`;
      break;
    case 'JSON':
      typeStr = 'NVARCHAR(MAX)';
      break;
    default:
      typeStr = 'NVARCHAR(MAX)';
  }
  
  return typeStr;
}

async function checkAndFixSchema() {
  let pool;
  try {
    console.log('\n🔄 CHECKING AND COMPARING DATABASE SCHEMA WITH MODELS\n');
    console.log('='.repeat(80) + '\n');
    
    pool = new sql.ConnectionPool(config);
    await pool.connect();
    console.log('✅ Connected to database\n');
    
    // Authenticate sequelize
    await sequelize.authenticate();
    console.log('✅ Sequelize authenticated\n');
    
    // Get all models
    const models = sequelize.models;
    console.log(`📊 Found ${Object.keys(models).length} models\n`);
    
    if (Object.keys(models).length === 0) {
      console.log('❌ No models found. Make sure models are properly imported in db.js');
      process.exit(1);
    }
    
    const mismatches = [];
    const missingColumnsByTable = {};
    let totalMissing = 0;
    let processedTables = 0;
    
    // Check each model
    for (const [modelName, model] of Object.entries(models)) {
      const tableName = model.getTableName ? model.getTableName() : (model.tableName || modelName.toLowerCase());
      
      try {
        // Get actual columns from database
        const dbResult = await pool.request().query(`
          SELECT 
            COLUMN_NAME,
            DATA_TYPE,
            IS_NULLABLE,
            CHARACTER_MAXIMUM_LENGTH,
            NUMERIC_PRECISION,
            NUMERIC_SCALE
          FROM INFORMATION_SCHEMA.COLUMNS 
          WHERE TABLE_NAME = '${tableName}'
          ORDER BY ORDINAL_POSITION
        `);
        
        const dbColumns = dbResult.recordset;
        
        if (dbColumns.length === 0) {
          console.log(`⚠️  Table not found in database: [${tableName}] (Model: ${modelName})`);
          continue;
        }
        
        processedTables++;
        const dbColumnMap = {};
        dbColumns.forEach(col => {
          dbColumnMap[col.COLUMN_NAME.toLowerCase()] = col;
        });
        
        // Get model attributes
        const modelAttributes = model.rawAttributes || {};
        const missingInDb = [];
        
        for (const [attrName, attrDef] of Object.entries(modelAttributes)) {
          // Some attributes are virtual/not database fields
          if (attrDef.type === undefined && attrDef.virtual !== false) {
            continue;
          }
          
          const dbFieldName = attrDef.field || attrName;
          
          if (!dbColumnMap[dbFieldName.toLowerCase()]) {
            const dataTypeSQL = await getDataTypeSQL(attrDef);
            const nullable = attrDef.allowNull !== false ? 'NULL' : 'NOT NULL';
            
            missingInDb.push({
              attribute: attrName,
              field: dbFieldName,
              type: dataTypeSQL,
              nullable: nullable,
              fullSQL: `ALTER TABLE [${tableName}] ADD [${dbFieldName}] ${dataTypeSQL} ${nullable};`
            });
            
            totalMissing++;
          }
        }
        
        if (missingInDb.length > 0) {
          console.log(`⚠️  ${modelName.padEnd(30)} (table: [${tableName}])`);
          console.log(`   📋 Database columns: ${dbColumns.length} | Model attributes: ${Object.keys(modelAttributes).length}`);
          console.log(`   ❌ Missing ${missingInDb.length} column(s):\n`);
          
          missingInDb.forEach(col => {
            console.log(`      - ${col.field} (${col.type})`);
          });
          console.log();
          
          mismatches.push({
            model: modelName,
            table: tableName,
            dbColumnCount: dbColumns.length,
            modelAttributes: Object.keys(modelAttributes).length,
            missingColumns: missingInDb
          });
          
          missingColumnsByTable[tableName] = missingInDb;
        } else {
          console.log(`✅ ${modelName.padEnd(30)} (table: [${tableName}] - ${dbColumns.length} columns)`);
        }
        
      } catch (err) {
        console.log(`❌ Error checking ${modelName}:`, err.message);
      }
    }
    
    console.log('\n' + '='.repeat(80));
    console.log(`\n📊 SUMMARY:\n`);
    console.log(`   Total tables processed: ${processedTables}`);
    console.log(`   Tables with mismatches: ${mismatches.length}`);
    console.log(`   Total missing columns: ${totalMissing}`);
    
    if (totalMissing === 0) {
      console.log('\n✅ All tables are in sync with models!\n');
    } else {
      console.log(`\n⚠️  Found ${totalMissing} missing columns across ${mismatches.length} tables\n`);
      
      // Generate SQL fix script
      console.log('📝 SQL STATEMENTS TO ADD MISSING COLUMNS:\n');
      console.log('='.repeat(80) + '\n');
      
      let allSQL = [];
      mismatches.forEach(mismatch => {
        console.log(`-- Table: [${mismatch.table}] (Model: ${mismatch.model})`);
        console.log(`-- Missing columns: ${mismatch.missingColumns.length}\n`);
        
        mismatch.missingColumns.forEach(col => {
          console.log(col.fullSQL);
          allSQL.push(col.fullSQL);
        });
        console.log();
      });
      
      console.log('='.repeat(80) + '\n');
      
      // Ask if user wants to execute
      console.log('💾 To apply these changes, run the following in SQL Server:\n');
      
      // Save to file
      const fs = await import('fs');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
      const fileName = `fix_schema_${timestamp}.sql`;
      
      let sqlContent = '-- Auto-generated script to fix missing columns\n';
      sqlContent += `-- Generated: ${new Date().toISOString()}\n`;
      sqlContent += `-- Database: NewCRM\n\n`;
      
      mismatches.forEach(mismatch => {
        sqlContent += `-- Table: [${mismatch.table}] (Model: ${mismatch.model})\n`;
        sqlContent += `-- Missing columns: ${mismatch.missingColumns.length}\n\n`;
        
        mismatch.missingColumns.forEach(col => {
          sqlContent += col.fullSQL + '\n';
        });
        
        sqlContent += '\n';
      });
      
      fs.writeFileSync(`c:\\Crm_dashboard\\server\\${fileName}`, sqlContent);
      console.log(`✅ SQL script saved to: ${fileName}`);
      console.log(`\n📄 You can also run:\n   node server/execute_sql_file.js ${fileName}\n`);
    }
    
    await pool.close();
    process.exit(0);
    
  } catch (err) {
    console.error('\n❌ Error:', err.message);
    console.error(err.stack);
    if (pool) await pool.close();
    process.exit(1);
  }
}

// Run the check
checkAndFixSchema();
