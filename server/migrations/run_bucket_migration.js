/**
 * Bucket System Migration Runner
 * Executes the bucket system migration
 */

import { up, down } from './20260223_add_bucket_system.js';

async function runMigration() {
  try {
    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════╗');
    console.log('║        SQL SERVER BUCKET SYSTEM MIGRATION            ║');
    console.log('╚══════════════════════════════════════════════════════╝');
    console.log('\n');
    
    await up();
    
    console.log('╔══════════════════════════════════════════════════════╗');
    console.log('║           ✅ MIGRATION SUCCESSFUL                     ║');
    console.log('╚══════════════════════════════════════════════════════╝');
    console.log('\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n');
    console.error('╔══════════════════════════════════════════════════════╗');
    console.error('║           ❌ MIGRATION FAILED                        ║');
    console.error('╚══════════════════════════════════════════════════════╝');
    console.error('\nError:', error.message);
    console.error('\n');
    
    process.exit(1);
  }
}

runMigration();
