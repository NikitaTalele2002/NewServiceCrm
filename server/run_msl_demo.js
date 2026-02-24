/**
 * MSL Auto-Generation Demo Script
 * 1. Inserts sample MSL data
 * 2. Scans inventory against MSL
 * 3. Auto-generates spare requests for items below MSL
 */

import { 
  SparePartMSL, 
  CityTierMaster, 
  SpareInventory, 
  ServiceCenter 
} from './models/index.js';
import { scanAndAutoGenerateRequests, checkMSLRequirement } from './services/mslCheckService.js';
import { sequelize } from './db.js';
import { Op } from 'sequelize';

async function runMSLDemo() {
  try {
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║      MSL Auto-Generation Demo - Complete Workflow              ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    // Step 1: Get or create city tiers
    console.log('Step 1️⃣  Preparing city tier data...\n');
    let cityTiers = await CityTierMaster.findAll({ limit: 3 });
    
    if (cityTiers.length === 0) {
      console.log('  Creating default city tiers...');
      await CityTierMaster.bulkCreate([
        { tier_name: 'Tier 1 - Metro' },
        { tier_name: 'Tier 2 - City' },
        { tier_name: 'Tier 3 - Town' }
      ]);
      cityTiers = await CityTierMaster.findAll({ limit: 3 });
    }
    console.log(`  ✅ Found ${cityTiers.length} city tiers\n`);

    // Step 2: Check existing MSL data
    console.log('Step 2️⃣  Checking existing MSL data...\n');
    const existingMSL = await SparePartMSL.count();
    console.log(`  Found ${existingMSL} existing MSL records\n`);

    // Step 3: Insert or update MSL data
    console.log('Step 3️⃣  Inserting/Updating MSL data...\n');
    const sparePartIds = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    const mslConfig = {
      'Tier 1 - Metro': { min: 20, max: 100 },
      'Tier 2 - City': { min: 15, max: 75 },
      'Tier 3 - Town': { min: 10, max: 50 }
    };

    let createdCount = 0;

    for (const sparePartId of sparePartIds) {
      for (const tier of cityTiers) {
        const config = mslConfig[tier.tier_name] || { min: 10, max: 50 };
        
        // Try to find existing record
        const existing = await SparePartMSL.findOne({
          where: {
            spare_part_id: sparePartId,
            city_tier_id: tier.city_tier_id,
            is_active: true
          }
        });

        if (!existing) {
          await SparePartMSL.create({
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
          createdCount++;
        }
      }
    }

    console.log(`  ✅ Created ${createdCount} new MSL records\n`);

    // Step 4: Show inventory status
    console.log('Step 4️⃣  Showing current inventory vs MSL...\n');
    console.log('  Service Center Inventory Analysis:');
    console.log('  ─'.repeat(80));

    const inventoryRecords = await SpareInventory.findAll({
      where: { location_type: 'service_center' },
      order: [['location_id', 'ASC'], ['spare_id', 'ASC']],
      raw: true
    });

    const analysis = [];
    for (const inv of inventoryRecords) {
      const sc = await ServiceCenter.findByPk(inv.location_id);
      const mslCheck = await checkMSLRequirement(inv.spare_id, inv.location_id, inv.qty_good);
      
      if (mslCheck.needsReplenishment) {
        analysis.push({
          spareId: inv.spare_id,
          locationId: inv.location_id,
          currentQty: inv.qty_good,
          mslMin: mslCheck.mslInfo?.minimumLevel || 0,
          shortage: mslCheck.shortageQty,
          status: '⚠️  BELOW MSL'
        });
      }
    }

    if (analysis.length > 0) {
      console.log('\n  Items BELOW MSL (need replenishment):');
      analysis.forEach(item => {
        console.log(
          `    Spare ${item.spareId} @ Location ${item.locationId}: ` +
          `${item.currentQty} qty (min: ${item.mslMin}) → Shortage: ${item.shortage} units ${item.status}`
        );
      });
    } else {
      console.log('\n  ℹ️  No items below MSL found\n');
    }

    // Step 5: Run auto-generation
    console.log('\n\nStep 5️⃣  Running auto-generation scan...\n');
    const generatedRequests = await scanAndAutoGenerateRequests(1);

    console.log('\n\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║                      FINAL SUMMARY                           ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    console.log(`✅ MSL Records Created: ${createdCount}`);
    console.log(`⚠️  Items Below MSL: ${analysis.length}`);
    console.log(`📋 Auto-Generated Requests: ${generatedRequests.length}\n`);

    if (generatedRequests.length > 0) {
      console.log('📋 Generated Request Details:');
      console.log('─'.repeat(80));
      generatedRequests.forEach((req, index) => {
        console.log(
          `${index + 1}. Request ID: ${req.requestId} | ` +
          `Spare: ${req.spareId} | ` +
          `Location: ${req.locationId} | ` +
          `Quantity: ${req.requestedQty}`
        );
      });
    }

    console.log('\n✅ Demo completed successfully!\n');
    process.exit(0);

  } catch (err) {
    console.error('❌ Error running demo:', err.message);
    console.error(err);
    process.exit(1);
  }
}

runMSLDemo();
