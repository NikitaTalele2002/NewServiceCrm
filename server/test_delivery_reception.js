/**
 * Delivery Note (DN) / Challan Reception Flow
 * 
 * This example demonstrates how to use the stock movement tracking system
 * when a SAP Delivery Note (DN) or Challan is received at an ASC
 * 
 * Flow:
 * 1. Spare request is created and approved by RSM
 * 2. SAP creates DN and Challan when order is placed
 * 3. Material is shipped from Plant to ASC
 * 4. When material reaches ASC, call /api/logistics/receive-delivery
 * 5. This triggers:
 *    - Creates stock_movement record (transfer type)
 *    - Creates goods_movement_items for each spare part
 *    - Creates carton records for physical cartons
 *    - Updates inventory:
 *      - Decreases at Plant
 *      - Increases at ASC
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:5000';
let authToken = '';
let servicecenterId = '';

// ============= HELPER FUNCTIONS =============

async function login() {
  try {
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'sc_pimpri@example.com', // Service center user
        password: 'password'              // Replace with actual password
      })
    });

    const data = await response.json();
    authToken = data.token;
    servicecenterId = data.user?.centerId || data.user?.service_center_id;
    
    if (!authToken) throw new Error('Login failed');
    console.log('✅ Logged in successfully');
    console.log(`   Service Center ID: ${servicecenterId}`);
    return { authToken, servicecenterId };
  } catch (error) {
    console.error('❌ Login failed:', error.message);
    process.exit(1);
  }
}

async function createSpareRequest(plantId, ascId) {
  try {
    console.log('\n=== Creating Spare Request ===');
    const response = await fetch(`${BASE_URL}/api/spare-requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        requested_source_type: 'branch',
        requested_source_id: ascId,
        requested_to_type: 'branch',
        requested_to_id: plantId,
        items: [
          {
            spare_id: 160,
            requested_qty: 5
          },
          {
            spare_id: 161,
            requested_qty: 3
          }
        ]
      })
    });

    const data = await response.json();
    console.log(`✅ Spare request created: ID=${data.request_id}`);
    return data.request_id;
  } catch (error) {
    console.error('❌ Failed to create spare request:', error.message);
    throw error;
  }
}

async function approveSparRequest(requestId) {
  try {
    console.log('\n=== Approving Spare Request (RSM) ===');
    const response = await fetch(`${BASE_URL}/api/rsm/approve-request/${requestId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        items: [
          { spare_id: 160, approved_qty: 5 },
          { spare_id: 161, approved_qty: 3 }
        ]
      })
    });

    const data = await response.json();
    console.log(`✅ Request approved by RSM`);
    return requestId;
  } catch (error) {
    console.error('❌ Failed to approve request:', error.message);
    throw error;
  }
}

async function createSAPDocuments(requestId) {
  try {
    console.log('\n=== Creating SAP Documents (SO, DN, Challan) ===');
    const response = await fetch(`${BASE_URL}/api/logistics/sync-sap`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        requestId: requestId
      })
    });

    const data = await response.json();
    console.log(`✅ SAP documents created`);
    console.log(`   Documents: ${data.documents.map(d => d.document_type).join(', ')}`);
    
    // Extract DN and Challan numbers
    const dn = data.documents.find(d => d.document_type === 'DN');
    const challan = data.documents.find(d => d.document_type === 'CHALLAN');
    
    return {
      dn: dn?.document_number,
      challan: challan?.document_number
    };
  } catch (error) {
    console.error('❌ Failed to create SAP documents:', error.message);
    throw error;
  }
}

/**
 * Receive Delivery Note (DN) at ASC
 * This triggers stock movement and inventory update
 */
