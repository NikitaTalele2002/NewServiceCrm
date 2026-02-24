import http from 'http';

const makeRequest = (path, method = 'GET', body = null) => {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test'  // Auth token for testing
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', err => resolve({ status: 0, error: err.message }));
    
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
};

console.log('🧪 TEST: Return Submission Endpoint\n');

// Step 1: Verify technician 1 has inventory before return
console.log('Step 1: Check technician 1 inventory BEFORE return');
const before = await makeRequest('/api/spare-requests/technicians/1/inventory');
if (before.data && Array.isArray(before.data) && before.data.length > 0) {
  const item = before.data[0];
  console.log(`✓ Found inventory: ${item.sku}`);
  console.log(`  Good qty: ${item.goodQty}, Defective qty: ${item.defectiveQty}`);
  
  // Step 2: Submit return for this item
  console.log('\nStep 2: Submit return for 1 good item');
  const returnData = {
    returns: [
      {
        inventoryItemId: item.id,           // spare_inventory_id
        spareId: item.spareId,               // spare_id
        sku: item.sku,
        name: item.name,
        goodQty: 1,                          // Return 1 good item
        defectiveQty: 0,                     // Return 0 defective
        technicianId: 1                      // Technician ID
      }
    ]
  };
  
  const returnResp = await makeRequest('/api/spare-requests/return', 'POST', returnData);
  console.log(`Status: ${returnResp.status}`);
  if (returnResp.status === 200) {
    console.log('✓ Return submitted successfully');
    console.log(`  Response:`, returnResp.data);
    
    // Step 3: Verify inventory was updated
    console.log('\nStep 3: Check technician 1 inventory AFTER return');
    const after = await makeRequest('/api/spare-requests/technicians/1/inventory');
    if (after.data && Array.isArray(after.data)) {
      const updatedItem = after.data.find(i => i.id === item.id);
      if (updatedItem) {
        console.log(`✓ Updated inventory: ${updatedItem.sku}`);
        console.log(`  Good qty: ${updatedItem.goodQty} (was ${item.goodQty})`);
        if (updatedItem.goodQty === item.goodQty - 1) {
          console.log('  ✓ CORRECT: Good qty decreased by 1');
        } else {
          console.log('  ✗ ERROR: Good qty did not decrease as expected');
        }
      }
    }
  } else {
    console.log('✗ Return submission failed');
    console.log('  Error:', returnResp.data);
  }
} else {
  console.log('✗ No inventory found for technician 1');
}

console.log('\n✅ TEST COMPLETE');
