import { sequelize } from '../database/connection.js';
import fs from 'fs';
import path from 'path';

async function runMigration() {
  try {
    console.log('🔄 Running migration: add_description_to_spare_parts.sql');
    
    const migrationPath = path.join(process.cwd(), 'server/migrations/add_description_to_spare_parts.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');
    
    await sequelize.query(sql);
    
    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
