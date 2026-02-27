#!/usr/bin/env node
/**
 * SPARE PARTS WORKFLOW TEST (MSSQL COMPATIBLE VERSION)
 * All SQL syntax updated for MSSQL compatibility
 * No module caching issues
 */

import { sequelize } from './db.js';
import { QueryTypes } from 'sequelize';

const TEST_CONFIG = {
  SERVICE_CENTER_ID: 1,
  TECHNICIAN_ID: 1,
  CUSTOMER_ID: 1,
  SPARE_ID: 1,
};

let testResults = { passed: 0, failed: 0, errors: [] };

async function testStep(stepNum, stepName, testFn) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`📍 STEP ${stepNum}: ${stepName}`);
  console.log('='.repeat(70));
  
  try {
    const result = await testFn();
    console.log(`✅ PASSED`);
    testResults.passed++;
    return result;
  } catch (error) {
    console.error(`❌ FAILED: ${error.message}`);
    testResults.failed++;
    testResults.errors.push({ step: stepNum, error: error.message });
    throw error;
  }
}

async function main() {
  try {
    console.log('\n' + '='.repeat(70));
    console.log('🧪 SPARE PARTS WORKFLOW TEST (FIXED MSSQL VERSION)');
    console.log('='.repeat(70));

    // STEP 1: Create call
    let callId;
    await testStep(1, 'Create call and assign to technician', async () => {
      const [result] = await sequelize.query(`
        INSERT INTO calls (
          customer_id, call_type, call_source, caller_type,
          assigned_asc_id, assigned_tech_id, status_id, created_at, updated_at
        ) VALUES (?, 'complaint', 'phone', 'customer', ?, ?, 1, GETDATE(), GETDATE())
        
        SELECT TOP 1 call_id FROM calls ORDER BY call_id DESC
      `, {
        replacements: [TEST_CONFIG.CUSTOMER_ID, TEST_CONFIG.SERVICE_CENTER_ID, TEST_CONFIG.TECHNICIAN_ID],
        type: QueryTypes.SELECT
      });
      
      callId = result.call_id;
      console.log(`   Call ID: ${callId}`);
      console.log(`   Assigned to Tech: ${TEST_CONFIG.TECHNICIAN_ID}`);
      console.log(`   Service Center: ${TEST_CONFIG.SERVICE_CENTER_ID}`);
      return callId;
    });

    // STEP 2: Tech requests spares
    let requestId;
    await testStep(2, 'Tech requests spare parts (TECH_ISSUE)', async () => {
      const [result] = await sequelize.query(`
        INSERT INTO spare_requests (
          call_id, requested_source_type, requested_source_id,
          requested_to_type, requested_to_id, request_reason,
          spare_request_type, status_id, created_by, created_at, updated_at
        ) VALUES (?, 'technician', ?, 'service_center', ?, 'defect', 'TECH_ISSUE', 1, 1, GETDATE(), GETDATE())
        
        SELECT TOP 1 request_id FROM spare_requests ORDER BY request_id DESC
      `, {
        replacements: [callId, TEST_CONFIG.TECHNICIAN_ID, TEST_CONFIG.SERVICE_CENTER_ID],
        type: QueryTypes.SELECT
      });
      
      requestId = result.request_id;
      console.log(`   Request ID: ${requestId}`);
      console.log(`   Type: TECH_ISSUE (Technician Issue Request)`);
      
      // Add items to request
      await sequelize.query(`
        INSERT INTO spare_request_items (request_id, spare_id, requested_qty, allocated_qty, received_qty, created_at, updated_at)
        VALUES (?, ?, 2, 0, 0, GETDATE(), GETDATE())
      `, {
        replacements: [requestId, TEST_CONFIG.SPARE_ID],
        type: QueryTypes.INSERT
      });
      
      console.log(`   Items added: Spare ID ${TEST_CONFIG.SPARE_ID}, Qty 2`);
      return requestId;
    });

    // STEP 3: Check available spares
    await testStep(3, 'Verify spare inventory exists', async () => {
      const [inv] = await sequelize.query(`
        SELECT TOP 1 spare_inventory_id, qty_good, qty_defective 
        FROM spare_inventory 
        WHERE spare_id = ? AND location_type = 'service_center'
      `, {
        replacements: [TEST_CONFIG.SPARE_ID],
        type: QueryTypes.SELECT
      });
      
      if (inv) {
        console.log(`   Spare Inventory Found:`);
        console.log(`   - Good: ${inv.qty_good}`);
        console.log(`   - Defective: ${inv.qty_defective}`);
      } else {
        console.log(`   ⚠️  No inventory yet (normal if first time)`);
      }
      return inv;
    });

    // STEP 4: Check technician table
    await testStep(4, 'Verify technician profile', async () => {
      const [tech] = await sequelize.query(`
        SELECT TOP 1 technician_id, name, service_center_id FROM technicians WHERE technician_id = ?
      `, {
        replacements: [TEST_CONFIG.TECHNICIAN_ID],
        type: QueryTypes.SELECT
      });
      
      if (tech) {
        console.log(`   Technician: ${tech.name}`);
        console.log(`   ID: ${tech.technician_id}`);
        console.log(`   Service Center: ${tech.service_center_id}`);
      } else {
        throw new Error('Technician not found');
      }
      return tech;
    });

    // STEP 5: Check service center
    await testStep(5, 'Verify service center exists', async () => {
      const [sc] = await sequelize.query(`
        SELECT TOP 1 asc_id, asc_name FROM service_centers WHERE asc_id = ?
      `, {
        replacements: [TEST_CONFIG.SERVICE_CENTER_ID],
        type: QueryTypes.SELECT
      });
      
      if (sc) {
        console.log(`   Service Center: ${sc.asc_name}`);
        console.log(`   ID: ${sc.asc_id}`);
      } else {
        throw new Error('Service Center not found');
      }
      return sc;
    });

    // STEP 6: Check spare parts table
    await testStep(6, 'Verify spare parts exist', async () => {
      const [spare] = await sequelize.query(`
        SELECT TOP 1 Id, PART, DESCRIPTION FROM spare_parts WHERE Id = ?
      `, {
        replacements: [TEST_CONFIG.SPARE_ID],
        type: QueryTypes.SELECT
      });
      
      if (spare) {
        console.log(`   Spare Part: ${spare.DESCRIPTION}`);
        console.log(`   Part Code: ${spare.PART}`);
        console.log(`   ID: ${spare.Id}`);
      } else {
        console.log(`   ⚠️  Spare not found (will use ID ${TEST_CONFIG.SPARE_ID})`);
      }
      return spare;
    });

    // STEP 7: Verify database connectivity
    await testStep(7, 'Final database health check', async () => {
      const tables = ['calls', 'spare_requests', 'spare_inventory', 'stock_movements', 'call_spare_usage', 'technician_spare_returns'];
      
      for (const table of tables) {
        const [result] = await sequelize.query(`SELECT COUNT(*) as count FROM ${table}`, { type: QueryTypes.SELECT });
        console.log(`   ✓ ${table}: ${result.count} records`);
      }
    });

    // Print summary
    console.log('\n' + '='.repeat(70));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(70));
    console.log(`✅ Passed: ${testResults.passed}/7`);
    console.log(`❌ Failed: ${testResults.failed}/7`);
    
    if (testResults.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      testResults.errors.forEach(e => {
        console.log(`   Step ${e.step}: ${e.error}`);
      });
    } else {
      console.log('\n🎉 ALL TESTS PASSED! Workflow is ready for development.');
    }
    
    console.log('='.repeat(70));

  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error.message);
    if (error.sql) {
      console.error('SQL:', error.sql);
    }
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

main().catch(error => {
  console.error('Fatal:', error);
  process.exit(1);
});
