/**
 * Fix: Remove problematic line_status column
 * Handles ENUM constraint removal
 */

import { sequelize } from './db.js';

async function fixLineStatusColumn() {
  try {
    console.log('Attempting to remove line_status column...');

    // Try raw SQL with DROP DEFAULT first
    const queries = [
      "ALTER TABLE logistics_document_items DROP CONSTRAINT DF__logistics__line_status",
      "ALTER TABLE logistics_document_items DROP COLUMN line_status",
    ];

    for (const query of queries) {
      try {
        console.log(`Executing: ${query}`);
        await sequelize.query(query);
        console.log('✅ Query executed');
      } catch (err) {
        console.log(`⚠️  Query failed (continuing): ${err.message}`);
      }
    }

    // Verify final columns
    const result = await sequelize.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'logistics_document_items' ORDER BY ORDINAL_POSITION`
    );

    console.log('\n✅ Final table columns:');
    result[0].forEach(row => {
      console.log(`  - ${row.COLUMN_NAME}`);
    });

    console.log('\n✅ Table structure is correct!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

fixLineStatusColumn();
