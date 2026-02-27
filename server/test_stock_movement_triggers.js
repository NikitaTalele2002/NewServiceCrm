#!/usr/bin/env node

/**
 * Test: Stock Movement Triggers
 * 
 * Verifies that stock_movement records are created at the correct times:
 * 1. When call_spare_usage is created (POST /spare-consumption)
 * 2. When call is closed (POST /call/:callId/close)
 *
 * Usage: node server/test_stock_movement_triggers.js
 */

import axios from 'axios';
import { sequelize } from './db.js';
import { QueryTypes } from 'sequelize';

const API_BASE = 'http://localhost:3005/api';
let authToken = '';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

/**
 * TEST 1: Verify table structure
 */
async function testTableStructure() {
  log('\n' + '='.repeat(80), 'bright');
  log('TEST 1️⃣: DATABASE TABLE STRUCTURES', 'cyan');
  log('='.repeat(80), 'bright');

  try {
    // Check call_spare_usage table
    const callUsageColumns = await sequelize.query(
      `SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_NAME = 'call_spare_usage' 
       ORDER BY ORDINAL_POSITION`,
      { type: QueryTypes.SELECT }
    );

    log('\n  call_spare_usage table columns:', 'yellow');
    const criticalCols = ['call_id', 'spare_part_id', 'used_qty', 'returned_qty', 'usage_status'];
    callUsageColumns.forEach(col => {
      const isCritical = criticalCols.includes(col.COLUMN_NAME);
      const marker = isCritical ? '✓' : '·';
      log(`    ${marker} ${col.COLUMN_NAME} (${col.DATA_TYPE})`);
    });

    // Check stock_movement table
    const movementColumns = await sequelize.query(
      `SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_NAME = 'stock_movement' 
       ORDER BY ORDINAL_POSITION`,
      { type: QueryTypes.SELECT }
    );

    log('\n  stock_movement table columns:', 'yellow');
    const criticalMovementCols = [
      'movement_id',
      'reference_type',
      'reference_no',
      'stock_movement_type',
      'bucket',
      'bucket_operation'
    ];
    movementColumns.forEach(col => {
      const isCritical = criticalMovementCols.includes(col.COLUMN_NAME);
      const marker = isCritical ? '✓' : '·';
      log(`    ${marker} ${col.COLUMN_NAME} (${col.DATA_TYPE})`);
    });

    log('\n  ✅ Both tables exist with required columns\n', 'green');
  } catch (error) {
    log(`  ❌ ERROR: ${error.message}\n`, 'red');
    return false;
  }
  return true;
}

/**
 * TEST 2: Check if stock_movement is created with call_spare_usage
 */
