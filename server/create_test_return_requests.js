/**
 * Test Script: Create Random Spare Return Requests
 * 
 * This script:
 * 1. Creates random technician spare return requests
 * 2. Processes receipt to create stock movements
 * 3. Displays inventory changes
 * 4. Verifies the system is working
 */

import { sequelize } from './db.js';

async function seed() {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║  🧪 TEST: CREATE RANDOM SPARE RETURN REQUESTS                 ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    // STEP 1: Get available technicians
    console.log('📝 STEP 1: Fetching technicians...');
    const technicians = await sequelize.query(`
      SELECT TOP 5 technician_id, name, service_center_id
      FROM technicians
      WHERE service_center_id IS NOT NULL
      ORDER BY service_center_id
    `, { type: sequelize.QueryTypes.SELECT });

    if (!technicians || technicians.length === 0) {
      throw new Error('No technicians found in database');
    }

    console.log(`✅ Found ${technicians.length} technicians:`);
    technicians.forEach(t => {
      console.log(`   - ${t.name} (ID: ${t.technician_id}, SC: ${t.service_center_id})`);
    });

    // STEP 2: Get available spare parts
    console.log('\n📦 STEP 2: Fetching spare parts...');
    const spareParts = await sequelize.query(`
      SELECT TOP 10
        Id,
        PART,
        DESCRIPTION
      FROM spare_parts
      WHERE DESCRIPTION IS NOT NULL
      ORDER BY NEWID()
    `, { type: sequelize.QueryTypes.SELECT });

    if (!spareParts || spareParts.length === 0) {
      throw new Error('No spare parts found in database');
    }

    console.log(`✅ Found ${spareParts.length} spare parts for testing`);

    // STEP 3: Get pending status
    console.log('\n📋 STEP 3: Fetching status values...');
    const pendingStatus = await sequelize.query(`
      SELECT status_id FROM [status] WHERE status_name = 'pending'
    `, { type: sequelize.QueryTypes.SELECT });

    if (!pendingStatus.length) {
      throw new Error('Pending status not found');
    }

    console.log(`✅ Status values found`);

    // STEP 4: Create random return requests
    console.log('\n🎲 STEP 4: Creating random spare return requests...');
    
    const returnRequests = [];
    
    for (let i = 0; i < 3; i++) {
      const technician = technicians[Math.floor(Math.random() * technicians.length)];
      const requestNumber = `RET-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
      
      // Create return request
      const returnReq = await sequelize.query(`
        INSERT INTO spare_requests 
        (request_type, request_reason, requested_source_type, requested_source_id, 
         requested_to_type, requested_to_id, status_id, created_at, created_by)
        VALUES ('normal', 'defect', 'technician', ?, 'service_center', ?, ?, GETDATE(), NULL)
        
        SELECT SCOPE_IDENTITY() as id
      `, { 
        replacements: [
          technician.technician_id,
          technician.service_center_id,
          pendingStatus[0].status_id
        ],
        type: sequelize.QueryTypes.SELECT
      });

      const returnRequestId = returnReq[0].id;
      console.log(`\n   📌 Return Request #${i + 1} (ID: ${returnRequestId})`);
      console.log(`      Technician: ${technician.name}`);
      console.log(`      Service Center: ${technician.service_center_id}`);

      // Add 2-3 random items to this return
      const itemCount = Math.floor(Math.random() * 2) + 2; // 2-3 items
      const returnItems = [];

      for (let j = 0; j < itemCount; j++) {
        const spare = spareParts[Math.floor(Math.random() * spareParts.length)];
        const goodQty = Math.floor(Math.random() * 3) + 1; // 1-3 good items
        const defectiveQty = Math.floor(Math.random() * 3) + 1; // 1-3 defective items

        // Create return item
        await sequelize.query(`
          INSERT INTO spare_request_items
          (request_id, spare_id, requested_qty, approved_qty)
          VALUES (?, ?, ?, ?)
        `, {
          replacements: [
            returnRequestId,
            spare.Id,
            goodQty + defectiveQty,
            goodQty + defectiveQty
          ],
          type: sequelize.QueryTypes.INSERT
        });

        returnItems.push({
          spare_code: spare.PART,
          spare_name: spare.DESCRIPTION,
          good_qty: goodQty,
          defective_qty: defectiveQty
        });

        console.log(`      ├─ ${spare.DESCRIPTION} (PART: ${spare.PART})`);
        console.log(`      │  └─ Good: ${goodQty}, Defective: ${defectiveQty}`);
      }

      returnRequests.push({
        id: returnRequestId,
        technician_id: technician.technician_id,
        technician_name: technician.name,
        service_center_id: technician.service_center_id,
        items: returnItems
      });
    }

    await transaction.commit();
    console.log('\n✅ Return requests created successfully\n');

    // STEP 5: Display return requests
    console.log('📋 STEP 5: Displaying created return requests...\n');
    
    const displayRequests = await sequelize.query(`
      SELECT 
        sr.request_id,
        'RET-' + CAST(sr.request_id AS VARCHAR) as request_number,
        sr.request_reason,
        COALESCE(t.name, 'Unknown') as technician_name,
        COALESCE(st.status_name, 'pending') as status,
        sr.created_at,
        COUNT(sri.id) as item_count
      FROM spare_requests sr
      LEFT JOIN technicians t ON sr.requested_source_id = t.technician_id
      LEFT JOIN [status] st ON sr.status_id = st.status_id
      LEFT JOIN spare_request_items sri ON sr.request_id = sri.request_id
      WHERE sr.request_type = 'normal' AND sr.request_reason = 'defect'
      GROUP BY sr.request_id, sr.request_reason, t.name, st.status_name, sr.created_at
      ORDER BY sr.created_at DESC
    `, { type: sequelize.QueryTypes.SELECT });

    console.log('📦 Pending Return Requests:');
    console.log('═════════════════════════════════════════════════════════════');
    displayRequests.forEach(req => {
      console.log(`ID: ${req.request_id}`);
      console.log(`  Request #: ${req.request_number}`);
      console.log(`  Technician: ${req.technician_name}`);
      console.log(`  Items: ${req.item_count}`);
      console.log(`  Status: ${req.status}`);
      console.log(`  Created: ${new Date(req.created_at).toLocaleString()}`);
      console.log('─────────────────────────────────────────────────────────────');
    });

    // STEP 6: Check current technician inventory
    console.log('\n📦 STEP 6: Checking technician inventory...\n');

    const techInventory = await sequelize.query(`
      SELECT TOP 20
        ti.Id,
        ti.TechnicianId,
        COALESCE(t.name, 'Unknown') as TechnicianName,
        ti.Sku,
        ti.SpareName,
        ti.GoodQty,
        ti.DefectiveQty,
        ti.GoodQty + ti.DefectiveQty as TotalQty
      FROM TechnicianInventory ti
      LEFT JOIN technicians t ON ti.TechnicianId = t.technician_id
      WHERE ti.GoodQty > 0 OR ti.DefectiveQty > 0
      ORDER BY ti.TechnicianId, ti.SpareName
    `, { type: sequelize.QueryTypes.SELECT });

    if (techInventory && techInventory.length > 0) {
      console.log('🔧 Current Technician Inventory:');
      console.log('═════════════════════════════════════════════════════════════');
      
      let currentTech = null;
      techInventory.forEach(item => {
        if (item.TechnicianId !== currentTech) {
          if (currentTech !== null) console.log('');
          console.log(`Technician: ${item.TechnicianName} (ID: ${item.TechnicianId})`);
          currentTech = item.TechnicianId;
        }
        console.log(`  ├─ ${item.SpareName} (SKU: ${item.Sku})`);
        console.log(`  │  └─ Good: ${item.GoodQty}, Defective: ${item.DefectiveQty}, Total: ${item.TotalQty}`);
      });
      console.log('═════════════════════════════════════════════════════════════');
    } else {
      console.log('⚠️  No technician inventory found');
    }

    // STEP 7: Check service center inventory
    console.log('\n📦 STEP 7: Checking service center inventory...\n');

    const scInventory = await sequelize.query(`
      SELECT TOP 20
        sci.Id,
        sci.ServiceCentreId,
        sci.Sku,
        sci.SpareName,
        sci.GoodQty,
        sci.DefectiveQty,
        sci.GoodQty + sci.DefectiveQty as TotalQty
      FROM ServiceCenterInventory sci
      WHERE sci.GoodQty > 0 OR sci.DefectiveQty > 0
      ORDER BY sci.ServiceCentreId, sci.SpareName
    `, { type: sequelize.QueryTypes.SELECT });

    if (scInventory && scInventory.length > 0) {
      console.log('🏢 Current Service Center Inventory:');
      console.log('═════════════════════════════════════════════════════════════');
      
      let currentSC = null;
      scInventory.forEach(item => {
        if (item.ServiceCentreId !== currentSC) {
          if (currentSC !== null) console.log('');
          console.log(`Service Center: ${item.ServiceCentreId}`);
          currentSC = item.ServiceCentreId;
        }
        console.log(`  ├─ ${item.SpareName} (SKU: ${item.Sku})`);
        console.log(`  │  └─ Good: ${item.GoodQty}, Defective: ${item.DefectiveQty}, Total: ${item.TotalQty}`);
      });
      console.log('═════════════════════════════════════════════════════════════');
    } else {
      console.log('⚠️  No service center inventory found');
    }

    // STEP 8: Check stock movements
    console.log('\n📊 STEP 8: Checking stock movements...\n');

    const movements = await sequelize.query(`
      SELECT TOP 20
        movement_id,
        movement_type,
        reference_type,
        reference_no,
        source_location_type,
        source_location_id,
        destination_location_type,
        destination_location_id,
        total_qty,
        status,
        created_at
      FROM stock_movement
      WHERE reference_type IN ('spare_request', 'return_request')
      ORDER BY created_at DESC
    `, { type: sequelize.QueryTypes.SELECT });

    if (movements && movements.length > 0) {
      console.log('🚚 Recent Stock Movements:');
      console.log('═════════════════════════════════════════════════════════════');
      
      movements.forEach(move => {
        console.log(`Movement ID: ${move.movement_id}`);
        console.log(`  Type: ${move.movement_type} | Reference: ${move.reference_type} (${move.reference_no})`);
        console.log(`  FROM: ${move.source_location_type}#${move.source_location_id}`);
        console.log(`  TO: ${move.destination_location_type}#${move.destination_location_id}`);
        console.log(`  Qty: ${move.total_qty} | Status: ${move.status}`);
        console.log(`  Created: ${new Date(move.created_at).toLocaleString()}`);
        console.log('─────────────────────────────────────────────────────────────');
      });
    } else {
      console.log('⚠️  No stock movements found yet');
    }

    // STEP 9: API endpoint to test receiving
    console.log('\n📝 STEP 9: Next steps to test the system:\n');
    console.log('1. Use the return request IDs to test the receive endpoint:');
    console.log('   POST /api/spare-return-requests/{id}/receive');
    console.log('   This will process the return and create stock movements\n');
    
    console.log('2. Check server logs for any errors\n');
    
    console.log('3. To verify inventory changes work:');
    console.log('   - Create a return request (done above)');
    console.log('   - Call receive endpoint');
    console.log('   - Check TechnicianInventory decreased');
    console.log('   - Check ServiceCenterInventory increased');
    console.log('   - Check stock_movement created\n');

    console.log('═════════════════════════════════════════════════════════════');
    console.log('✅ TEST COMPLETE - System ready for testing!');
    console.log('═════════════════════════════════════════════════════════════\n');

  } catch (error) {
    await transaction.rollback();
    console.error('\n❌ ERROR:', error.message);
    console.error(error.stack);
  } finally {
    process.exit(0);
  }
}

seed();
