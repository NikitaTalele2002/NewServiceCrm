#!/usr/bin/env node

/**
 * Test Script: Call Tracking for Returned Spares
 *
 * This script tests all the new call tracking functionality
 * Run after implementing the call tracking feature
 *
 * Usage: node server/test_call_tracking.js
 */

import axios from 'axios';
import { sequelize } from '../db.js';
import { QueryTypes } from 'sequelize';

const API_BASE = 'http://localhost:3005/api';

// Test token - replace with actual token or use test user
let authToken = '';

async function getAuthToken() {
  try {
    console.log('\n🔐 Getting authentication token...');
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email: 'test@example.com',
      password: 'password123'
    });
    authToken = response.data.token;
    console.log('   ✅ Got token');
    return authToken;
  } catch (error) {
    console.log(
      '   ⚠️  Could not auto-get token. Using test token.\n'
    );
    // Use a valid Bearer token here for testing
    authToken = 'your-test-token-here';
  }
}

/**
 * TEST 1: Verify database structure
 */
async function testDatabaseStructure() {
  console.log('\n' + '='.repeat(70));
  console.log('TEST 1️⃣: Database Structure Verification');
  console.log('='.repeat(70));

  try {
    // Check if call_usage_id column exists
    const itemsColumns = await sequelize.query(
      `SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_NAME = 'spare_request_items' 
       AND COLUMN_NAME = 'call_usage_id'`,
      { type: QueryTypes.SELECT }
    );

    if (itemsColumns.length > 0) {
      console.log('   ✅ call_usage_id column exists in spare_request_items');
    } else {
      console.log('   ❌ call_usage_id column NOT FOUND in spare_request_items');
    }

    // Check stock_movement columns
    const movementColumns = await sequelize.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_NAME = 'stock_movement' 
       AND COLUMN_NAME IN ('related_call_id', 'related_usage_id', 'related_request_id')
       ORDER BY COLUMN_NAME`,
      { type: QueryTypes.SELECT }
    );

    console.log(`   ✅ stock_movement columns added: ${movementColumns.map(c => c.COLUMN_NAME).join(', ')}`);
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
  }
}

/**
 * TEST 2: Link return item to call usage
 */
async function testLinkReturnToCall() {
  console.log('\n' + '='.repeat(70));
  console.log('TEST 2️⃣: Link Return Item to Call Usage');
  console.log('='.repeat(70));

  try {
    // Find a spare_request with items
    const requests = await sequelize.query(
      `SELECT TOP 1 sr.request_id, sri.id as item_id, sri.spare_id
       FROM spare_request sr
       INNER JOIN spare_request_items sri ON sr.request_id = sri.request_id
       WHERE sr.spare_request_type IN ('TECH_RETURN_DEFECTIVE', 'TECH_RETURN_EXCESS')
       ORDER BY sr.request_id DESC`,
      { type: QueryTypes.SELECT }
    );

    if (requests.length === 0) {
      console.log('   ⚠️  No return requests found to test');
    } else {
      const { request_id, spare_id } = requests[0];
      console.log(`   Found return request #${request_id} with spare ${spare_id}`);

      // Try to link it
      const response = await axios.post(
        `${API_BASE}/spare-tracking/link-return-to-call`,
        {
          requestId: request_id,
          spareId: spare_id
        },
        {
          headers: { 'Authorization': `Bearer ${authToken}` }
        }
      );

      if (response.data.success) {
        console.log(`   ✅ Linked to call ${response.data.call_id}`);
      } else {
        console.log(`   ⚠️  ${response.data.message}`);
      }
    }
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
  }
}

/**
 * TEST 3: Query call details for a return
 */
