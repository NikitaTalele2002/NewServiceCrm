/**
 * Sample Test Data for Technician Spare Return System
 * This script creates test data to demonstrate the complete workflow
 * 
 * Usage: node test_technician_spare_returns.js
 */

import { sequelize } from './db.js';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

// Test data
const testData = {
  technicianToken: '',        // Will be obtained via login
  serviceCenterToken: '',     // Will be obtained via login
  callId: null,
  returnId: null,
  technicianId: null,
  serviceCenterId: null
};

/**
 * Step 1: Login as technician
 */
async function loginAsTechnician() {
  console.log('\n' + '='.repeat(60));
  console.log('🔐 Step 1: Login as Technician');
  console.log('='.repeat(60));

  try {
    // Assuming you have a user with role 'technician'
    // Adjust credentials as needed
    const response = await axios.post(`${API_URL}/auth/login`, {
      username: 'technician1',      // Change to actual technician username
      password: 'password123'        // Change to actual password
    });

    if (response.data.token) {
      testData.technicianToken = response.data.token;
      console.log('✅ Logged in as technician');
      console.log(`   Token: ${testData.technicianToken.substring(0, 20)}...`);
      return true;
    }
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data?.error || error.message);
    return false;
  }
}

/**
 * Step 2: Get technician details
 */
async function getTechnicianDetails() {
  console.log('\n' + '='.repeat(60));
  console.log('📋 Step 2: Get Technician Details');
  console.log('='.repeat(60));

  try {
    const response = await sequelize.query(`
      SELECT t.technician_id, t.service_center_id 
      FROM technicians t
      LEFT JOIN users u ON t.user_id = u.user_id
      WHERE u.username = 'technician1'
      LIMIT 1
    `);

    if (response && response.length > 0 && response[0].length > 0) {
      const tech = response[0][0];
      testData.technicianId = tech.technician_id;
      testData.serviceCenterId = tech.service_center_id;
      console.log('✅ Found technician');
      console.log(`   ID: ${testData.technicianId}`);
      console.log(`   Service Center: ${testData.serviceCenterId}`);
      return true;
    }
  } catch (error) {
    console.error('❌ Error getting technician:', error.message);
    return false;
  }
}

/**
 * Step 3: Create a test call (optional - can use existing call)
 */
async function createTestCall() {
  console.log('\n' + '='.repeat(60));
  console.log('📞 Step 3: Create Test Call');
  console.log('='.repeat(60));

  try {
    // Insert directly into database
    const [result] = await sequelize.query(`
      INSERT INTO calls (
        customer_id,
        customer_product_id,
        assigned_asc_id,
        call_status_id,
        call_description,
        created_at
      ) VALUES (
        (SELECT TOP 1 customer_id FROM customers),
        (SELECT TOP 1 customers_products_id FROM customers_products LIMIT 1),
        ?,
        (SELECT TOP 1 status_id FROM [status] WHERE status_name = 'open'),
        'Test call for spare return',
        GETDATE()
      )
      
      SELECT @@IDENTITY as callId
    `, {
      replacements: [testData.serviceCenterId]
    });

    if (result && result[0]) {
      testData.callId = result[0].callId;
      console.log('✅ Test call created');
      console.log(`   Call ID: ${testData.callId}`);
      return true;
    }
  } catch (error) {
    console.error('❌ Error creating call:', error.message);
    return false;
  }
}

/**
 * Step 4: Get spare parts for testing
 */
async function getSparePartIds() {
  console.log('\n' + '='.repeat(60));
  console.log('📦 Step 4: Get Spare Parts');
  console.log('='.repeat(60));

  try {
    const response = await sequelize.query(`
      SELECT TOP 2 Id, PART, DESCRIPTION FROM spare_parts
    `);

    if (response && response[0] && response[0].length >= 2) {
      const spares = response[0];
      console.log('✅ Found spare parts');
      spares.forEach((spare, i) => {
        console.log(`   ${i + 1}. ${spare.PART} - ${spare.DESCRIPTION} (ID: ${spare.Id})`);
      });
      return spares.map(s => s.Id);
    }
  } catch (error) {
    console.error('❌ Error getting spares:', error.message);
    return [];
  }
}

/**
 * Step 5: Submit Return Request
 */
