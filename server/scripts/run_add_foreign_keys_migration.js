import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { sequelize } from '../models/index.js';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const run = async () => {
  try {
    console.log('🔌 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Connected to MSSQL\n');

    // Read the migration file - resolve from scripts directory to migrations
    const migrationPath = path.resolve(__dirname, '..', 'migrations', 'add_foreign_keys.sql');
    console.log(`📄 Reading migration file: ${migrationPath}\n`);
    let sqlScript = fs.readFileSync(migrationPath, 'utf-8');

    // Split by GO statements (case insensitive, with or without spaces)
    const batches = sqlScript.split(/^\s*GO\s*$/gim).filter(batch => {
      const trimmed = batch.trim();
      return trimmed.length > 0;
    });

    console.log(`⏳ Executing ${batches.length} SQL batches...\n`);

    let successCount = 0;
    let warningCount = 0;
    let errorCount = 0;
    const errorLog = [];

    for (let i = 0; i < batches.length; i++) {
      let batch = batches[i].trim();
      if (!batch) continue;

      let sqlToExecute = ''; // Declare before try block
      try {
        // Clean the batch: remove trailing semicolons and GO statements
        // Clean the batch: remove trailing semicolons and GO statements
        let cleanedLines = batch
          .split('\n')
          .map(line => {
            // Remove GO statements and trailing semicolons
            if (line.toUpperCase().trim() === 'GO') {
              return '';
            }
            return line;
          })
          .filter(line => line !== '') // Remove empty lines created by removing GO
          .join('\n')
          .trim();
        
        // Remove trailing semicolon if present
        sqlToExecute = cleanedLines.replace(/;\s*$/, '').trim();
        
        // Remove leading comment-only lines
        const lines = sqlToExecute.split('\n');
        let firstNonCommentIdx = 0;
        for (let j = 0; j < lines.length; j++) {
          const trimmedLine = lines[j].trim();
          if (trimmedLine && !trimmedLine.startsWith('--')) {
            firstNonCommentIdx = j;
            break;
          }
        }
        sqlToExecute = lines.slice(firstNonCommentIdx).join('\n').trim();
        
        // Skip if empty or only comments
        if (!sqlToExecute || sqlToExecute.split('\n').every(l => !l.trim() || l.trim().startsWith('--'))) {
          continue;
        }
        
        await sequelize.query(sqlToExecute, { raw: true });
        successCount++;
        
        // Extract a description from the batch (first comment line)
        // Extract a description from the batch (first ALTER TABLE line)
        const matchAlter = sqlToExecute.match(/ALTER\s+TABLE\s+\[?(\w+)\]?/i);
        const description = matchAlter ? `FK on ${matchAlter[1]}` : `Batch ${i + 1}`;
        console.log(`✅ ${description}`);
      } catch (err) {
        // Extract error details from Sequelize/MSSQL error
        let errorMsg = '';
        if (err.original) {
          if (typeof err.original === 'object') {
            errorMsg = err.original.message || err.original.toString() || JSON.stringify(err.original);
          } else {
            errorMsg = String(err.original);
          }
        } else if (err.message) {
          errorMsg = err.message;
        } else {
          errorMsg = String(err);
        }

        // Try to get MSSQL-specific details
        let mssqlError = '';
        if (err.original?.errors) {
          mssqlError = err.original.errors.map(e => e.message).join(' | ');
        } else if (err.original?.message) {
          mssqlError = err.original.message;
        }

        // If constraint already exists, count as warning
        if (mssqlError && (mssqlError.includes('already exists') || mssqlError.includes('already an object'))) {
          warningCount++;
          console.log(`⚠️  Constraint already exists (batch ${i + 1})`);
        } else {
          errorCount++;
          const shortMsg = errorMsg.split('\n')[0].substring(0, 150);
          console.error(`❌ Error in batch ${i + 1}: ${shortMsg}`);
        }

        // Log details
        errorLog.push({
          batch: i + 1,
          isAlreadyExists: mssqlError && (mssqlError.includes('already exists') || mssqlError.includes('already an object')),
          errorMsg,
          mssqlError,
          sqlBatch: sqlToExecute.substring(0, 300),
          fullError: JSON.stringify(err, Object.getOwnPropertyNames(err)).substring(0, 1000)
        });
      }
    }

    console.log(`\n📊 Results:`);
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ⚠️  Warnings: ${warningCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
    
    if (errorLog.length > 0) {
      const logPath = path.resolve(__dirname, 'fk_migration_errors.log');
      fs.writeFileSync(logPath, JSON.stringify(errorLog, null, 2));
      console.log(`\n📄 Error details: fk_migration_errors.log`);
    }
    
    console.log(`\n✅ Migration completed!`);
    process.exit(errorCount > 0 ? 1 : 0);
  } catch (err) {
    console.error('❌ Fatal error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
};

run();