async function receiveDeliveryNote(requestId, plantId, dnNumber) {
  try {
    console.log('\n=== Receiving Delivery Note at ASC ===');
    console.log(`   DN Number: ${dnNumber}`);
    console.log(`   From Plant: ${plantId}`);
    console.log(`   To ASC: ${servicecenterId}`);

    const response = await fetch(`${BASE_URL}/api/logistics/receive-delivery`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        requestId,
        documentType: 'DN',
        documentNumber: dnNumber,
        plants: plantId,
        items: [
          {
            spare_id: 160,
            qty: 5,
            carton_number: 'CARTON-DN-001',
            condition: 'good'
          },
          {
            spare_id: 161,
            qty: 3,
            carton_number: 'CARTON-DN-002',
            condition: 'good'
          }
        ]
      })
    });

    const data = await response.json();
    if (!data.ok) throw new Error(data.error);

    console.log(`✅ DN received successfully`);
    console.log(`   Stock Movement ID: ${data.data.movement.movement.movement_id}`);
    console.log(`   Items Received: ${data.data.itemsReceived}`);
    console.log(`   Total Qty: ${data.data.totalQtyReceived}`);
    console.log(`\n   Inventory Updates:`);
    
    if (data.data.inventory.source.length > 0) {
      console.log(`   ✓ Plant Inventory (Decreased):`);
      data.data.inventory.source.forEach(inv => {
        console.log(`     - Spare ${inv.spare_id}: ${inv.oldQty} → ${inv.newQty}`);
      });
    }
    
    if (data.data.inventory.destination.length > 0) {
      console.log(`   ✓ ASC Inventory (Increased):`);
      data.data.inventory.destination.forEach(inv => {
        console.log(`     - Spare ${inv.spare_id}: ${inv.oldQty} → ${inv.newQty}`);
      });
    }

    return data.data.movement.movement.movement_id;
  } catch (error) {
    console.error('❌ Failed to receive DN:', error.message);
    throw error;
  }
}

/**
 * Receive Challan at ASC
 */
async function receiveChallan(requestId, plantId, challanNumber) {
  try {
    console.log('\n=== Receiving Challan at ASC ===');
    console.log(`   Challan Number: ${challanNumber}`);

    const response = await fetch(`${BASE_URL}/api/logistics/receive-delivery`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        requestId,
        documentType: 'CHALLAN',
        documentNumber: challanNumber,
        plants: plantId,
        items: [
          {
            spare_id: 160,
            qty: 5,
            carton_number: 'CARTON-CHALLAN-001',
            condition: 'good'
          },
          {
            spare_id: 161,
            qty: 3,
            carton_number: 'CARTON-CHALLAN-002',
            condition: 'good'
          }
        ]
      })
    });

    const data = await response.json();
    if (!data.ok) throw new Error(data.error);

    console.log(`✅ Challan received successfully`);
    console.log(`   Movement ID: ${data.data.movement.movement.movement_id}`);
    return data.data.movement.movement.movement_id;
  } catch (error) {
    console.error('❌ Failed to receive Challan:', error.message);
    throw error;
  }
}

/**
 * Get in-transit materials for ASC
 * Shows materials that have been shipped but not yet received
 */