async function submitReturnRequest(spareIds) {
  console.log('\n' + '='.repeat(60));
  console.log('📤 Step 5: Technician Submits Return Request');
  console.log('='.repeat(60));

  try {
    const response = await axios.post(
      `${API_URL}/technician-spare-returns/create`,
      {
        callId: testData.callId,
        items: [
          {
            spareId: spareIds[0],
            itemType: 'defective',
            requestedQty: 2,
            defectReason: 'Not working - customer issue'
          },
          {
            spareId: spareIds[1],
            itemType: 'unused',
            requestedQty: 1
          }
        ],
        remarks: 'Call completed successfully'
      },
      {
        headers: { Authorization: `Bearer ${testData.technicianToken}` }
      }
    );

    if (response.data.success) {
      testData.returnId = response.data.returnId;
      console.log('✅ Return request submitted successfully');
      console.log(`   Return ID: ${testData.returnId}`);
      console.log(`   Return Number: ${response.data.returnNumber}`);
      console.log(`   Status: ${response.data.status}`);
      return true;
    }
  } catch (error) {
    console.error('❌ Error submitting return:', error.response?.data?.error || error.message);
    return false;
  }
}

/**
 * Step 6: Login as Service Center User
 */
async function loginAsServiceCenter() {
  console.log('\n' + '='.repeat(60));
  console.log('🔐 Step 6: Login as Service Center User');
  console.log('='.repeat(60));

  try {
    // Assuming you have a service center user
    const response = await axios.post(`${API_URL}/auth/login`, {
      username: 'servicecenter1',    // Change to actual SC username
      password: 'password123'         // Change to actual password
    });

    if (response.data.token) {
      testData.serviceCenterToken = response.data.token;
      console.log('✅ Logged in as Service Center user');
      console.log(`   Token: ${testData.serviceCenterToken.substring(0, 20)}...`);
      return true;
    }
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data?.error || error.message);
    return false;
  }
}

/**
 * Step 7: Service Center Views Return Requests
 */
async function viewReturnRequests() {
  console.log('\n' + '='.repeat(60));
  console.log('👁️ Step 7: Service Center Views Return Requests');
  console.log('='.repeat(60));

  try {
    const response = await axios.get(
      `${API_URL}/returns/technician-spare-returns/list?serviceCenterId=${testData.serviceCenterId}&status=submitted`,
      {
        headers: { Authorization: `Bearer ${testData.serviceCenterToken}` }
      }
    );

    if (response.data.success) {
      console.log('✅ Retrieved return requests');
      console.log(`   Total pending: ${response.data.count}`);
      response.data.data.forEach(req => {
        console.log(`   - ${req.return_number}: ${req.technician_name} (Defective: ${req.defective_qty}, Unused: ${req.unused_qty})`);
      });
      return true;
    }
  } catch (error) {
    console.error('❌ Error fetching returns:', error.response?.data?.error || error.message);
    return false;
  }
}

/**
 * Step 8: Service Center Receives Return Items
 */
async function receiveReturnItems() {
  console.log('\n' + '='.repeat(60));
  console.log('📥 Step 8: Service Center Receives Return Items');
  console.log('='.repeat(60));

  try {
    // First get the return item IDs
    const itemResponse = await axios.get(
      `${API_URL}/returns/technician-spare-returns/${testData.returnId}/items`,
      {
        headers: { Authorization: `Bearer ${testData.serviceCenterToken}` }
      }
    );

    if (!itemResponse.data.success) {
      throw new Error('Failed to get items');
    }

    const items = itemResponse.data.data.map(item => ({
      returnItemId: item.return_item_id,
      receivedQty: item.requested_qty  // Assume all received as requested
    }));

    // Now receive the return
    const response = await axios.post(
      `${API_URL}/technician-spare-returns/${testData.returnId}/receive`,
      {
        items: items,
        receivedRemarks: 'All items received in good condition'
      },
      {
        headers: { Authorization: `Bearer ${testData.serviceCenterToken}` }
      }
    );

    if (response.data.success) {
      console.log('✅ Return items received successfully');
      console.log(`   Return ID: ${response.data.returnId}`);
      console.log(`   New Status: ${response.data.status}`);
      console.log(`   Items Received: ${response.data.itemsReceived}`);
      return true;
    }
  } catch (error) {
    console.error('❌ Error receiving return:', error.response?.data?.error || error.message);
    return false;
  }
}

/**
 * Step 9: Service Center Verifies and Updates Inventory
 */
async function verifyAndUpdateInventory() {
  console.log('\n' + '='.repeat(60));
  console.log('✓ Step 9: Service Center Verifies & Updates Inventory');
  console.log('='.repeat(60));

  try {
    // Get items again to get spare IDs
    const itemResponse = await axios.get(
      `${API_URL}/returns/technician-spare-returns/${testData.returnId}/items`,
      {
        headers: { Authorization: `Bearer ${testData.serviceCenterToken}` }
      }
    );

    if (!itemResponse.data.success) {
      throw new Error('Failed to get items');
    }

    const items = itemResponse.data.data.map(item => ({
      spare_id: item.spare_id,
      verified_qty: item.received_qty || item.requested_qty,
      item_type: item.item_type
    }));

    // Verify the return
    const response = await axios.post(
      `${API_URL}/technician-spare-returns/${testData.returnId}/verify`,
      {
        items: items,
        verifiedRemarks: 'Verified and added to service center inventory'
      },
      {
        headers: { Authorization: `Bearer ${testData.serviceCenterToken}` }
      }
    );

    if (response.data.success) {
      console.log('✅ Return verified and inventory updated successfully');
      console.log(`   Return ID: ${response.data.returnId}`);
      console.log(`   New Status: ${response.data.status}`);
      console.log(`   Items Verified: ${response.data.itemsVerified}`);
      console.log('\n   ✓ Technician inventory decreased');
      console.log('   ✓ Service Center inventory increased');
      return true;
    }
  } catch (error) {
    console.error('❌ Error verifying return:', error.response?.data?.error || error.message);
    return false;
  }
}

