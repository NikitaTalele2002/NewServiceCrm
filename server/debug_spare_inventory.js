/**
 * Debug: Check current inventory and call_spare_usage records
 */
import { sequelize } from './db.js';

async function debug() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('DEBUG: SPARE INVENTORY & USAGE');
    console.log('='.repeat(80));

    // Find the Cassandra spare
    console.log('\n1️⃣ FIND CASSANDRA SPARE:');
    const spareRes = await sequelize.query(`
      SELECT TOP 5 
        Id, 
        PART, 
        DESCRIPTION 
      FROM spare_parts 
      WHERE DESCRIPTION LIKE '%Cassandra%' 
         OR PART LIKE '%Gold%'
         OR DESCRIPTION LIKE '%1200MM%'
      ORDER BY Id DESC
    `);

    if (!spareRes || spareRes[0].length === 0) {
      console.log('❌ No Cassandra spare found. Searching all spares...');
      const allRes = await sequelize.query(`SELECT TOP 5 Id, PART, DESCRIPTION FROM spare_parts ORDER BY Id DESC`);
      console.table(allRes[0]);
      process.exit(1);
    }

    const spare = spareRes[0][0];
    const spareId = spare.Id;
    console.log(`✅ Found: ${spare.PART} - ${spare.DESCRIPTION}`);
    console.log(`   Spare ID: ${spareId}`);

    // Check inventory for this spare
    console.log('\n2️⃣ CURRENT INVENTORY FOR THIS SPARE:');
    const invRes = await sequelize.query(`
      SELECT 
        spare_id,
        location_type,
        location_id,
        qty_good,
        qty_defective,
        created_at,
        updated_at
      FROM spare_inventory
      WHERE spare_id = ?
      ORDER BY location_type, location_id
    `, {
      replacements: [spareId]
    });

    if (!invRes || invRes[0].length === 0) {
      console.log(`❌ NO INVENTORY RECORDS for spare_id ${spareId}`);
    } else {
      console.table(invRes[0]);
    }

    // Check if there are any usage records
    console.log('\n3️⃣ USAGE RECORDS FOR THIS SPARE:');
    const usageRes = await sequelize.query(`
      SELECT TOP 10
        usage_id,
        call_id,
        spare_part_id,
        issued_qty,
        used_qty,
        returned_qty,
        usage_status,
        used_by_tech_id,
        remarks,
        created_at
      FROM call_spare_usage
      WHERE spare_part_id = ?
      ORDER BY usage_id DESC
    `, {
      replacements: [spareId]
    });

    if (!usageRes || usageRes[0].length === 0) {
      console.log(`❌ NO USAGE RECORDS for spare_id ${spareId}`);
    } else {
      console.table(usageRes[0]);
    }

    // Check stock movements for this spare
    console.log('\n4️⃣ STOCK MOVEMENTS FOR THIS SPARE:');
    const mvtRes = await sequelize.query(`
      SELECT TOP 10
        movement_id,
        movement_type,
        quantity,
        location_type,
        location_id,
        reference_type,
        reference_id,
        created_at
      FROM stock_movements
      WHERE spare_id = ?
      ORDER BY created_at DESC
    `, {
      replacements: [spareId]
    });

    if (!mvtRes || mvtRes[0].length === 0) {
      console.log(`❌ NO MOVEMENTS for spare_id ${spareId}`);
    } else {
      console.table(mvtRes[0]);
    }

    // Check spare_requests
    console.log('\n5️⃣ SPARE REQUESTS FOR THIS SPARE:');
    const reqRes = await sequelize.query(`
      SELECT TOP 10
        request_id,
        spare_part_id,
        requested_qty,
        approval_status,
        request_status,
        created_at
      FROM spare_requests
      WHERE spare_part_id = ?
      ORDER BY request_id DESC
    `, {
      replacements: [spareId]
    });

    if (!reqRes || reqRes[0].length === 0) {
      console.log(`❌ NO REQUESTS for spare_id ${spareId}`);
    } else {
      console.table(reqRes[0]);
    }

    console.log('\n' + '='.repeat(80));
    console.log('DEBUG COMPLETE');
    console.log('='.repeat(80));

  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

debug();
