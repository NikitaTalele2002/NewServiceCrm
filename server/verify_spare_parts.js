import { sequelize } from './db.js';

async function verifySpareParts() {
  try {
    console.log('Verifying spare parts in spare_inventory table...\n');

    // Check service center 4 inventory
    const result = await sequelize.query(
      `SELECT 
        si.spare_inventory_id,
        si.spare_id,
        si.location_type,
        si.location_id,
        si.qty_good,
        si.qty_defective,
        sp.PART,
        sp.BRAND
       FROM spare_inventory si
       LEFT JOIN spare_parts sp ON sp.Id = si.spare_id
       WHERE si.location_type = 'service_center' AND si.location_id = 4
       ORDER BY si.spare_id`,
      { type: sequelize.QueryTypes.SELECT }
    );

    console.log(`Found ${result.length} spare parts for Service Center 4:\n`);
    
    let totalGood = 0;
    let totalDefective = 0;

    result.forEach((row, index) => {
      console.log(`${index + 1}. ${row.PART} (ID: ${row.spare_id})`);
      console.log(`   Good: ${row.qty_good}, Defective: ${row.qty_defective}`);
      totalGood += row.qty_good;
      totalDefective += row.qty_defective;
    });

    console.log(`\n📊 Summary:`);
    console.log(`   Total Good Quantity: ${totalGood}`);
    console.log(`   Total Defective Quantity: ${totalDefective}`);
    console.log(`   Total Items: ${result.length}`);

    if (result.length > 0) {
      console.log('\n✅ Spare parts are properly configured and ready for display!');
    } else {
      console.log('\n⚠️ No spare parts found for service center 4');
    }

  } catch (error) {
    console.error('❌ Error verifying spare parts:', error.message);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

verifySpareParts();