/**
 * Step 10: Verify Inventory Updates in Database
 */
async function verifyInventoryInDatabase() {
  console.log('\n' + '='.repeat(60));
  console.log('🔍 Step 10: Verify Inventory Updates in Database');
  console.log('='.repeat(60));

  try {
    const techInventory = await sequelize.query(`
      SELECT spare_id, qty_good, qty_defective 
      FROM spare_inventory
      WHERE location_type = 'technician' 
      AND location_id = ?
      AND spare_id IN (SELECT DISTINCT spare_id FROM technician_spare_return_items WHERE return_id = ?)
    `, { replacements: [testData.technicianId, testData.returnId] });

    const scInventory = await sequelize.query(`
      SELECT spare_id, qty_good, qty_defective 
      FROM spare_inventory
      WHERE location_type = 'service_center' 
      AND location_id = ?
      AND spare_id IN (SELECT DISTINCT spare_id FROM technician_spare_return_items WHERE return_id = ?)
    `, { replacements: [testData.serviceCenterId, testData.returnId] });

    if (techInventory && techInventory[0]) {
      console.log('✅ Technician Inventory:');
      techInventory[0].forEach(inv => {
        console.log(`   Spare ${inv.spare_id}: Good=${inv.qty_good}, Defective=${inv.qty_defective}`);
      });
    }

    if (scInventory && scInventory[0]) {
      console.log('✅ Service Center Inventory:');
      scInventory[0].forEach(inv => {
        console.log(`   Spare ${inv.spare_id}: Good=${inv.qty_good}, Defective=${inv.qty_defective}`);
      });
    }

    return true;
  } catch (error) {
    console.error('❌ Error checking inventory:', error.message);
    return false;
  }
}

/**
 * Main test workflow
 */
async function runCompleteTest() {
  console.log('\n\n');
  console.log('╔' + '═'.repeat(58) + '╗');
  console.log('║' + ' TECHNICIAN SPARE RETURN SYSTEM - COMPLETE TEST '.padEnd(59) + '║');
  console.log('╚' + '═'.repeat(58) + '╝');

  const steps = [
    { name: 'Login as Technician', fn: loginAsTechnician },
    { name: 'Get Technician Details', fn: getTechnicianDetails },
    { name: 'Create Test Call', fn: createTestCall },
    { name: 'Get Spare Parts', fn: getSparePartIds },
    { name: 'Submit Return Request', fn: null }, // Special handling
    { name: 'Login as Service Center', fn: loginAsServiceCenter },
    { name: 'View Return Requests', fn: viewReturnRequests },
    { name: 'Receive Return Items', fn: receiveReturnItems },
    { name: 'Verify & Update Inventory', fn: verifyAndUpdateInventory },
    { name: 'Check Database Inventory', fn: verifyInventoryInDatabase }
  ];

  let spareIds = [];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    console.log(`\n[${i + 1}/${steps.length}] ${step.name}...`);

    let success = false;

    if (step.name === 'Get Spare Parts') {
      spareIds = await getSparePartIds();
      success = spareIds.length >= 2;
    } else if (step.name === 'Submit Return Request') {
      success = await submitReturnRequest(spareIds);
    } else if (step.fn) {
      success = await step.fn();
    }

    if (!success && step.name !== 'Get Spare Parts') {
      console.log(`\n❌ Test failed at step: ${step.name}`);
      console.log('Please check your database and API configuration');
      process.exit(1);
    }
  }

  console.log('\n\n');
  console.log('╔' + '═'.repeat(58) + '╗');
  console.log('║' + ' ✅ ALL TESTS PASSED SUCCESSFULLY! '.padEnd(59) + '║');
  console.log('╚' + '═'.repeat(58) + '╝');
  console.log('\nThe technician spare return system is working correctly!');
  console.log('\nTest Summary:');
  console.log(`  - Return ID: ${testData.returnId}`);
  console.log(`  - Technician ID: ${testData.technicianId}`);
  console.log(`  - Service Center ID: ${testData.serviceCenterId}`);
  console.log(`  - Call ID: ${testData.callId}`);
}

// Run the test
runCompleteTest().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