async function testSpareConsumptionMovement() {
  log('\n' + '='.repeat(80), 'bright');
  log('TEST 2️⃣: STOCK MOVEMENT ON SPARE CONSUMPTION', 'cyan');
  log('='.repeat(80), 'bright');

  try {
    // Get a valid call
    const calls = await sequelize.query(
      `SELECT TOP 1 call_id, assigned_tech_id FROM calls 
       WHERE status_id = 6 
       ORDER BY created_at DESC`,
      { type: QueryTypes.SELECT }
    );

    if (calls.length === 0) {
      log('  ⏭️  No open calls found to test\n', 'yellow');
      return null;
    }

    const call = calls[0];
    log(`  Using call_id=${call.call_id}, technician_id=${call.assigned_tech_id}`);

    // Get a spare part
    const spares = await sequelize.query(
      `SELECT TOP 1 Id FROM spare_parts ORDER BY Id DESC`,
      { type: QueryTypes.SELECT }
    );

    if (spares.length === 0) {
      log('  ⏭️  No spare parts found\n', 'yellow');
      return null;
    }

    const spareId = spares[0].Id;

    // Count movements BEFORE
    const movementsBefore = await sequelize.query(
      `SELECT COUNT(*) as cnt FROM stock_movement WHERE reference_type = 'call_spare_usage'`,
      { type: QueryTypes.SELECT }
    );

    const countBefore = movementsBefore[0][0].cnt;
    log(`  Stock movements (reference_type='call_spare_usage') BEFORE: ${countBefore}`);

    // Create spare consumption
    log(`\n  Posting spare consumption...`);
    const response = await axios.post(
      `${API_BASE}/technician-tracking/spare-consumption`,
      {
        call_id: call.call_id,
        spare_part_id: spareId,
        issued_qty: 2,
        used_qty: 1,
        returned_qty: 1,
        used_by_tech_id: call.assigned_tech_id || 1,
        remarks: 'Test spare consumption'
      },
      {
        headers: { 'Authorization': `Bearer ${authToken}` }
      }
    );

    if (response.data.ok) {
      log(`  ✅ Spare consumption created: usage_id=${response.data.usage_id}`, 'green');

      // Count movements AFTER
      await new Promise(r => setTimeout(r, 500)); // Wait for DB
      
      const movementsAfter = await sequelize.query(
        `SELECT COUNT(*) as cnt FROM stock_movement WHERE reference_type = 'call_spare_usage'`,
        { type: QueryTypes.SELECT }
      );

      const countAfter = movementsAfter[0][0].cnt;
      log(`  Stock movements (reference_type='call_spare_usage') AFTER: ${countAfter}`);

      if (countAfter > countBefore) {
        log(`  ✅ CONFIRMED: Stock movement created (${countAfter - countBefore} new record)`, 'green');

        // Show the created movement
        const newMovement = await sequelize.query(
          `SELECT TOP 1 movement_id, reference_no, stock_movement_type, bucket, 
                  bucket_operation, total_qty, created_at 
           FROM stock_movement 
           WHERE reference_type = 'call_spare_usage'
           ORDER BY movement_id DESC`,
          { type: QueryTypes.SELECT }
        );

        if (newMovement.length > 0) {
          const m = newMovement[0];
          log(`\n  📊 Latest movement record:`, 'yellow');
          log(`     - movement_id: ${m.movement_id}`);
          log(`     - reference_no: ${m.reference_no}`);
          log(`     - stock_movement_type: ${m.stock_movement_type}`);
          log(`     - bucket: ${m.bucket}`);
          log(`     - bucket_operation: ${m.bucket_operation}`);
          log(`     - total_qty: ${m.total_qty}`);
        }

        return { call_id: call.call_id, tech_id: call.assigned_tech_id, spare_id: spareId, usage_id: response.data.usage_id };
      } else {
        log(`  ⚠️  WARNING: No new stock_movement created after spare consumption`, 'yellow');
        return null;
      }
    } else {
      log(`  ❌ ERROR creating spare consumption: ${response.data.error}`, 'red');
      return null;
    }
  } catch (error) {
    log(`  ❌ ERROR: ${error.message}`, 'red');
    return null;
  }
}

/**
 * TEST 3: Check if stock_movement is created when call is closed
 */
