import { sequelize } from './db.js';

async function dropMovementTypeColumn() {
  try {
    console.log('=== Dropping Old movement_type Column ===\n');

    // First check if the column even exists
    const checkCol = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'stock_movement' AND COLUMN_NAME = 'movement_type'
    `, { type: sequelize.QueryTypes.SELECT });

    if (checkCol.length === 0) {
      console.log('✅ Column movement_type does not exist - already removed or never existed');
      process.exit(0);
    }

    console.log('Found movement_type column, attempting to drop...\n');

    // Check for any constraints on this column
    const constraints = await sequelize.query(`
      SELECT CONSTRAINT_NAME 
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
      WHERE TABLE_NAME = 'stock_movement' AND COLUMN_NAME = 'movement_type'
    `, { type: sequelize.QueryTypes.SELECT });

    if (constraints.length > 0) {
      console.log('Found constraints on column:');
      for (const constraint of constraints) {
        console.log(`  Dropping constraint: ${constraint.CONSTRAINT_NAME}`);
        await sequelize.query(`ALTER TABLE stock_movement DROP CONSTRAINT ${constraint.CONSTRAINT_NAME}`);
      }
    }

    // Try dropping the column with raw SQL
    console.log('Dropping column...');
    await sequelize.query(`
      ALTER TABLE stock_movement DROP COLUMN movement_type
    `);

    console.log('✅ Successfully dropped movement_type column');
    
    // Verify it's gone
    const verify = await sequelize.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'stock_movement' 
      ORDER BY ORDINAL_POSITION
    `, { type: sequelize.QueryTypes.SELECT });

    console.log('\n=== Remaining Columns ===');
    console.log('Columns in stock_movement table:');
    verify.forEach((col, idx) => {
      console.log(`${idx + 1}. ${col.COLUMN_NAME}`);
    });

    // Check for movement type columns
    const movementCols = verify.filter(col => 
      col.COLUMN_NAME.toLowerCase().includes('movement') && 
      col.COLUMN_NAME.toLowerCase().includes('type')
    );

    console.log(`\n✅ Movement type columns: ${movementCols.map(c => c.COLUMN_NAME).join(', ')}`);
    console.log('✅ Duplicate removed! Now using stock_movement_type only');

    process.exit(0);
  } catch (e) {
    console.error('❌ Error:', e.message);
    if (e.original) {
      console.error('❌ SQL Error:', e.original.message);
    }
    process.exit(1);
  }
}

dropMovementTypeColumn();
