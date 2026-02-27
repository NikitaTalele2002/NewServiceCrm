import { sequelize } from './db.js';

(async () => {
  try {
    console.log('\n🔍 Checking database structure and data...\n');

    // Check calls table columns
    const [callsCols] = await sequelize.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'calls' 
      ORDER BY ORDINAL_POSITION
      OFFSET 0 ROWS FETCH NEXT 15 ROWS ONLY
    `);
    console.log('calls table columns:', callsCols.map(c => c.COLUMN_NAME).join(', '));

    // Check goods_movement_items table
    const [gmiCols] = await sequelize.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'goods_movement_items' 
      ORDER BY ORDINAL_POSITION
    `);
    console.log('goods_movement_items columns:', gmiCols.map(c => c.COLUMN_NAME).join(', '));

    // Count call_spare_usage records
    const [[usage]] = await sequelize.query(`
      SELECT COUNT(*) as cnt FROM call_spare_usage WHERE used_qty > 0
    `);
    console.log('\ncall_spare_usage records (used_qty > 0):', usage.cnt);

    // Count stock_movement records
    const [[movements]] = await sequelize.query(`
      SELECT COUNT(*) as cnt FROM stock_movement
    `);
    console.log('stock_movement records total:', movements.cnt);

    // Check if any stock_movement has reference_type = 'call_spare_usage'
    const [[refType]] = await sequelize.query(`
      SELECT COUNT(*) as cnt FROM stock_movement 
      WHERE reference_type = 'call_spare_usage'
    `);
    console.log('stock_movement with reference_type=call_spare_usage:', refType.cnt);

    // Sample usage data
    const [samples] = await sequelize.query(`
      SELECT TOP 5 usage_id, call_id, spare_part_id, used_qty, created_at 
      FROM call_spare_usage 
      WHERE used_qty > 0 
      ORDER BY created_at DESC
    `);
    console.log('\nRecent usage records:');
    if (samples.length === 0) {
      console.log('  (None)');
    } else {
      samples.forEach(s => {
        console.log(`  - usage_id=${s.usage_id}, call=${s.call_id}, spare=${s.spare_part_id}, qty=${s.used_qty}`);
      });
    }

    // Sample stock_movement data
    const [movements_sample] = await sequelize.query(`
      SELECT TOP 5 movement_id, reference_type, reference_no, stock_movement_type, bucket, total_qty 
      FROM stock_movement 
      ORDER BY created_at DESC
    `);
    console.log('\nRecent stock_movement records:');
    if (movements_sample.length === 0) {
      console.log('  (None)');
    } else {
      movements_sample.forEach(m => {
        console.log(`  - movement_id=${m.movement_id}, ref_type=${m.reference_type}, ref_no=${m.reference_no}, type=${m.stock_movement_type}`);
      });
    }

    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
