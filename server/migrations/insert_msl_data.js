/**
 * Insert Sample Data into spare_part_msl table
 * Creates MSL (Minimum Stock Level) data for all spare parts across different city tiers
 */

import { SparePartMSL, CityTierMaster } from '../models/index.js';
import { sequelize } from '../db.js';

async function insertSampleMSLData() {
  try {
    console.log('Starting MSL data insertion...\n');

    // Get all city tiers
    const cityTiers = await CityTierMaster.findAll({
      attributes: ['city_tier_id', 'tier_name'],
      limit: 3
    });

    if (cityTiers.length === 0) {
      console.log('⚠️  No city tiers found. Creating default...');
      // Create default city tiers if they don't exist
      await CityTierMaster.bulkCreate([
        { tier_name: 'Tier 1 - Metro' },
        { tier_name: 'Tier 2 - City' },
        { tier_name: 'Tier 3 - Town' }
      ]);
      cityTiers = await CityTierMaster.findAll({ limit: 3 });
    }

    console.log(`✅ Found ${cityTiers.length} city tiers`);

    // Define MSL data for each spare part
    // Spare parts 2-11 with different MSL values per city tier
    const mslData = [];
    const sparePartIds = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

    // MSL values decrease for lower tiers (lower demand areas need less stock)
    const mslConfig = {
      'Tier 1 - Metro': { min: 20, max: 100 },        // High demand, high min stock
      'Tier 2 - City': { min: 15, max: 75 },          // Medium demand
      'Tier 3 - Town': { min: 10, max: 50 }           // Lower demand
    };

    for (const sparePartId of sparePartIds) {
      for (const tier of cityTiers) {
        const config = mslConfig[tier.tier_name] || { min: 10, max: 50 };
        
        mslData.push({
          spare_part_id: sparePartId,
          city_tier_id: tier.city_tier_id,
          minimum_stock_level_qty: config.min,
          maximum_stock_level_qty: config.max,
          effective_from: new Date(),
          effective_to: null,
          is_active: true,
          created_by: 1,
          created_at: new Date(),
          updated_at: new Date()
        });
      }
    }

    console.log(`\n📦 Inserting ${mslData.length} MSL records...\n`);

    // Bulk insert with error handling
    const insertedRecords = await SparePartMSL.bulkCreate(mslData, {
      ignoreDuplicates: false
    });

    console.log(`✅ Successfully inserted ${insertedRecords.length} MSL records\n`);

    // Display summary
    console.log('📊 MSL Data Summary:');
    console.log('─'.repeat(70));
    for (const tier of cityTiers) {
      const tierRecords = insertedRecords.filter(r => r.city_tier_id === tier.city_tier_id);
      console.log(`${tier.tier_name}: ${tierRecords.length} spare parts configured`);
    }

    console.log('\n✅ MSL data insertion completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error inserting MSL data:', err.message);
    console.error(err);
    process.exit(1);
  }
}

insertSampleMSLData();
