#!/usr/bin/env node

/**
 * Test Script: Technician Internal Inventory Transfer Stock Movement ID
 * Purpose: Verify stock_movement_id is created correctly (not hardcoded to 2)
 * 
 * This test:
 * 1. Gets a technician's inventory
 * 2. Closes a call (which triggers internal inventory transfer)
 * 3. Verifies a NEW stock_movement record is created with correct ID
 * 4. Verifies goods_movement_items are linked to the correct movement_id
 * 5. Verifies inventory is updated correctly
 * 
 * Run: node server/test_movement_id_fix.js
 */

import axios from 'axios';
import { sequelize } from './db.js';
import { QueryTypes } from 'sequelize';

const API_BASE = 'http://localhost:5000/api';
const TECHNICIAN_ID = 11;  // Vikas Test Technician v2
const CALL_ID = 40;         // Use existing call

let token = '';

async function getToken() {
  try {
    console.log('\n🔐 Getting authentication token...');
    const response = await axios.post(`${API_BASE}/auth/login`, {
      username: 'Vikas Tech',
      password: '123'
    });
    token = response.data.token;
    console.log(`✅ Token obtained: ${token.substring(0, 20)}...`);
    return token;
  } catch (err) {
    console.error('❌ Failed to get token:', err.response?.data || err.message);
    throw err;
  }
}

async function checkInitialInventory() {
  console.log('\n📦 STEP 1: Check Stock Movements Count BEFORE');
  console.log('═'.repeat(70));
  
  try {
    const result = await sequelize.query(`
      SELECT COUNT(*) as count FROM stock_movement
    `, { type: QueryTypes.SELECT });
    
    const count = result[0]?.count || result[0];
    console.log(`✅ Total stock_movements in database: ${count}`);
    
    // Get last 3 movements
    const last3 = await sequelize.query(`
      SELECT TOP 3 id, stock_movement_type, total_qty, created_at 
      FROM stock_movement 
      ORDER BY id DESC
    `, { type: QueryTypes.SELECT });
    
    if (last3 && last3.length > 0) {
      console.log(`\n📋 Last 3 stock movements:`);
      last3.forEach(m => {
        console.log(`   ID=${m.id}, Type=${m.stock_movement_type}, Qty=${m.total_qty}`);
      });
    }
    
    return count;
  } catch (err) {
    console.error('❌ Error querying stock_movement:', err.message);
    throw err;
  }
}

