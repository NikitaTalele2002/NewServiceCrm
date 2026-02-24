import { sequelize } from './db.js';
import fs from 'fs';
import path from 'path';

async function runMigration() {
  try {
    console.log('Starting C&F Approval Date migration...');
    
    // Read the migration SQL file
    const migrationPath = path.join(process.cwd(), 'migrations', 'add_cf_approval_date_to_spare_requests.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    await sequelize.query(migrationSql);
    
    console.log('✓ C&F Approval Date migration completed successfully!');
    console.log('✓ CfApprovalDate and CfRejectionDate columns have been added to SpareRequests table');
    process.exit(0);
  } catch (error) {
    console.error('✗ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
