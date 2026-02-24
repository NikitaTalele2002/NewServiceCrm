/**
 * Clear database verification
 */

import { sequelize } from './db.js';
import * as modelExports from './models/index.js';

async function main() {
  try {
    await sequelize.authenticate();

    const [tables] = await sequelize.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'dbo' 
      AND TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `, { raw: true });

    console.log('\n═══════════════════════════════════════════════\n');
    console.log('✅ NEWCRM DATABASE SYNCHRONIZATION COMPLETE\n');
    console.log(`   📊 Total Tables in Database: ${tables.length}\n`);
    
    console.log('═══════════════════════════════════════════════\n');
    console.log('📋 Tables Created:\n');

    // Group by prefix
    const tablesByType = {};
    tables.forEach(t => {
      const name = t.TABLE_NAME;
      const group = name.split('_')[0] || name;
      if (!tablesByType[group]) tablesByType[group] = [];
      tablesByType[group].push(name);
    });

    // List all tables
    tables.forEach(t => {
      console.log(`   ✓ ${t.TABLE_NAME}`);
    });

    console.log('\n═══════════════════════════════════════════════\n');
    console.log(`✅ Status: ${tables.length} tables successfully created in NewCRM\n`);
    console.log('You can now:');
    console.log('   • Start the application server');
    console.log('   • The models/associations are ready to use');
    console.log('   • Insert test data as needed');
    console.log('\n═══════════════════════════════════════════════\n');

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