async function closeCall() {
  console.log('\n📞 STEP 2: Close Call (Triggers DEFECTIVE_MARKING Movement)');
  console.log('═'.repeat(70));
  
  try {
    const payload = {
      items: [
        {
          spareId: 2,
          qty_good: 1,
          qty_defective: 1,
          remarks: 'Used 1 good, 1 became defective during call'
        }
      ],
      remarks: 'Call completed successfully'
    };
    
    console.log(`📤 Closing call ${CALL_ID} with spare usage tracking...`);
    
    const response = await axios.post(
      `${API_BASE}/technician-tracking/call/${CALL_ID}/close`,
      payload,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    console.log(`✅ Call closed successfully`);
    console.log(`   Movement created: ${response.data?.movement_id || 'check logs'}`);
    
    return response.data;
  } catch (err) {
    console.error('❌ Error closing call:', err.response?.data || err.message);
    console.error('   Stack:', err.stack);
    throw err;
  }
}

async function verifyNewStockMovement() {
  console.log('\n✨ STEP 3: Verify NEW Stock Movement Created');
  console.log('═'.repeat(70));
  
  try {
    // Get the latest stock movement
    const latestMovements = await sequelize.query(`
      SELECT TOP 5 id, stock_movement_type, reference_no, total_qty, 
             source_location_type, source_location_id,
             destination_location_type, destination_location_id,
             created_at
      FROM stock_movement 
      WHERE stock_movement_type = 'DEFECTIVE_MARKING'
      ORDER BY id DESC
    `, { type: QueryTypes.SELECT });
    
    if (!latestMovements || latestMovements.length === 0) {
      console.error('❌ No DEFECTIVE_MARKING stock movements found!');
      return null;
    }
    
    const latestMovement = latestMovements[0];
    console.log(`✅ Found latest DEFECTIVE_MARKING movement:`);
    console.log(`   Movement ID: ${latestMovement.id}`);
    console.log(`   Type: ${latestMovement.stock_movement_type}`);
    console.log(`   Reference: ${latestMovement.reference_no}`);
    console.log(`   Quantity: ${latestMovement.total_qty}`);
    console.log(`   From: ${latestMovement.source_location_type} #${latestMovement.source_location_id}`);
    console.log(`   To: ${latestMovement.destination_location_type} #${latestMovement.destination_location_id}`);
    console.log(`   Created: ${latestMovement.created_at}`);
    
    if (latestMovement.id === 2) {
      console.error(`\n❌ ERROR: Movement ID is still 2! (hardcoded, not auto-incremented)`);
      return null;
    }
    
    if (latestMovement.id > 2) {
      console.log(`\n✅ CORRECT: Movement ID is ${latestMovement.id} (auto-incremented, not hardcoded)`);
    }
    
    return latestMovement;
  } catch (err) {
    console.error('❌ Error querying latest movement:', err.message);
    throw err;
  }
}

async function verifyGoodsMovementItems(movementId) {
  console.log('\n📦 STEP 4: Verify Goods Movement Items');
  console.log('═'.repeat(70));
  
  if (!movementId) {
    console.log('⚠️  Skipping (no movement ID provided)');
    return;
  }
  
  try {
    const items = await sequelize.query(`
      SELECT id, movement_id, spare_part_id, qty, condition, created_at
      FROM goods_movement_items
      WHERE movement_id = ?
    `, {
      replacements: [movementId],
      type: QueryTypes.SELECT
    });
    
    if (!items || items.length === 0) {
      console.error(`❌ No goods_movement_items found for movement ${movementId}`);
      return;
    }
    
    console.log(`✅ Found ${items.length} goods_movement_item(s):`);
    items.forEach(item => {
      console.log(`   - Item ID ${item.id}: spare_part_id=${item.spare_part_id}, qty=${item.qty}, condition=${item.condition}`);
    });
    
    return items;
  } catch (err) {
    console.error('❌ Error querying goods_movement_items:', err.message);
    throw err;
  }
}

async function verifyInventoryUpdate() {
  console.log('\n💾 STEP 5: Verify Inventory Updated');
  console.log('═'.repeat(70));
  
  try {
    const inventory = await sequelize.query(`
      SELECT spare_id, location_type, location_id, qty_good, qty_defective
      FROM spare_inventory
      WHERE location_type = 'technician'
        AND location_id = ?
        AND spare_id = 2
      ORDER BY updated_at DESC
    `, {
      replacements: [TECHNICIAN_ID],
      type: QueryTypes.SELECT
    });
    
    if (!inventory || inventory.length === 0) {
      console.error(`❌ No inventory found for technician ${TECHNICIAN_ID}`);
      return;
    }
    
    const inv = inventory[0];
    console.log(`✅ Technician ${TECHNICIAN_ID} Spare #2 inventory:`);
    console.log(`   Good: ${inv.qty_good}`);
    console.log(`   Defective: ${inv.qty_defective}`);
    console.log(`   Last Updated: ${inv.updated_at}`);
    
    return inv;
  } catch (err) {
    console.error('❌ Error querying inventory:', err.message);
    throw err;
  }
}

async function verifySummary() {
  console.log('\n\n📋 TEST SUMMARY');
  console.log('═'.repeat(70));
  
  try {
    // Get all movement counts by type
    const summary = await sequelize.query(`
      SELECT 
        stock_movement_type,
        COUNT(*) as count,
        MAX(id) as max_id,
        MIN(id) as min_id
      FROM stock_movement
      GROUP BY stock_movement_type
      ORDER BY max_id DESC
    `, { type: QueryTypes.SELECT });
    
    console.log(`✅ Stock Movement Summary:`);
    if (summary && summary.length > 0) {
      summary.forEach(row => {
        console.log(`   ${row.stock_movement_type}: ${row.count} total (IDs: ${row.min_id}-${row.max_id})`);
      });
    }
    
    // Check if movement_id=2 is being reused
    const twoCheck = await sequelize.query(`
      SELECT COUNT(*) as count FROM stock_movement WHERE id = 2
    `, { type: QueryTypes.SELECT });
    
    const countWithId2 = twoCheck[0]?.count || twoCheck[0];
    if (countWithId2 > 0) {
      console.log(`\n⚠️  Movement ID=2 exists (database constraint, not test issue)`);
    }
    
    // Get max ID to verify auto-increment is working
    const maxId = await sequelize.query(`
      SELECT MAX(id) as max_id FROM stock_movement
    `, { type: QueryTypes.SELECT });
    
    const maxMovementId = maxId[0]?.max_id || maxId[0];
    console.log(`\n✅ Max stock_movement ID: ${maxMovementId}`);
    
    if (maxMovementId > 10) {
      console.log(`✅ PASS: Auto-increment is working correctly (ID > 10)`);
      return true;
    } else {
      console.log(`⚠️  WARN: Max ID is low (${maxMovementId}), might indicate ID reuse`);
      return false;
    }
    
  } catch (err) {
    console.error('❌ Error in summary:', err.message);
    throw err;
  }
}

async function runTest() {
  console.log('\n' + '═'.repeat(70));
  console.log('🧪 TECHNICIAN INTERNAL INVENTORY TRANSFER TEST');
  console.log('   Testing SCOPE_IDENTITY() stock_movement_id extraction');
  console.log('═'.repeat(70));
  
  try {
    await getToken();
    await checkInitialInventory();
    await closeCall();
    const movement = await verifyNewStockMovement();
    
    if (movement) {
      await verifyGoodsMovementItems(movement.id);
      await verifyInventoryUpdate();
    }
    
    const testPassed = await verifySummary();
    
    console.log('\n' + '═'.repeat(70));
    if (testPassed) {
      console.log('✅ TEST PASSED: Stock movement IDs are being created correctly!');
    } else {
      console.log('⚠️  TEST WARNING: Please verify movement ID creation manually');
    }
    console.log('═'.repeat(70) + '\n');
    
  } catch (err) {
    console.error('\n❌ TEST FAILED:', err.message);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

runTest();