async function getInTransitMaterials(ascId) {
  try {
    console.log('\n=== Checking In-Transit Materials ===');
    const response = await fetch(`${BASE_URL}/api/logistics/in-transit/${ascId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    const data = await response.json();
    console.log(`✅ Found ${data.inTransitCount} in-transit shipments`);
    
    if (data.materials.length > 0) {
      console.log('\n   In-Transit Materials:');
      // Group by document
      const grouped = {};
      data.materials.forEach(m => {
        if (!grouped[m.reference_no]) {
          grouped[m.reference_no] = [];
        }
        grouped[m.reference_no].push(m);
      });

      Object.entries(grouped).forEach(([ref, items]) => {
        console.log(`   📦 ${ref}`);
        items.forEach(item => {
          console.log(`     - ${item.spare_part || 'Unknown'}: ${item.qty} units (${item.condition})`);
        });
      });
    }
    
    return data.materials;
  } catch (error) {
    console.error('❌ Failed to fetch in-transit materials:', error.message);
    throw error;
  }
}

/**
 * Get movement history for a spare request
 */
async function getMovementHistory(requestId) {
  try {
    console.log('\n=== Getting Movement History ===');
    const response = await fetch(`${BASE_URL}/api/logistics/movement-history/${requestId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    const data = await response.json();
    console.log(`✅ Found ${data.movementCount} stock movements`);
    
    if (data.movements.length > 0) {
      data.movements.forEach(movement => {
        console.log(`\n   Movement ID: ${movement.movement_id}`);
        console.log(`   Type: ${movement.movement_type}`);
        console.log(`   Reference: ${movement.reference_no}`);
        console.log(`   Date: ${movement.movement_date}`);
        console.log(`   From: ${movement.source_location_type}-${movement.source_location_id}`);
        console.log(`   To: ${movement.destination_location_type}-${movement.destination_location_id}`);
        console.log(`   Total Qty: ${movement.total_qty}`);
      });
    }

    return data.movements;
  } catch (error) {
    console.error('❌ Failed to fetch movement history:', error.message);
    throw error;
  }
}

/**
 * Get cartons for a stock movement
 */
async function getCartons(movementId) {
  try {
    console.log('\n=== Getting Carton Details ===');
    const response = await fetch(`${BASE_URL}/api/logistics/cartons/${movementId}`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    const data = await response.json();
    console.log(`✅ Found ${data.cartonCount} cartons in movement`);
    
    if (data.cartons.length > 0) {
      data.cartons.forEach(carton => {
        console.log(`\n   📦 Carton: ${carton.carton_number}`);
        console.log(`      Created: ${carton.created_at}`);
        
        if (carton.goods_items && carton.goods_items.length > 0) {
          console.log(`      Contents:`);
          carton.goods_items.forEach(item => {
            const spareName = item.SparePart?.PART || `Spare#${item.spare_part_id}`;
            console.log(`        - ${spareName}: ${item.qty} units (${item.condition})`);
          });
        }
      });
    }

    return data.cartons;
  } catch (error) {
    console.error('❌ Failed to fetch cartons:', error.message);
    throw error;
  }
}

// ============= MAIN TEST FLOW =============

async function runCompleteFlow() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   DELIVERY NOTE (DN) RECEPTION & STOCK MOVEMENT TRACKING   ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  try {
    // Step 0: Login
    await login();

    const plantId = 1;      // Plant/Branch ID
    const ascId = servicecenterId;  // ASC (Service Center) ID

    // Step 1: Create Spare Request
    const requestId = await createSpareRequest(plantId, ascId);

    // Step 2: Approve Request (RSM)
    await approveSparRequest(requestId);

    // Step 3: Create SAP Documents
    const docNumbers = await createSAPDocuments(requestId);

    // Step 4: Receive DN at ASC (Triggers Stock Movement)
    if (docNumbers.dn) {
      const dnMovementId = await receiveDeliveryNote(requestId, plantId, docNumbers.dn);
      
      // Show carton details
      await getCartons(dnMovementId);
    }

    // Step 5: Receive Challan at ASC
    if (docNumbers.challan) {
      const challanMovementId = await receiveChallan(requestId, plantId, docNumbers.challan);
      
      // Show carton details
      await getCartons(challanMovementId);
    }

    // Step 6: Check In-Transit Materials
    await getInTransitMaterials(ascId);

    // Step 7: Get Movement History
    await getMovementHistory(requestId);

    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                    🎉 TEST COMPLETE 🎉                     ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');

  } catch (error) {
    console.error('\n❌ Test flow failed:', error);
    process.exit(1);
  }
}

// Run the test
runCompleteFlow().catch(console.error);

export {
  login,
  createSpareRequest,
  approveSparRequest,
  createSAPDocuments,
  receiveDeliveryNote,
  receiveChallan,
  getInTransitMaterials,
  getMovementHistory,
  getCartons
};