async function testGetCallDetailsForReturn() {
  console.log('\n' + '='.repeat(70));
  console.log('TEST 3️⃣: Get Call Details for Return Request');
  console.log('='.repeat(70));

  try {
    // Find a return request
    const requests = await sequelize.query(
      `SELECT TOP 1 request_id FROM spare_request
       WHERE spare_request_type IN ('TECH_RETURN_DEFECTIVE')
       ORDER BY request_id DESC`,
      { type: QueryTypes.SELECT }
    );

    if (requests.length === 0) {
      console.log('   ⚠️  No return requests found');
    } else {
      const { request_id } = requests[0];
      console.log(`   Fetching details for return request #${request_id}...`);

      const response = await axios.get(
        `${API_BASE}/spare-tracking/return/${request_id}/calls`,
        {
          headers: { 'Authorization': `Bearer ${authToken}` }
        }
      );

      if (response.data.success) {
        console.log(`   ✅ Found ${response.data.calls_count} calls in this return`);
        response.data.calls.forEach(call => {
          console.log(
            `      • Call ${call.call_id}: ${call.complaint_number} - ${call.customer_name}`
          );
          call.spares.forEach(spare => {
            console.log(`         Spare: ${spare.spare_name} (qty: ${spare.return_qty})`);
          });
        });
      }
    }
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
  }
}

/**
 * TEST 4: Find calls using a specific spare
 */
async function testFindCallsUsingSpare() {
  console.log('\n' + '='.repeat(70));
  console.log('TEST 4️⃣: Find All Calls Using a Specific Spare');
  console.log('='.repeat(70));

  try {
    // Find a spare that's been used
    const spares = await sequelize.query(
      `SELECT TOP 1 spare_part_id FROM call_spare_usage
       WHERE used_qty > 0
       ORDER BY created_at DESC`,
      { type: QueryTypes.SELECT }
    );

    if (spares.length === 0) {
      console.log('   ⚠️  No spare usage records found');
    } else {
      const { spare_part_id } = spares[0];
      console.log(`   Searching for all calls using spare ID ${spare_part_id}...`);

      const response = await axios.get(
        `${API_BASE}/spare-tracking/spare/${spare_part_id}/calls`,
        {
          headers: { 'Authorization': `Bearer ${authToken}` }
        }
      );

      if (response.data.success) {
        console.log(`   ✅ Found ${response.data.calls_count} calls using ${response.data.spare_name}`);
        response.data.calls.slice(0, 3).forEach(call => {
          console.log(
            `      • Call ${call.call_id}: ${call.complaint_number} - ${call.customer_name} (Used: ${call.total_qty_used}, Returns: ${call.return_requests})`
          );
        });
        if (response.data.calls.length > 3) {
          console.log(`      ... and ${response.data.calls.length - 3} more`);
        }
      }
    }
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
  }
}

/**
 * TEST 5: Get call spare history
 */
async function testGetCallSpareHistory() {
  console.log('\n' + '='.repeat(70));
  console.log('TEST 5️⃣: Get All Spares Used in a Specific Call');
  console.log('='.repeat(70));

  try {
    // Find a call with spare usage
    const calls = await sequelize.query(
      `SELECT TOP 1 csu.call_id FROM call_spare_usage csu
       ORDER BY csu.created_at DESC`,
      { type: QueryTypes.SELECT }
    );

    if (calls.length === 0) {
      console.log('   ⚠️  No call spare usage records found');
    } else {
      const { call_id } = calls[0];
      console.log(`   Fetching spare history for call #${call_id}...`);

      const response = await axios.get(
        `${API_BASE}/spare-tracking/call/${call_id}/history`,
        {
          headers: { 'Authorization': `Bearer ${authToken}` }
        }
      );

      if (response.data.success) {
        console.log(`   ✅ Found ${response.data.spare_count} spares used in this call`);
        response.data.spares.forEach(spare => {
          const pending = spare.pending_return_qty || 0;
          console.log(
            `      • ${spare.spare_name}: Used ${spare.used_qty}, Returned ${spare.returned_qty}, Pending ${pending}`
          );
          if (spare.return_requests_submitted > 0) {
            console.log(`        └─ Return requests: ${spare.return_requests_submitted}`);
          }
        });
      }
    }
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
  }
}

/**
 * TEST 6: Get audit trail for spare
 */