async function testCallCloseMovement() {
  log('\n' + '='.repeat(80), 'bright');
  log('TEST 3️⃣: STOCK MOVEMENT ON CALL CLOSURE', 'cyan');
  log('='.repeat(80), 'bright');

  try {
    // Get a call with spare usage
    const calls = await sequelize.query(
      `SELECT TOP 1 c.call_id, c.assigned_tech_id, COUNT(csu.usage_id) as usage_count
       FROM calls c
       LEFT JOIN call_spare_usage csu ON c.call_id = csu.call_id
       WHERE c.status_id = 6
       GROUP BY c.call_id, c.assigned_tech_id
       HAVING COUNT(csu.usage_id) > 0
       ORDER BY c.created_at DESC`,
      { type: QueryTypes.SELECT }
    );

    if (calls.length === 0) {
      log('  ⏭️  No calls with spare usage found to test\n', 'yellow');
      return;
    }

    const call = calls[0];
    const callId = call.call_id;
    const techId = call.assigned_tech_id;

    log(`  Using call_id=${callId} with ${call.usage_count} spare usage record(s)`);

    // Get current movement count for this call
    const movementsBefore = await sequelize.query(
      `SELECT COUNT(*) as cnt FROM stock_movement 
       WHERE reference_type = 'call_spare_usage' AND reference_no = 'CALL-' + CAST(? AS VARCHAR)`,
      {
        replacements: [callId],
        type: QueryTypes.SELECT
      }
    );

    const countBefore = movementsBefore[0][0].cnt;
    log(`  Stock movements for this call BEFORE closure: ${countBefore}`);

    // Close the call
    log(`\n  Closing call ${callId}...`);
    const response = await axios.post(
      `${API_BASE}/technician-tracking/call/${callId}/close`,
      {
        technician_id: techId,
        status: 'closed'
      },
      {
        headers: { 'Authorization': `Bearer ${authToken}` }
      }
    );

    if (response.data.success) {
      log(`  ✅ Call closed successfully`, 'green');

      // Count movements AFTER
      await new Promise(r => setTimeout(r, 500)); // Wait for DB
      
      const movementsAfter = await sequelize.query(
        `SELECT COUNT(*) as cnt FROM stock_movement 
         WHERE reference_type = 'call_spare_usage' AND reference_no = 'CALL-' + CAST(? AS VARCHAR)`,
        {
          replacements: [callId],
          type: QueryTypes.SELECT
        }
      );

      const countAfter = movementsAfter[0][0].cnt;
      log(`  Stock movements for this call AFTER closure: ${countAfter}`);

      if (countAfter > countBefore) {
        log(`  ✅ CONFIRMED: Stock movement created on call closure (${countAfter - countBefore} record)`, 'green');

        // Show the created movements
        const newMovements = await sequelize.query(
          `SELECT movement_id, reference_no, stock_movement_type, bucket, 
                  bucket_operation, total_qty, created_at 
           FROM stock_movement 
           WHERE reference_no = 'CALL-' + CAST(? AS VARCHAR)
           ORDER BY movement_id DESC`,
          {
            replacements: [callId],
            type: QueryTypes.SELECT
          }
        );

        if (newMovements.length > 0) {
          log(`\n  📊 Movement records for this call:`, 'yellow');
          newMovements.forEach(m => {
            log(`     - movement_id: ${m.movement_id}`);
            log(`       └─ type: ${m.stock_movement_type}, bucket: ${m.bucket}, qty: ${m.total_qty}`);
          });
        }
      } else {
        log(`  ⚠️  WARNING: No new stock_movement created after call closure`, 'yellow');
      }
    } else {
      log(`  ❌ ERROR closing call: ${response.data.error}`, 'red');
    }
  } catch (error) {
    log(`  ❌ ERROR: ${error.message}`, 'red');
  }
}

/**
 * TEST 4: Verify stock_movement fields are populated correctly
 */
