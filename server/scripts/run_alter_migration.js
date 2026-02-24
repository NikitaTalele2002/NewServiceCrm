import fs from 'fs';
import path from 'path';

async function runMigration() {
  try {
    const { default: sequelize } = await import('../database/connection.js');
    const migrationPath = path.join(process.cwd(), 'migrations/alter_technician_status_requests.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    await sequelize.query(sql);
    console.log('Migration executed successfully');
  } catch (error) {
    console.error('Error running migration:', error);
  } finally {
    process.exit(0);
  }
}

runMigration();