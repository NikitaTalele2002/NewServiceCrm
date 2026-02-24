import { sequelize } from './models/index.js';
import fs from 'fs';
import path from 'path';

async function applyMissingColumns() {
  try {
    // Get the latest fix_schema SQL file
    const schemaDir = '.';
    const files = fs.readdirSync(schemaDir)
      .filter(f => f.startsWith('fix_schema_') && f.endsWith('.sql'))
      .sort((a, b) => b.localeCompare(a));

    if (files.length === 0) {
      console.log('❌ No fix_schema_*.sql files found');
      return;
    }

    const sqlFile = files[0];
    console.log(`📄 Reading SQL file: ${sqlFile}\n`);

    const sqlContent = fs.readFileSync(sqlFile, 'utf-8');
    
    // Parse SQL statements (split by semicolon)
    const statements = sqlContent
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    console.log(`🔄 Found ${statements.length} SQL statements\n`);
    
    await sequelize.authenticate();
    console.log('✅ Database authenticated\n');

    let successCount = 0;
    let failCount = 0;

    for (const stmt of statements) {
      try {
        await sequelize.query(stmt);
        successCount++;
        console.log(`✅ ${stmt.substring(0, 70)}`);
      } catch (err) {
        failCount++;
        console.log(`❌ ${stmt.substring(0, 70)}`);
        console.log(`   Error: ${err.message.substring(0, 80)}\n`);
      }
    }

    console.log(`\n═════════════════════════════════════════════════════`);
    console.log(`✅ Applied ${successCount} SQL statements`);
    if (failCount > 0) {
      console.log(`⚠️  Failed: ${failCount} statements`);
    }
    console.log(`═════════════════════════════════════════════════════\n`);

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await sequelize.close();
  }
}

applyMissingColumns();
