/**
 * Adjust MSL values to trigger auto-generation
 * This script sets higher MSL thresholds so some inventory items fall below
 */

import { SparePartMSL } from './models/index.js';

async function adjustMSLForDemo() {
  try {
    console.log('🔧 Adjusting MSL values for auto-generation demo...\n');

    // Simple approach: update all MSL records with higher minimum thresholds
    // Current inventory for service centers:
    // - Service center 1: 5-20 units per spare
    // - Service center 2: 2-20 units per spare
    // Setting MSL min to 10 will trigger many items below threshold

    const result = await SparePartMSL.update(
      {
        minimum_stock_level_qty: 10,      // Raise MSL to 10
        maximum_stock_level_qty: 50,      // Raise max to 50
        updated_at: new Date()
      },
      {
        where: { is_active: true }         // Update all active MSL records
      }
    );

    console.log(`✅ Updated ${result[0]} MSL records`);
    console.log('   New MSL Threshold: Min = 10 units, Max = 50 units\n');

    // Show sample data
    const samples = await SparePartMSL.findAll({
      limit: 5,
      raw: true,
      attributes: ['spare_part_id', 'city_tier_id', 'minimum_stock_level_qty', 'maximum_stock_level_qty']
    });

    console.log('Sample MSL Records (after update):');
    console.log('─'.repeat(60));
    samples.forEach(record => {
      console.log(`  Spare ${record.spare_part_id} | Tier ${record.city_tier_id} | Min: ${record.minimum_stock_level_qty} | Max: ${record.maximum_stock_level_qty}`);
    });

    console.log('\n✅ MSL values updated successfully!\n');
    console.log('Now run: node run_msl_demo.js\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error adjusting MSL:', err.message);
    process.exit(1);
  }
}

adjustMSLForDemo();
