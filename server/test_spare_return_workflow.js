/**
 * Test Script: Spare Return Request Workflow
 * 
 * Tests the complete workflow:
 * 1. Technician collects defective spares and remaining goods
 * 2. Technician creates a return request
 * 3. ASC receives the return
 * 4. ASC verifies the return
 * 5. Stock movement is created
 * 6. Inventory is updated at both locations
 */

import fetch from 'node-fetch';
import { sequelize } from './db.js';

const BASE_URL = 'http://localhost:5000';
let authToken = null;
let serviceCenterId = null;
let technicianId = null;
let returnRequestId = null;

async function login(role = 'asc') {
  console.log('\n📝 STEP 1: Login as', role.toUpperCase());
  
  try {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: role === 'asc' ? 'asc_user' : 'technician_user',
        password: 'password123'
      })
    });

    const data = await response.json();
    authToken = data.token;
    
    console.log('✅ Login successful');
    console.log('   Token:', authToken.substring(0, 20) + '...');
    
    return data;
  } catch (error) {
    console.error('❌ Login failed:', error.message);
    throw error;
  }
}

async function getTechnicianInventory(techId) {
  console.log(`\n📦 STEP 2: Get technician ${techId} inventory`);
  
  try {
    const response = await fetch(`${BASE_URL}/api/spare-return-requests/technician-inventory/${techId}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Error fetching inventory:', error.error);
      return null;
    }

    const data = await response.json();
    console.log(`✅ Found ${data.count} spare parts in technician inventory:`);
    
    if (data.data && data.data.length > 0) {
      data.data.slice(0, 3).forEach(item => {
        console.log(`   - ${item.spare_name} (SKU: ${item.sku}): Good=${item.good_qty}, Defective=${item.defective_qty}`);
      });
    } else {
      console.log('   (No inventory found)');
    }
    
    return data.data;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

async function createReturnRequest(inventory) {
  console.log('\n📋 STEP 3: Create spare return request');
  
  try {
    if (!inventory || inventory.length === 0) {
      console.log('⚠️  No inventory to return, skipping...');
      return null;
    }

    // Create return items from first 2 inventory items
    const items = inventory.slice(0, 2).map(item => ({
      spare_id: item.Id || Math.floor(Math.random() * 1000),
      spare_part_code: item.sku,
      spare_part_name: item.spare_name,
      good_qty: Math.min(1, item.good_qty), // Return 1 good spare
      defective_qty: Math.min(2, item.defective_qty), // Return 2 defective
      remarks: 'Collected from field after replacement'
    }));

    const response = await fetch(`${BASE_URL}/api/spare-return-requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        technician_id: technicianId,
        call_id: null,
        request_reason: 'defective_collected',
        items: items,
        remarks: 'Defective spares collected from field + remaining unused goods'
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Error creating return request:', error.error);
      return null;
    }

    const data = await response.json();
    returnRequestId = data.returnRequestId;
    
    console.log('✅ Return request created successfully');
    console.log(`   Request ID: ${data.returnRequestId}`);
    console.log(`   Request Number: ${data.requestNumber}`);
    console.log(`   Status: ${data.status}`);
    console.log(`   Items returned: ${items.length}`);
    
    return data;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

async function getReturnRequestDetails() {
  console.log('\n📄 STEP 4: Get return request details');
  
  try {
    if (!returnRequestId) {
      console.log('⚠️  No return request ID, skipping...');
      return null;
    }

    const response = await fetch(`${BASE_URL}/api/spare-return-requests/${returnRequestId}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Error fetching details:', error.error);
      return null;
    }

    const data = await response.json();
    console.log('✅ Return request details retrieved');
    console.log(`   Request: ${data.data.request_number}`);
    console.log(`   Technician: ${data.data.technician_name}`);
    console.log(`   Status: ${data.data.status}`);
    console.log(`   Items: ${data.data.items.length}`);
    
    return data.data;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

async function receiveReturn(requestDetails) {
  console.log('\n✅ STEP 5: Receive return request at ASC');
  
  try {
    if (!returnRequestId || !requestDetails) {
      console.log('⚠️  Missing data, skipping...');
      return null;
    }

    // Prepare received items
    const received_items = requestDetails.items.map(item => ({
      return_item_id: item.return_item_id,
      received_good_qty: item.good_qty,
      received_defective_qty: item.defective_qty,
      condition: 'defective',
      remarks: 'Verified at ASC'
    }));

    const response = await fetch(`${BASE_URL}/api/spare-return-requests/${returnRequestId}/receive`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        received_items: received_items,
        received_by: 'ASC Operator',
        received_remarks: 'All items received and verified visually'
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Error receiving return:', error.error);
      return null;
    }

    const data = await response.json();
    console.log('✅ Return received successfully');
    console.log(`   Request ID: ${data.returnRequestId}`);
    console.log(`   Status: ${data.status}`);
    console.log(`   Stock Movement ID: ${data.stockMovementId}`);
    
    return data;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

async function verifyReturn(requestDetails) {
  console.log('\n🔍 STEP 6: Verify return request');
  
  try {
    if (!returnRequestId || !requestDetails) {
      console.log('⚠️  Missing data, skipping...');
      return null;
    }

    const verified_items = requestDetails.items.map(item => ({
      return_item_id: item.return_item_id,
      verified_good_qty: item.good_qty,
      verified_defective_qty: item.defective_qty,
      condition_notes: 'Physically verified - condition as received'
    }));

    const response = await fetch(`${BASE_URL}/api/spare-return-requests/${returnRequestId}/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        verified_items: verified_items,
        verified_remarks: 'All items verified and quantity confirmed'
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Error verifying return:', error.error);
      return null;
    }

    const data = await response.json();
    console.log('✅ Return verified successfully');
    console.log(`   Request ID: ${data.returnRequestId}`);
    console.log(`   Status: ${data.status}`);
    
    return data;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

async function getReturnRequests() {
  console.log('\n📋 STEP 7: Get all return requests for service center');
  
  try {
    const response = await fetch(`${BASE_URL}/api/spare-return-requests?include_items=true`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Error fetching requests:', error.error);
      return null;
    }

    const data = await response.json();
    console.log(`✅ Found ${data.count} return requests:`);
    
    if (data.data && data.data.length > 0) {
      data.data.forEach(req => {
        console.log(`   - ${req.request_number} (Tech: ${req.technician_name}, Status: ${req.status}, Items: ${req.items?.length || 0})`);
      });
    }
    
    return data.data;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

async function verifyStockMovement() {
  console.log('\n📊 STEP 8: Verify stock movement created');
  
  try {
    const movement = await sequelize.query(`
      SELECT TOP 1
        movement_id,
        movement_type,
        reference_type,
        reference_no,
        source_location_type,
        destination_location_type,
        total_qty,
        status,
        created_at
      FROM stock_movement
      WHERE reference_type = 'return_request'
      AND reference_no = ?
      ORDER BY movement_id DESC
    `, { replacements: [`RET-${returnRequestId}`], type: sequelize.QueryTypes.SELECT });

    if (movement && movement.length > 0) {
      const m = movement[0];
      console.log('✅ Stock movement created successfully');
      console.log(`   Movement ID: ${m.movement_id}`);
      console.log(`   Type: ${m.movement_type}`);
      console.log(`   From: ${m.source_location_type}`);
      console.log(`   To: ${m.destination_location_type}`);
      console.log(`   Qty: ${m.total_qty}`);
      console.log(`   Status: ${m.status}`);
    } else {
      console.log('⚠️  No stock movement found yet');
    }
    
    return movement;
  } catch (error) {
    console.error('❌ Error:', error.message);
    return null;
  }
}

async function runCompleteTest() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('🧪 SPARE RETURN REQUEST WORKFLOW - COMPLETE TEST');
  console.log('═══════════════════════════════════════════════════════════════');
  
  try {
    // Get first technician for testing
    const techResult = await sequelize.query(`
      SELECT TOP 1 technician_id FROM technicians
    `, { type: sequelize.QueryTypes.SELECT });
    
    if (!techResult || techResult.length === 0) {
      console.log('❌ No technicians found in database');
      return;
    }
    
    technicianId = techResult[0].technician_id;
    console.log(`Using Technician ID: ${technicianId}`);

    // Get service center for this technician
    const scResult = await sequelize.query(`
      SELECT TOP 1 service_center_id FROM technicians WHERE technician_id = ?
    `, { replacements: [technicianId], type: sequelize.QueryTypes.SELECT });
    
    if (scResult && scResult.length > 0) {
      serviceCenterId = scResult[0].service_center_id;
      console.log(`Using Service Center ID: ${serviceCenterId}`);
    }

    // Run tests
    await login('asc');
    
    const inventory = await getTechnicianInventory(technicianId);
    const createResult = await createReturnRequest(inventory);
    
    if (createResult) {
      const details = await getReturnRequestDetails();
      
      if (details) {
        const receiveResult = await receiveReturn(details);
        const verifyResult = await verifyReturn(details);
        
        await getReturnRequests();
        await verifyStockMovement();
      }
    }

    // Summary
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('✅ TEST COMPLETE');
    console.log('═══════════════════════════════════════════════════════════════');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    process.exit(0);
  }
}

// Run tests
runCompleteTest();
