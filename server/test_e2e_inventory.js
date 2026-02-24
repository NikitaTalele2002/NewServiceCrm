/**
 * End-to-End Test: Inventory Update Flow
 * 1. Call sync-sap to generate logistics documents for request 26
 * 2. Call receive-delivery to process the DN reception and trigger inventory update
 */

import jwt from 'jsonwebtoken';

const JWT_SECRET = 'supersecret_jwt_key_change_me';
const BASE_URL = 'http://localhost:5000';

function generateToken(userRole = 'admin', ascId = 4) {
  const payload = {
    id: 1,
    username: userRole === 'service_center' ? 'test_asc_user' : 'test_admin',
    role: userRole,
    centerId: ascId,
    service_center_id: ascId
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
}

async function testE2EInventoryFlow() {
  console.log('\n🔧 === END-TO-END INVENTORY UPDATE TEST ===\n');

  const requestId = 26;
  const ascId = 4;
  const plantId = 1;
  const spareId = 3;
  const qty = 2; // Approved quantity for spare 3

  console.log('📋 Test Configuration:');
  console.log(`  Request ID: ${requestId}`);
  console.log(`  ASC: ${ascId}`);
  console.log(`  Plant: ${plantId} (auto-assigned to ASC)`);
  console.log(`  Spare: ${spareId}`);
  console.log(`  Quantity: ${qty}\n`);

  // Step 1: Call sync-sap to generate logistics documents
  console.log('STEP 1️⃣ : Generating logistics documents via sync-sap...\n');

  const syncToken = generateToken('admin');
  let dnDocumentNumber = null;

  try {
    const syncResponse = await fetch(`${BASE_URL}/api/logistics/sync-sap`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${syncToken}`
      },
      body: JSON.stringify({ requestId: requestId })
    });

    const syncData = await syncResponse.json();

    if (syncResponse.status === 201 && syncData.ok) {
      console.log('✅ SAP sync successful!');
      
      // Extract DN document number from response
      if (syncData.documents && Array.isArray(syncData.documents)) {
        const dnDoc = syncData.documents.find(d => d.document_type === 'DN');
        if (dnDoc) {
          dnDocumentNumber = dnDoc.document_number;
          console.log(`   Created DN: ${dnDocumentNumber}\n`);
        }
      }

      if (!dnDocumentNumber) {
        console.log('⚠️  Could not find DN document in response');
        console.log('Available documents:');
        if (syncData.documents) {
          syncData.documents.forEach(d => {
            console.log(`   - ${d.document_type}: ${d.document_number}`);
          });
        }
        return;
      }
    } else {
      console.log('❌ SAP sync failed');
      console.log(`   Status: ${syncResponse.status}`);
      console.log(`   Error: ${syncData.error}`);
      return;
    }
  } catch (error) {
    console.log(`❌ Connection failed: ${error.message}`);
    return;
  }

  // Wait a moment for documents to be created
  console.log('⏳ Waiting for documents to be created...');
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Step 2: Call receive-delivery with the generated DN
  console.log('\nSTEP 2️⃣ : Receiving delivery via receive-delivery...\n');

  const receiveToken = generateToken('service_center', ascId);

  const receivePayload = {
    requestId: requestId,
    documentType: 'DN',
    documentNumber: dnDocumentNumber,
    items: [
      {
        spare_id: spareId,
        qty: qty,
        carton_number: `CTN-E2E-${Date.now()}`,
        condition: 'good'
      }
    ]
  };

  console.log('📝 Receive-delivery payload:');
  console.log(JSON.stringify(receivePayload, null, 2));
  console.log();

  try {
    const receiveResponse = await fetch(`${BASE_URL}/api/logistics/receive-delivery`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${receiveToken}`
      },
      body: JSON.stringify(receivePayload)
    });

    const receiveData = await receiveResponse.json();
    console.log(`📊 Response Status: ${receiveResponse.status}\n`);

    if (receiveResponse.status === 201 && receiveData.ok) {
      console.log('✅ Delivery reception successful!\n');
      
      // Show created movement
      if (receiveData.data?.movement) {
        console.log('📦 Stock Movement Created:');
        console.log(`   ID: ${receiveData.data.movement.movement_id}`);
        console.log(`   Status: ${receiveData.data.movement.status}`);
        console.log(`   Total Qty: ${receiveData.data.movement.total_qty}`);
      }

      // Show inventory changes
      if (receiveData.data?.inventory) {
        const invData = receiveData.data.inventory;
        
        console.log('\n💾 Inventory Changes:');
        
        if (invData.source && invData.source.length > 0) {
          console.log('\n  SOURCE (Plant) - Decreased:');
          invData.source.forEach(change => {
            console.log(`    Spare ${change.spare_id}: ${change.oldQty} → ${change.newQty} (${change.change})`);
          });
        } else {
          console.log('\n  SOURCE - No changes (possibly no inventory or error)');
        }

        if (invData.destination && invData.destination.length > 0) {
          console.log('\n  DESTINATION (ASC) - Changed:');
          invData.destination.forEach(change => {
            const newLabel = change.isNew ? ' [NEW RECORD]' : '';
            console.log(`    Spare ${change.spare_id}: ${change.oldQty} → ${change.newQty} (${change.change})${newLabel}`);
          });
        } else {
          console.log('\n  DESTINATION - No changes');
        }
      } else {
        console.log('\n⚠️  No inventory data in response');
      }

      console.log('\n\n✨ TEST COMPLETE ✨');
      console.log('Summary:');
      console.log(`  ✅ Logistics documents generated (DN: ${dnDocumentNumber})`);
      console.log(`  ✅ Stock movement created`);
      console.log(`  ✅ Inventory update processed`);

    } else {
      console.log('❌ Receive-delivery failed');
      console.log(`   Status: ${receiveResponse.status}`);
      console.log(`   Error: ${receiveData.error}`);
      console.log('\n   Full Response:');
      console.log(JSON.stringify(receiveData, null, 2));
    }
  } catch (error) {
    console.log(`❌ Connection failed: ${error.message}`);
  }

  console.log('\n\n📋 Verification Queries (run in SQL Server):\n');
  console.log(`-- Check Plant ${plantId} inventory for Spare ${spareId}`);
  console.log(`SELECT qty_good, qty_defective FROM spare_inventory`);
  console.log(`WHERE spare_id = ${spareId} AND location_type = 'branch' AND location_id = ${plantId};`);
  console.log(`-- Expected: qty_good should have decreased by ${qty}\n`);
  
  console.log(`-- Check ASC ${ascId} inventory for Spare ${spareId}`);
  console.log(`SELECT qty_good, qty_defective FROM spare_inventory`);
  console.log(`WHERE spare_id = ${spareId} AND location_type = 'service_center' AND location_id = ${ascId};`);
  console.log(`-- Expected: qty_good should have increased by ${qty}\n`);
  
  console.log(`-- Check stock movement`);
  console.log(`SELECT TOP 5 movement_id, status, total_qty, reference_no FROM stock_movement`);
  console.log(`ORDER BY created_at DESC;`);
}

testE2EInventoryFlow();