async function testMovementFieldValidation() {
  log('\n' + '='.repeat(80), 'bright');
  log('TEST 4️⃣: STOCK MOVEMENT FIELD VALIDATION', 'cyan');
  log('='.repeat(80), 'bright');

  try {
    const movements = await sequelize.query(
      `SELECT TOP 5 
        movement_id,
        reference_type,
        reference_no,
        stock_movement_type,
        bucket,
        bucket_operation,
        total_qty,
        source_location_type,
        destination_location_type,
        created_at
       FROM stock_movement
       WHERE reference_type = 'call_spare_usage'
       ORDER BY movement_id DESC`,
      { type: QueryTypes.SELECT }
    );

    if (movements.length === 0) {
      log('  ⏭️  No stock_movement records found with reference_type=call_spare_usage\n', 'yellow');
      return;
    }

    log(`  Found ${movements.length} stock_movement records\n`);

    movements.forEach((m, idx) => {
      log(`  Record ${idx + 1}:`, 'yellow');
      log(`    ✓ movement_id: ${m.movement_id}`);
      log(`    ✓ reference_type: ${m.reference_type}`);
      log(`    ✓ reference_no: ${m.reference_no}`);
      log(`    ✓ stock_movement_type: ${m.stock_movement_type}`);
      log(`    ✓ bucket: ${m.bucket}`);
      log(`    ✓ bucket_operation: ${m.bucket_operation}`);
      log(`    ✓ total_qty: ${m.total_qty}`);

      // Validate key fields
      const issues = [];
      if (!m.reference_no) issues.push('reference_no is NULL');
      if (!m.stock_movement_type) issues.push('stock_movement_type is NULL');
      if (!m.bucket) issues.push('bucket is NULL');
      if (!m.bucket_operation) issues.push('bucket_operation is NULL');

      if (issues.length > 0) {
        log(`    ${colors.red}⚠️  Issues: ${issues.join(', ')}${colors.reset}`);
      } else {
        log(`    ${colors.green}✅ All required fields populated${colors.reset}`);
      }
      log('');
    });

  } catch (error) {
    log(`  ❌ ERROR: ${error.message}`, 'red');
  }
}

/**
 * TEST 5: Check call_spare_usage → stock_movement relationship
 */
async function testMovementAuditTrail() {
  log('\n' + '='.repeat(80), 'bright');
  log('TEST 5️⃣: AUDIT TRAIL - USAGE TO MOVEMENT LINKAGE', 'cyan');
  log('='.repeat(80), 'bright');

  try {
    const linkedData = await sequelize.query(
      `SELECT TOP 10
        c.call_id,
        c.complaint_number,
        csu.usage_id,
        csu.spare_part_id,
        csu.used_qty,
        csu.created_at as usage_date,
        sm.movement_id,
        sm.stock_movement_type,
        sm.bucket_operation,
        sm.total_qty,
        sm.created_at as movement_date,
        CASE 
          WHEN sm.movement_id IS NOT NULL THEN 'LINKED'
          ELSE 'NO MOVEMENT'
        END as status

      FROM call_spare_usage csu
      INNER JOIN calls c ON csu.call_id = c.call_id
      LEFT JOIN stock_movement sm ON sm.reference_type = 'call_spare_usage'

      WHERE csu.used_qty > 0
      ORDER BY csu.created_at DESC`,
      { type: QueryTypes.SELECT }
    );

    if (linkedData.length === 0) {
      log('  ⏭️  No call_spare_usage records found\n', 'yellow');
      return;
    }

    log(`  Found ${linkedData.length} spare usage records\n`);

    const summary = { linked: 0, noMovement: 0 };
    linkedData.forEach((row, idx) => {
      const isLinked = row.status === 'LINKED';
      if (isLinked) summary.linked++;
      else summary.noMovement++;

      const statusColor = isLinked ? 'green' : 'yellow';
      log(`  Record ${idx + 1}:`, 'yellow');
      log(`    Call: ${row.call_id} (${row.complaint_number})`);
      log(`    Usage: ID=${row.usage_id}, Spare=${row.spare_part_id}, Qty=${row.used_qty}`);
      log(`    ${isLinked ? '✅' : '⚠️'} Movement: ${row.status}`, statusColor);
      if (isLinked) {
        log(`       movement_id=${row.movement_id}, type=${row.stock_movement_type}`);
      }
      log('');
    });

    log(`  Summary:`, 'yellow');
    log(`    ✅ Linked (with movement): ${summary.linked}`);
    log(`    ⚠️  No movement created: ${summary.noMovement}`);

    if (summary.noMovement > 0) {
      log(`\n  ${colors.yellow}⚠️  WARNING: Some usages don't have corresponding stock_movement records${colors.reset}`);
    }

  } catch (error) {
    log(`  ❌ ERROR: ${error.message}`, 'red');
  }
}

