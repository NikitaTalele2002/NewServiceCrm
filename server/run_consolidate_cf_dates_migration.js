import { sequelize } from './db.js';
import fs from 'fs';
import path from 'path';

async function runMigration() {
  try {
    console.log('Starting consolidate C&F dates migration...');
    
    // Read the migration SQL file
    const migrationPath = path.join(process.cwd(), 'migrations', 'consolidate_cf_dates_to_single_column.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    await sequelize.query(migrationSql);
    
    console.log('✓ Consolidate C&F dates migration completed successfully!');
    console.log('✓ CfRejectionDate column has been dropped');
    console.log('✓ Now using only CfApprovalDate column for both approvals and rejections');
    process.exit(0);
  } catch (error) {
    console.error('✗ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
