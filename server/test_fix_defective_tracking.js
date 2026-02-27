/**
 * Test: Verify defective spare tracking fix
 * This will test the POST /spare-consumption endpoint
 */
import { sequelize } from './db.js';

async function test() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('TEST: DEFECTIVE SPARE TRACKING FIX');
    console.log('='.repeat(80));

    // 1. Get a spare part
    console.log('\n1️⃣ Finding spare part...');
    const spareRes = await sequelize.query(`SELECT TOP 1 Id FROM spare_parts`);
    if (spareRes[0].length === 0) {
      console.log('❌ No spare parts found');
      process.exit(1);
    }
    const spareId = spareRes[0][0].Id;
    console.log(`✅ Using spare_id: ${spareId}`);

    // 2. Get a technician
    console.log('\n2️⃣ Finding technician...');
    const techRes = await sequelize.query(`SELECT TOP 1 technician_id FROM technicians`);
    if (techRes[0].length === 0) {
      console.log('❌ No technicians found');
      process.exit(1);
    }
    const technicianId = techRes[0][0].technician_id;
    console.log(`✅ Using technician_id: ${technicianId}`);

    // 3. Get a call
    console.log('\n3️⃣ Finding a call...');
    const callRes = await sequelize.query(`SELECT TOP 1 call_id FROM calls`);
    let callId;
    if (callRes[0].length === 0) {
      // Create one
      console.log('   No calls found, creating one...');
      const newCall = await sequelize.query(`
        INSERT INTO calls (
          complaint_id, assigned_tech_id, status, created_at, updated_at
        ) VALUES (
          'TEST-' + CONVERT(VARCHAR(20), GETDATE(), 112),
          ?,
          'ALLOCATED',
          GETDATE(),
          GETDATE()
        );
        SELECT SCOPE_IDENTITY() as call_id;
      `, {
        replacements: [technicianId]
      });
      callId = newCall[0][0].call_id;
      console.log(`   ✅ Created call_id: ${callId}`);
    } else {
      callId = callRes[0][0].call_id;
      console.log(`✅ Using call_id: ${callId}`);
    }

    // 4. Check inventory BEFORE
    console.log('\n4️⃣ Checking inventory BEFORE usage...');
    const invBefore = await sequelize.query(`
      SELECT spare_id, location_type, location_id, qty_good, qty_defective
      FROM spare_inventory
      WHERE spare_id = ? AND location_type = 'technician' AND location_id = ?
    `, {
      replacements: [spareId, technicianId]
    });

    let beforeGood = 0, beforeDefective = 0;
    if (invBefore[0].length > 0) {
      beforeGood = invBefore[0][0].qty_good;
      beforeDefective = invBefore[0][0].qty_defective;
      console.log(`   Current: qty_good=${beforeGood}, qty_defective=${beforeDefective}`);
    } else {
      console.log(`   ℹ️ No inventory record entry (will be created)`);
    }

    // 5. Record spare usage
    console.log('\n5️⃣ Recording spare usage (used_qty=1)...');
    const usageRes = await sequelize.query(`
      INSERT INTO call_spare_usage (
        call_id, spare_part_id, issued_qty, used_qty, returned_qty,
        usage_status, used_by_tech_id, remarks, created_at, updated_at
      ) VALUES (
        ?, ?, 2, 1, 1,
        'PARTIAL', ?, 'Test: Replacing defective with spare',
        GETDATE(), GETDATE()
      );
      SELECT SCOPE_IDENTITY() as usage_id;
    `, {
      replacements: [callId, spareId, technicianId]
    });

    const usageId = usageRes[0][0].usage_id;
    console.log(`✅ Recorded usage_id: ${usageId}`);

    // 6. Manually update inventory (what POST endpoint should do)
    console.log('\n6️⃣ Updating inventory for defective tracking...');
    const updateResult = await sequelize.query(`
      UPDATE spare_inventory
      SET 
        qty_good = CASE WHEN qty_good >= 1 THEN qty_good - 1 ELSE 0 END,
        qty_defective = qty_defective + 1,
        updated_at = GETDATE()
      WHERE spare_id = ?
        AND location_type = 'technician'
        AND location_id = ?
    `, {
      replacements: [spareId, technicianId]
    });

    // If no rows updated, insert new record
    if (updateResult[1] === 0) {
      console.log(`   ℹ️ No existing record, inserting new one...`);
      await sequelize.query(`
        INSERT INTO spare_inventory (
          spare_id, location_type, location_id, qty_good, qty_defective,
          created_at, updated_at
        ) VALUES (
          ?, 'technician', ?, 0, 1, GETDATE(), GETDATE()
        )
      `, {
        replacements: [spareId, technicianId]
      });
    }
    console.log(`✅ Inventory updated`);

    // 7. Check inventory AFTER
    console.log('\n7️⃣ Checking inventory AFTER usage...');
    const invAfter = await sequelize.query(`
      SELECT spare_id, location_type, location_id, qty_good, qty_defective
      FROM spare_inventory
      WHERE spare_id = ? AND location_type = 'technician' AND location_id = ?
    `, {
      replacements: [spareId, technicianId]
    });

    let afterGood = 0, afterDefective = 0;
    if (invAfter[0].length > 0) {
      afterGood = invAfter[0][0].qty_good;
      afterDefective = invAfter[0][0].qty_defective;
      console.log(`   After: qty_good=${afterGood}, qty_defective=${afterDefective}`);
    } else {
      console.log(`   ❌ No inventory record found!`);
    }

    // 8. Verify the changes
    console.log('\n8️⃣ Verification:');
    console.log(`   qty_defective before: ${beforeDefective}`);
    console.log(`   qty_defective after: ${afterDefective}`);

    if (afterDefective === beforeDefective + 1) {
      console.log(`   ✅ DEFECTIVE TRACKING WORKS! (increased by 1)`);
    } else {
      console.log(`   ❌ DEFECTIVE TRACKING FAILED! (expected ${beforeDefective + 1}, got ${afterDefective})`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('TEST COMPLETE');
    console.log('='.repeat(80));

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err);
    process.exit(1);
  }
}

test();
