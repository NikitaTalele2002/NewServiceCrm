import { sequelize } from '../database/connection.js';

async function checkTable() {
  try {
    console.log('🔍 Checking SpareParts table...\n');

    // List all tables
    const tables = await sequelize.query(`
      SELECT TABLE_NAME 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_TYPE = 'BASE TABLE'
      ORDER BY TABLE_NAME
    `);
    
    console.log('📋 All tables in database:');
    tables[0].forEach(t => {
      if (t.TABLE_NAME.toLowerCase().includes('spare') || t.TABLE_NAME.toLowerCase().includes('part')) {
        console.log(`  ✓ ${t.TABLE_NAME}`);
      }
    });

    // Check SpareParts specifically
    const spareParts = await sequelize.query(`
      SELECT COUNT(*) as count FROM [SpareParts]
    `);
    
    console.log('\n📊 SpareParts table row count:', spareParts[0][0].count);

    // Show schema
    const schema = await sequelize.query(`
      SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = 'SpareParts'
      ORDER BY ORDINAL_POSITION
    `);

    console.log('\n📋 SpareParts columns:');
    schema[0].forEach(col => {
      console.log(`  • ${col.COLUMN_NAME} (${col.DATA_TYPE}, ${col.IS_NULLABLE === 'YES' ? 'nullable' : 'NOT NULL'})`);
    });

    // Show sample data
    const sample = await sequelize.query(`
      SELECT TOP 5 * FROM [SpareParts]
    `);

    console.log('\n📦 Sample data (first 5 rows):');
    if (sample[0].length === 0) {
      console.log('  ⚠️  No data found in SpareParts table!');
    } else {
      console.log(`  Found ${sample[0].length} rows`);
      sample[0].forEach((row, i) => {
        console.log(`    Row ${i + 1}: Id=${row.Id}, BRAND=${row.BRAND}, PART=${row.PART}`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

checkTable();