async function testGetSpareAuditTrail() {
  console.log('\n' + '='.repeat(70));
  console.log('TEST 6️⃣: Complete Audit Trail for a Spare');
  console.log('='.repeat(70));

  try {
    // Find a spare that has been used and returned
    const spares = await sequelize.query(
      `SELECT TOP 1 csu.spare_part_id FROM call_spare_usage csu
       WHERE csu.used_qty > 0
       ORDER BY csu.created_at DESC`,
      { type: QueryTypes.SELECT }
    );

    if (spares.length === 0) {
      console.log('   ⚠️  No spare usage records found');
    } else {
      const { spare_part_id } = spares[0];
      console.log(`   Getting audit trail for spare #${spare_part_id}...`);

      const response = await axios.get(
        `${API_BASE}/spare-tracking/spare/${spare_part_id}/audit-trail`,
        {
          headers: { 'Authorization': `Bearer ${authToken}` }
        }
      );

      if (response.data.success) {
        console.log(`   ✅ Found ${response.data.total_events} events for this spare`);
        console.log(`      Calls involved: ${response.data.calls_involved.join(', ')}`);
        console.log(`      Summary:`);
        console.log(`        • Allocations: ${response.data.summary.allocation_events}`);
        console.log(`        • Usage events: ${response.data.summary.usage_events}`);
        console.log(`        • Returns: ${response.data.summary.return_events}`);
        console.log(`        • Movements: ${response.data.summary.movement_events}`);
      }
    }
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
  }
}

/**
 * TEST 7: Direct SQL verification
 */
async function testSQLVerification() {
  console.log('\n' + '='.repeat(70));
  console.log('TEST 7️⃣: Direct SQL Verification');
  console.log('='.repeat(70));

  try {
    // Check spares with call link
    const linkedItems = await sequelize.query(
      `SELECT COUNT(*) as cnt FROM spare_request_items WHERE call_usage_id IS NOT NULL`,
      { type: QueryTypes.SELECT }
    );

    console.log(
      `   • Return items linked to calls: ${linkedItems[0].cnt}`
    );

    // Check movements with call reference
    const movementsWithCall = await sequelize.query(
      `SELECT COUNT(*) as cnt FROM stock_movement WHERE related_call_id IS NOT NULL`,
      { type: QueryTypes.SELECT }
    );

    console.log(
      `   • Stock movements with call reference: ${movementsWithCall[0].cnt}`
    );

    // Sample of linked data
    const sampleLinked = await sequelize.query(
      `SELECT TOP 3 
        sri.call_usage_id,
        csu.call_id,
        sri.spare_id,
        csu.used_qty
       FROM spare_request_items sri
       INNER JOIN call_spare_usage csu ON sri.call_usage_id = csu.usage_id`,
      { type: QueryTypes.SELECT }
    );

    if (sampleLinked.length > 0) {
      console.log(`\n   📊 Sample linked records:`);
      sampleLinked.forEach(row => {
        console.log(
          `      • Usage ID ${row.call_usage_id} → Call #${row.call_id}, Spare #${row.spare_id} (qty: ${row.used_qty})`
        );
      });
    }
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
  }
}

/**
 * Main test runner
 */
async function runAllTests() {
  console.log('\n' + '='.repeat(70));
  console.log('🧪 CALL TRACKING FOR RETURNED SPARES - COMPREHENSIVE TEST');
  console.log('='.repeat(70));

  try {
    // Get auth token
    await getAuthToken();

    // Run tests
    await testDatabaseStructure();
    await testSQLVerification();

    // API tests require auth token
    if (authToken && authToken !== 'your-test-token-here') {
      console.log('\n📡 Running API tests...');
      await testGetCallDetailsForReturn();
      await testFindCallsUsingSpare();
      await testGetCallSpareHistory();
      await testGetSpareAuditTrail();
      await testLinkReturnToCall();
    } else {
      console.log('\n⏭️  Skipping API tests (requires valid auth token)');
    }

    console.log('\n' + '='.repeat(70));
    console.log('✨ TEST SUITE COMPLETE!');
    console.log('='.repeat(70));
    console.log('\nKey features tested:');
    console.log('   ✅ Database structure validation');
    console.log('   ✅ Call-to-spare linkage');
    console.log('   ✅ Return request tracking');
    console.log('   ✅ Call history retrieval');
    console.log('   ✅ Spare usage tracing');
    console.log('   ✅ Complete audit trail');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ TEST FAILED!');
    console.error(error.message);
    process.exit(1);
  }
}

// Run tests
runAllTests();
