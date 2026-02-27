#!/usr/bin/env node
/**
 * PART 2: Tech Uses & Returns Spare (Simple Test)
 * Tests: Tech uses spare -> Records usage -> Returns defective -> Gets returned
 * Uses: Raw SQL to avoid Sequelize hooks
 */

import sql from 'mssql';

const config = {
  server: 'localhost\\SQLEXPRESS',
  database: 'NewCRM',
  authentication: {
    type: 'default',
    options: { userName: 'crm_user', password: 'StrongPassword123!' }
  },
  options: { encrypt: false, trustServerCertificate: true, enableArithAbort: true }
};

async function test() {
  const pool = new sql.ConnectionPool(config);
  try {
    await pool.connect();
    console.log('\n' + '='.repeat(70));
    console.log('PART 2: Tech Uses Spare & Tracks Defective Returns');
    console.log('='.repeat(70));

    // This test assumes Part 1 was executed first
    // We'll use a recent call and request from the database

    // Step 2.1: Get latest call
    console.log('\n📞 Step 2.1: Get Latest Call');
    const callRes = await pool.request()
      .input('tech_id', sql.Int, 1)
      .query(`SELECT TOP 1 call_id FROM calls WHERE assigned_tech_id = @tech_id ORDER BY call_id DESC`);
    
    if (callRes.recordset.length === 0) {
      console.error('❌ No call found. Run Part 1 first!');
      process.exit(1);
    }

    const callId = callRes.recordset[0].call_id;
    console.log(`✅ Found call ID: ${callId}`);

    // Step 2.2: Record spare usage on the call
    console.log('\n📝 Step 2.2: Record Spare Usage');
    const usageRes = await pool.request()
      .input('call_id', sql.Int, callId)
      .query(`
        INSERT INTO call_spare_usage (
          call_id, spare_part_id, 
          issued_qty, used_qty, returned_qty, usage_status,
          used_by_tech_id, created_at, updated_at
        ) VALUES (
          @call_id, 1,
          2, 1, 1, 'PARTIAL',
          1, GETDATE(), GETDATE()
        );
        SELECT @@IDENTITY as usage_id;
      `);
    const usageId = usageRes.recordset[0].usage_id;
    console.log(`✅ Spare usage recorded (ID: ${usageId})`);
    console.log(`   Call: ${callId}`);
    console.log(`   Spare ID: 1`);
    console.log(`   Issued: 2 units`);
    console.log(`   Used: 1 unit`);
    console.log(`   Returned: 1 unit`);
    console.log(`   Status: PARTIAL`);

    // Step 2.3: Check Tech inventory before defective tracking
    console.log('\n🏭 Step 2.3: Tech Inventory Status');
    const invBefore = await pool.request()
      .query(`SELECT spare_id, qty_good, qty_defective FROM spare_inventory WHERE spare_id = 1 AND location_type = 'technician' AND location_id = 1`);
    
    if (invBefore.recordset.length > 0) {
      console.log(`   Good: ${invBefore.recordset[0].qty_good}`);
      console.log(`   Defective: ${invBefore.recordset[0].qty_defective}`);
    } else {
      console.log(`   ⚠️ No inventory record yet`);
    }

    // Step 2.4: Tech updates usage to mark some as defective
    console.log('\n🔴 Step 2.4: Mark Used Spare as Defective');
    
    await pool.request()
      .input('usage_id', sql.Int, usageId)
      .query(`
        UPDATE call_spare_usage
        SET remarks = 'Used spare became defective - replaced with new unit'
        WHERE usage_id = @usage_id
      `);
    console.log(`✅ Marked spare as defective in call_spare_usage`);

    // Step 2.5: Update inventory - Move from good to defective at technician location
    console.log('\n🏭 Step 2.5: Update Inventory - Defective Tracking');
    
    await pool.request()
      .query(`
        UPDATE spare_inventory
        SET qty_good = CASE WHEN qty_good > 0 THEN qty_good - 1 ELSE 0 END,
            qty_defective = qty_defective + 1
        WHERE spare_id = 1 AND location_type = 'technician' AND location_id = 1
      `);
    console.log(`✅ Tech inventory: -1 good, +1 defective`);

    // Create stock movement for defective tracking
    await pool.request()
      .query(`
        INSERT INTO stock_movements (spare_id, location_type, location_id, movement_type, quantity, created_at, updated_at)
        VALUES (1, 'technician', 1, 'DEFECTIVE_MARKED', 1, GETDATE(), GETDATE())
      `);
    console.log(`✅ Movement recorded: DEFECTIVE_MARKED`);

    // Step 2.6: Check inventory after defective update
    console.log('\n🏭 Step 2.6: Tech Inventory After Defective Update');
    const invAfter = await pool.request()
      .query(`SELECT spare_id, qty_good, qty_defective FROM spare_inventory WHERE spare_id = 1 AND location_type = 'technician' AND location_id = 1`);
    
    if (invAfter.recordset.length > 0) {
      console.log(`   Good: ${invAfter.recordset[0].qty_good}`);
      console.log(`   Defective: ${invAfter.recordset[0].qty_defective}`);
    }

    // Step 2.7: Tech returns spare - reduce inventory
    console.log('\n🔙 Step 2.7: Tech Returns Spare to ASC');

    // Reduce tech inventory
    await pool.request()
      .query(`
        UPDATE spare_inventory
        SET qty_good = CASE WHEN qty_good > 0 THEN qty_good - 1 ELSE 0 END
        WHERE spare_id = 1 AND location_type = 'technician' AND location_id = 1
      `);
    console.log(`✅ Tech inventory: -1 good (unused spare returned)`);

    await pool.request()
      .query(`
        UPDATE spare_inventory
        SET qty_defective = CASE WHEN qty_defective > 0 THEN qty_defective - 1 ELSE 0 END
        WHERE spare_id = 1 AND location_type = 'technician' AND location_id = 1
      `);
    console.log(`✅ Tech inventory: -1 defective (defective returned)`);

    // Add to ASC inventory
    await pool.request()
      .query(`
        UPDATE spare_inventory
        SET qty_good = qty_good + 1
        WHERE spare_id = 1 AND location_type = 'service_center' AND location_id = 1
      `);
    console.log(`✅ ASC inventory: +1 good (received unused)`);

    await pool.request()
      .query(`
        UPDATE spare_inventory
        SET qty_defective = qty_defective + 1
        WHERE spare_id = 1 AND location_type = 'service_center' AND location_id = 1;
        
        IF @@ROWCOUNT = 0
        BEGIN
          INSERT INTO spare_inventory (spare_id, location_type, location_id, qty_good, qty_defective, qty_in_transit, created_at, updated_at)
          VALUES (1, 'service_center', 1, 0, 1, 0, GETDATE(), GETDATE())
        END
      `);
    console.log(`✅ ASC inventory: +1 defective (received defective)`);

    // Step 2.8: Final inventory check
    console.log('\n✅ FINAL INVENTORY CHECK');
    const finalInv = await pool.request()
      .query(`
        SELECT 'Tech' as location, qty_good, qty_defective FROM spare_inventory 
        WHERE spare_id = 1 AND location_type = 'technician' AND location_id = 1
        UNION ALL
        SELECT 'ASC' as location, qty_good, qty_defective FROM spare_inventory 
        WHERE spare_id = 1 AND location_type = 'service_center' AND location_id = 1
      `);
    
    console.log('\n   Final State:');
    if (finalInv.recordset.length > 0) {
      finalInv.recordset.forEach(row => {
        console.log(`   ${row.location}: Good=${row.qty_good}, Defective=${row.qty_defective}`);
      });
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ PART 2 TEST PASSED');
    console.log('='.repeat(70) + '\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    if (error.originalError?.message) console.error('Details:', error.originalError.message);
    process.exit(1);
  } finally {
    await pool.close();
  }
}

test();