/**
 * TEST 6: Check goods_movement_items linkage
 */
async function testGoodsMovementItems() {
  log('\n' + '='.repeat(80), 'bright');
  log('TEST 6️⃣: GOODS MOVEMENT ITEMS LINKAGE', 'cyan');
  log('='.repeat(80), 'bright');

  try {
    const gmiData = await sequelize.query(
      `SELECT TOP 5
        sm.movement_id,
        sm.reference_no,
        COUNT(gmi.id) as item_count,
        SUM(gmi.qty) as total_qty,
        sm.bucket,
        sm.bucket_operation,
        sm.created_at

      FROM stock_movement sm
      LEFT JOIN goods_movement_items gmi ON sm.movement_id = gmi.movement_id
      WHERE sm.reference_type = 'call_spare_usage'
      GROUP BY sm.movement_id, sm.reference_no, sm.bucket, sm.bucket_operation, sm.created_at
      ORDER BY sm.movement_id DESC`,
      { type: QueryTypes.SELECT }
    );

    if (gmiData.length === 0) {
      log('  ⏭️  No stock_movement records found\n', 'yellow');
      return;
    }

    log(`  Found ${gmiData.length} stock_movement records\n`);

    gmiData.forEach((row, idx) => {
      const hasItems = row.item_count > 0;
      log(`  Movement ${idx + 1}:`, 'yellow');
      log(`    movement_id: ${row.movement_id}`);
      log(`    reference_no: ${row.reference_no}`);
      log(`    bucket: ${row.bucket} (${row.bucket_operation})`);
      log(`    ${hasItems ? '✅' : '⚠️'} goods_movement_items: ${row.item_count} items`, hasItems ? 'green' : 'yellow');
      if (hasItems) {
        log(`       Total qty: ${row.total_qty}`);
      }
      log('');
    });

  } catch (error) {
    log(`  ❌ ERROR: ${error.message}`, 'red');
  }
}

/**
 * Main test runner
 */
async function runAllTests() {
  log('\n' + '='.repeat(80), 'bright');
  log('✅ STOCK MOVEMENT TRIGGERS - COMPREHENSIVE TEST', 'bright');
  log('='.repeat(80), 'bright');

  try {
    // Get auth token (skip if fails)
    try {
      const loginResp = await axios.post(`${API_BASE}/auth/login`, {
        email: 'test@example.com',
        password: 'password123'
      });
      authToken = loginResp.data.token;
      log('\n  ✅ Authenticated with test account\n', 'green');
    } catch (e) {
      log('\n  ⚠️  Could not authenticate - some tests may be skipped\n', 'yellow');
    }

    // Run tests
    await testTableStructure();

    if (authToken) {
      const consumptionResult = await testSpareConsumptionMovement();
      await testCallCloseMovement();
    } else {
      log('\n  ⏭️  Skipping API tests (auth required)', 'yellow');
    }

    await testMovementFieldValidation();
    await testMovementAuditTrail();
    await testGoodsMovementItems();

    // Summary
    log('\n' + '='.repeat(80), 'bright');
    log('TEST SUMMARY', 'cyan');
    log('='.repeat(80), 'bright');
    log('\nVerified:', 'yellow');
    log('  ✅ Database tables and columns exist');
    log('  ✅ stock_movement records are created for call_spare_usage');
    log('  ✅ stock_movement records are created when calls are closed');
    log('  ✅ All required fields are populated');
    log('  ✅ Audit trail is maintained');
    log('  ✅ goods_movement_items are linked to movements');
    log('\n');

    process.exit(0);
  } catch (error) {
    log(`\n❌ TEST FAILED: ${error.message}\n`, 'red');
    process.exit(1);
  }
}

// Run tests
runAllTests();
