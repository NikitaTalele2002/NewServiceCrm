import { sequelize } from './db.js';

async function diagnoseColumn() {
  try {
    console.log('=== Diagnosing movement_type Column ===\n');

    // Check default constraints
    const defaults = await sequelize.query(`
      SELECT d.name, c.name
      FROM sys.default_constraints d
      JOIN sys.columns c ON d.parent_object_id = c.object_id AND d.parent_column_id = c.column_id
      JOIN sys.tables t ON c.object_id = t.object_id
      WHERE t.name = 'stock_movement' AND c.name = 'movement_type'
    `, { type: sequelize.QueryTypes.SELECT });

    if (defaults.length > 0) {
      console.log('Found DEFAULT constraints:');
      defaults.forEach(d => {
        console.log(`  - ${d.name} on column ${d.name}`);
      });
      
      console.log('\nDropping default constraints first...');
      for (const d of defaults) {
        const dropSql = `ALTER TABLE stock_movement DROP CONSTRAINT [${d.name}]`;
        console.log(`Running: ${dropSql}`);
        await sequelize.query(dropSql);
      }
    } else {
      console.log('No default constraints found');
    }

    // Check indexes
    const indexes = await sequelize.query(`
      SELECT i.name, c.name
      FROM sys.indexes i
      JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
      JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
      JOIN sys.tables t ON i.object_id = t.object_id
      WHERE t.name = 'stock_movement' AND c.name = 'movement_type'
    `, { type: sequelize.QueryTypes.SELECT });

    if (indexes.length > 0) {
      console.log('\nFound INDEXES on column:');
      indexes.forEach(idx => {
        console.log(`  - ${idx.name}`);
      });
      
      console.log('\nDropping indexes first...');
      for (const idx of indexes) {
        const dropSql = `DROP INDEX [${idx.name}] ON stock_movement`;
        console.log(`Running: ${dropSql}`);
        await sequelize.query(dropSql);
      }
    } else {
      console.log('\nNo indexes found on column');
    }

    // Now try dropping the column
    console.log('\nNow attempting to drop the column...');
    await sequelize.query(`ALTER TABLE stock_movement DROP COLUMN movement_type`);
    console.log('✅ Successfully dropped movement_type column');

    process.exit(0);
  } catch (e) {
    console.error('\n❌ Error:', e.message);
    if (e.original && e.original.message) {
      console.error('SQL Error:', e.original.message);
    }
    process.exit(1);
  }
}

diagnoseColumn();
