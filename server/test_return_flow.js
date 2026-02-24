import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';

const JWT_SECRET = 'supersecret_jwt_key_change_me';

const payload = {
  id: 1,
  username: 'SCUser',
  centerId: 4,
  role: 'service_center'
};

const token = jwt.sign(payload, JWT_SECRET);

async function testCompleteFlow() {
  try {
    console.log('\n' + '='.repeat(80));
    console.log('🧪 TESTING COMPLETE RETURN FLOW');
    console.log('='.repeat(80) + '\n');

    // Step 1: Fetch inventory
    console.log('1️⃣  Fetching service center inventory...\n');
    const inventoryResponse = await fetch('http://localhost:5000/api/spare-returns/inventory', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    if (!inventoryResponse.ok) {
      console.error('❌ Failed to fetch inventory');
      return;
    }

    const inventoryData = await inventoryResponse.json();
    console.log(`✅ Got inventory with ${Object.keys(inventoryData.inventoryMap).length} groups\n`);

    // Step 2: Build cart items from real inventory
    console.log('2️⃣  Building cart from real inventory data...\n');
    
    const cart = [];
    for (const groupId in inventoryData.inventoryMap) {
      const group = inventoryData.inventoryMap[groupId];
      for (const prodId in group.products) {
        const product = group.products[prodId];
        for (const modelId in product.models) {
          const model = product.models[modelId];
          for (const spareId in model.spares) {
            const spare = model.spares[spareId];
            // Add first 2 spares to cart
            if (cart.length < 2) {
              const returnQty = Math.floor(spare.totalQty / 2);  // Return half of available
              if (returnQty > 0) {
                cart.push({
                  spareId: parseInt(spareId),  // Make sure it's a number
                  spare_id: parseInt(spareId),
                  PART: spare.partCode,
                  DESCRIPTION: spare.partDescription,
                  currentQty: spare.totalQty,
                  returnQty: returnQty,
                  remainingQty: spare.totalQty - returnQty
                });
                console.log(`  Added: ${spare.partCode} - Return Qty: ${returnQty}`);
              }
            }
          }
        }
      }
    }

    if (cart.length === 0) {
      console.error('❌ Could not build cart - no inventory available');
      return;
    }

    console.log(`\n✅ Built cart with ${cart.length} items\n`);

    // Step 3: Submit return request
    console.log('3️⃣  Submitting return request...\n');
    
    const submitPayload = {
      items: cart.map(item => ({
        spareId: item.spareId,
        returnQty: item.returnQty,
        remainingQty: item.remainingQty
      })),
      returnType: 'defect',
      productGroup: '1',
      product: '1',
      model: '1'
    };

    console.log('Payload:', JSON.stringify(submitPayload, null, 2));
    console.log('\n---\n');

    const submitResponse = await fetch('http://localhost:5000/api/spare-returns/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(submitPayload),
      timeout: 30000
    });

    const submitData = await submitResponse.json();
    
    console.log('Response Status:', submitResponse.status);
    console.log('Response Body:', JSON.stringify(submitData, null, 2));

    if (submitResponse.ok && submitData.success) {
      console.log('\n' + '='.repeat(80));
      console.log('✅ COMPLETE FLOW TEST PASSED');
      console.log('='.repeat(80));
      console.log(`Request ID: ${submitData.returnRequest?.requestId}`);
      console.log(`Items Created: ${submitData.returnRequest?.itemCount}`);
      console.log(`Total Qty: ${submitData.returnRequest?.totalQty}\n`);
    } else {
      console.log('\n' + '='.repeat(80));
      console.log('❌ COMPLETE FLOW TEST FAILED');
      console.log('='.repeat(80));
      console.log(`Error: ${submitData.error}`);
      if (submitData.details) {
        console.log(`Details: ${submitData.details}`);
      }
      console.log('');
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
    console.log('\n' + '='.repeat(80) + '\n');
  }
}

testCompleteFlow();
