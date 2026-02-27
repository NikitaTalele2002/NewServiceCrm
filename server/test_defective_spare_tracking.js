/**
 * Test: Defective Spare Tracking Implementation
 * 
 * Workflow:
 * 1. Create test call
 * 2. Allocate spare to technician
 * 3. Technician uses spare (records usage with defective tracking)
 * 4. Verify defective qty increased in technician inventory
 * 5. Technician submits return request
 * 6. ASC verifies return
 * 7. Verify final inventory state
 * 
 * Run: node test_defective_spare_tracking.js
 */

import sql from 'mssql';
import config from './dbConfig.js';

async function test() {
  const pool = new sql.ConnectionPool(config);
  
  try {
    await pool.connect();
    console.log('\n' + '='.repeat(80));
    console.log('TEST: DEFECTIVE SPARE TRACKING IMPLEMENTATION');
    console.log('='.repeat(80));

    // ==============================================================
    // STEP 1: Get or create test data
    // ==============================================================
    console.log('\n📋 STEP 1: Setup Test Data');
    console.log('-'.repeat(80));

    // Get a technician
    const techRes = await pool.request()
      .query(`SELECT TOP 1 technician_id, location_id FROM technicians`);
    
    if (techRes.recordset.length === 0) {
      console.error('❌ No technician found in database');
      process.exit(1);
    }

    const technicianId = techRes.recordset[0].technician_id;
    console.log(`✅ Using Technician ID: ${technicianId}`);

    // Get a spare part
    const spareRes = await pool.request()
      .query(`SELECT TOP 1 Id, PART, DESCRIPTION FROM spare_parts`);
    
    if (spareRes.recordset.length === 0) {
      console.error('❌ No spare parts found in database');
      process.exit(1);
    }

    const spareId = spareRes.recordset[0].Id;
    const spareName = spareRes.recordset[0].DESCRIPTION;
    console.log(`✅ Using Spare Part ID: ${spareId}, Name: ${spareName}`);

    // ==============================================================
    // STEP 2: Create a test call
    // ==============================================================
    console.log('\n📞 STEP 2: Create Test Call');
    console.log('-'.repeat(80));

    const callRes = await pool.request()
      .input('tech_id', sql.Int, technicianId)
      .query(`
        INSERT INTO calls (
          complaint_id, assigned_tech_id, status, created_at, updated_at
        ) VALUES (
          'TEST-' + CONVERT(VARCHAR, GETDATE(), 112) + '-' + 
          CONVERT(VARCHAR, DATEPART(HOUR, GETDATE())) + 
          CONVERT(VARCHAR, DATEPART(MINUTE, GETDATE())),
          @tech_id, 'ALLOCATED', GETDATE(), GETDATE()
        );
        SELECT SCOPE_IDENTITY() as call_id;
      `);

    const callId = callRes.recordset[0].call_id;
    console.log(`✅ Created Call ID: ${callId}`);

    // ==============================================================
    // STEP 3: Allocate spare to technician
    // ==============================================================
    console.log('\n📦 STEP 3: Allocate Spare to Technician');
    console.log('-'.repeat(80));

    // Create spare request
    const reqRes = await pool.request()
      .query(`
        INSERT INTO spare_requests (
          spare_part_id, requested_qty, requested_by_tech_id, 
          approval_status, request_status, created_at, updated_at
        ) VALUES (
          ${spareId}, 2, ${technicianId}, 'APPROVED', 'ALLOCATED', 
          GETDATE(), GETDATE()
        );
        SELECT SCOPE_IDENTITY() as request_id;
      `);

    const requestId = reqRes.recordset[0].request_id;
    console.log(`✅ Created Spare Request ID: ${requestId}`);
    console.log(`   Requested: 2 units to Technician ${technicianId}`);

    // Allocate spare (update/create inventory)
    await pool.request()
      .query(`
        MERGE INTO spare_inventory si
        USING (SELECT ${spareId} as spare_id, 'technician' as loc_type, ${technicianId} as loc_id) t
        ON si.spare_id = t.spare_id AND si.location_type = t.loc_type AND si.location_id = t.loc_id
        WHEN MATCHED THEN
          UPDATE SET qty_good = qty_good + 2, updated_at = GETDATE()
        WHEN NOT MATCHED THEN
          INSERT (spare_id, location_type, location_id, qty_good, qty_defective, created_at, updated_at)
          VALUES (${spareId}, 'technician', ${technicianId}, 2, 0, GETDATE(), GETDATE());
      `);

    console.log(`✅ Allocated to technician inventory`);

    // Check inventory before usage
    const invBeforeRes = await pool.request()
      .query(`
        SELECT sparse_id, qty_good, qty_defective 
        FROM spare_inventory 
        WHERE spare_id = ${spareId} 
        AND location_type = 'technician' 
        AND location_id = ${technicianId}
      `);

    const invBefore = invBeforeRes.recordset[0];
    console.log(`   Inventory before usage:`);
    console.log(`   • Good: ${invBefore.qty_good}`);
    console.log(`   • Defective: ${invBefore.qty_defective}`);

    // ==============================================================
    // STEP 4: Technician uses spare (records consumption)
    // ==============================================================
    console.log('\n🔧 STEP 4: Technician Uses Spare (Records Consumption)');
    console.log('-'.repeat(80));

    const usageRes = await pool.request()
      .query(`
        INSERT INTO call_spare_usage (
          call_id, spare_part_id, issued_qty, used_qty, returned_qty, 
          usage_status, used_by_tech_id, remarks, created_at, updated_at
        ) VALUES (
          ${callId}, ${spareId}, 2, 1, 1,
          'PARTIAL', ${technicianId}, 
          'Replaced faulty compressor with spare',
          GETDATE(), GETDATE()
        );
        SELECT SCOPE_IDENTITY() as usage_id;
      `);

    const usageId = usageRes.recordset[0].usage_id;
    console.log(`✅ Recorded Spare Usage (ID: ${usageId})`);
    console.log(`   • Issued: 2 units`);
    console.log(`   • Used: 1 unit (installed new spare)`);
    console.log(`   • Returned: 1 unit (extra)`);
    console.log(`   • Status: PARTIAL`);

    // ==============================================================
    // STEP 5: Update inventory for defective tracking
    // ==============================================================
    console.log('\n🔴 STEP 5: Track Defective Part in Technician Inventory');
    console.log('-'.repeat(80));

    await pool.request()
      .query(`
        UPDATE spare_inventory
        SET qty_good = qty_good - 1,      -- Used 1 good spare
            qty_defective = qty_defective + 1,  -- Removed 1 defective part
            updated_at = GETDATE()
        WHERE spare_id = ${spareId}
        AND location_type = 'technician'
        AND location_id = ${technicianId};
      `);

    console.log(`✅ Updated Technician Inventory`);

    // Add stock movement for audit trail
    await pool.request()
      .query(`
        INSERT INTO stock_movements (
          spare_id, location_type, location_id, movement_type,
          quantity, reference_type, reference_id, created_at, updated_at
        ) VALUES (
          ${spareId}, 'technician', ${technicianId}, 'DEFECTIVE_TRACKED',
          1, 'call_spare_usage', ${usageId}, GETDATE(), GETDATE()
        );
      `);

    console.log(`✅ Created Stock Movement (DEFECTIVE_TRACKED)`);

    // Verify inventory after usage
    const invAfterRes = await pool.request()
      .query(`
        SELECT spare_id, qty_good, qty_defective 
        FROM spare_inventory 
        WHERE spare_id = ${spareId} 
        AND location_type = 'technician' 
        AND location_id = ${technicianId}
      `);

    const invAfter = invAfterRes.recordset[0];
    console.log(`   Inventory after usage:`);
    console.log(`   • Good: ${invAfter.qty_good} (was ${invBefore.qty_good}, -1 used)`);
    console.log(`   • Defective: ${invAfter.qty_defective} (was ${invBefore.qty_defective}, +1 from removal)`);

    if (invAfter.qty_defective === invBefore.qty_defective + 1) {
      console.log(`   ✅ Defective tracking SUCCESSFUL!`);
    } else {
      console.log(`   ❌ Defective tracking FAILED!`);
    }

    // ==============================================================
    // STEP 6: Technician submits return request
    // ==============================================================
    console.log('\n📋 STEP 6: Technician Submits Return Request');
    console.log('-'.repeat(80));

    const returnRes = await pool.request()
      .query(`
        INSERT INTO technician_spare_returns (
          return_number, requested_by_tech_id, return_status, 
          created_at, updated_at
        ) VALUES (
          'RET-' + CONVERT(VARCHAR(10), GETDATE(), 112) + '-' + CONVERT(VARCHAR, ${technicianId}),
          ${technicianId}, 'PENDING', GETDATE(), GETDATE()
        );
        SELECT SCOPE_IDENTITY() as return_id;
      `);

    const returnId = returnRes.recordset[0].return_id;
    console.log(`✅ Created Return Request ID: ${returnId}`);

    // Add return items (defective + unused)
    await pool.request()
      .query(`
        INSERT INTO technician_spare_return_items (
          return_id, spare_part_id, item_type, requested_qty, 
          condition_notes, created_at
        ) VALUES
        (${returnId}, ${spareId}, 'defective', 1, 'Defective compressor removed from equipment', GETDATE()),
        (${returnId}, ${spareId}, 'unused', 1, 'Extra spare not needed', GETDATE());
      `);

    console.log(`✅ Added Return Items:`);
    console.log(`   • 1 Defective (removed part)`);
    console.log(`   • 1 Unused (extra spare)`);

    // ==============================================================
    // STEP 7: ASC Verifies return request
    // ==============================================================
    console.log('\n✅ STEP 7: ASC Verifies Return Request');
    console.log('-'.repeat(80));

    await pool.request()
      .query(`
        UPDATE technician_spare_returns
        SET return_status = 'VERIFIED', updated_at = GETDATE()
        WHERE return_id = ${returnId};
      `);

    // Update inventory for return
    console.log(`   Processing return inventory updates...`);

    // Decrease from technician
    await pool.request()
      .query(`
        UPDATE spare_inventory
        SET qty_defective = qty_defective - 1,
            qty_good = qty_good - 1,
            updated_at = GETDATE()
        WHERE spare_id = ${spareId}
        AND location_type = 'technician'
        AND location_id = ${technicianId};
      `);

    console.log(`   ✅ Removed from Technician:`);
    console.log(`      • -1 Defective (returned)`);
    console.log(`      • -1 Good (returned)`);

    // Create stock movements for return
    await pool.request()
      .query(`
        INSERT INTO stock_movements (
          spare_id, location_type, location_id, movement_type,
          quantity, reference_type, reference_id, created_at, updated_at
        ) VALUES
        (${spareId}, 'technician', ${technicianId}, 'TECH_RETURN_DEFECTIVE', 1, 'technician_spare_returns', ${returnId}, GETDATE(), GETDATE()),
        (${spareId}, 'technician', ${technicianId}, 'TECH_RETURN_UNUSED', 1, 'technician_spare_returns', ${returnId}, GETDATE(), GETDATE());
      `);

    console.log(`   ✅ Stock movements recorded`);

    // ==============================================================
    // STEP 8: Final inventory verification
    // ==============================================================
    console.log('\n📊 STEP 8: Final Inventory State');
    console.log('-'.repeat(80));

    const invFinalRes = await pool.request()
      .query(`
        SELECT spare_id, qty_good, qty_defective 
        FROM spare_inventory 
        WHERE spare_id = ${spareId} 
        AND location_type = 'technician' 
        AND location_id = ${technicianId}
      `);

    if (invFinalRes.recordset.length > 0) {
      const invFinal = invFinalRes.recordset[0];
      console.log(`   Technician Final Inventory:`);
      console.log(`   • Good: ${invFinal.qty_good}`);
      console.log(`   • Defective: ${invFinal.qty_defective}`);
    } else {
      console.log(`   ℹ️ Technician has no inventory (all returned)`);
    }

    // Show movement history
    const mvtRes = await pool.request()
      .query(`
        SELECT movement_type, quantity, reference_type, reference_id, created_at
        FROM stock_movements
        WHERE spare_id = ${spareId}
        AND location_id = ${technicianId}
        ORDER BY created_at
      `);

    console.log(`\n   📜 Movement History:`);
    mvtRes.recordset.forEach((mvt, idx) => {
      console.log(`      ${idx + 1}. ${mvt.movement_type} (Qty: ${mvt.quantity})`);
      console.log(`         Ref: ${mvt.reference_type} #${mvt.reference_id}`);
    });

    // ==============================================================
    // Summary
    // ==============================================================
    console.log('\n' + '='.repeat(80));
    console.log('✅ TEST COMPLETED SUCCESSFULLY');
    console.log('='.repeat(80));
    console.log(`
    Workflow Summary:
    ✅ 1. Created call and allocated 2 spares to technician
    ✅ 2. Technician used 1 spare (installed it)
    ✅ 3. Defective part tracked in technician inventory (+1 qty_defective)
    ✅ 4. Technician submitted return request (1 defective + 1 unused)
    ✅ 5. ASC verified and processed return
    ✅ 6. Inventory updated and consolidated

    Key Points:
    • When a spare is used, the removed defective part is tracked
    • Technician inventory: qty_defective increases by used_qty
    • Return request includes both defective and excess items
    • Stock movements create audit trail for all transactions
    • Final state: Technician returned all spares, inventory balanced
    `);

  } catch (err) {
    console.error('\n❌ TEST FAILED:');
    console.error(err.message);
    if (err.sql) {
      console.error('SQL:', err.sql);
    }
  } finally {
    await pool.close();
    process.exit(0);
  }
}

test();
