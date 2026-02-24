import sequelize from './database/connection.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration(migrationFile) {
  try {
    console.log(`Starting database migration: ${migrationFile}...`);
    
    const migrationPath = path.join(__dirname, 'migrations', migrationFile);
    
    if (!fs.existsSync(migrationPath)) {
      console.error(`Migration file not found: ${migrationPath}`);
      process.exit(1);
    }
    
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    
    // Split by GO statements for SQL Server
    const statements = migrationSql.split(/\nGO\n/i).filter(s => s.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`Executing: ${statement.substring(0, 100)}...`);
        await sequelize.query(statement);
      }
    }
    
    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

const migrationFile = process.argv[2] || 'add_cn_count_to_spare_requests.sql';
runMigration(migrationFile);
