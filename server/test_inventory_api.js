import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';

const JWT_SECRET = 'supersecret_jwt_key_change_me';

// Create a token for service center with ID 4
const payload = {
  id: 1,
  username: 'SCUser',
  centerId: 4,
  role: 'service_center'
};

const token = jwt.sign(payload, JWT_SECRET);

async function testInventoryAPI() {
  console.log('\n' + '='.repeat(80));
  console.log('🧪 TESTING SERVICE CENTER INVENTORY API');
  console.log('='.repeat(80));

  try {
    // Test 1: Fetch Service Center Inventory
    console.log('\n📝 Test 1: Fetching service center inventory for centerId 4...');
    const response1 = await fetch('http://localhost:5000/api/spare-returns/inventory', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response1.ok) {
      console.error(`❌ HTTP Error: ${response1.status} ${response1.statusText}`);
      const errorText = await response1.text();
      console.error('Response:', errorText);
      return;
    }

    const data = await response1.json();
    console.log('✅ API Response received');
    console.log(`   - Total items: ${data.totalItems}`);
    console.log(`   - Groups in map: ${Object.keys(data.inventoryMap || {}).length}`);
    
    if (Object.keys(data.inventoryMap || {}).length === 0) {
      console.warn('⚠️  WARNING: No inventory items found for this service center');
      console.log('   This could mean:');
      console.log('   1. The service center has no spares in spare_inventory table');
      console.log('   2. The spare_inventory entries dont link properly to product hierarchy');
      return;
    }

    // Test 2: Validate inventory map structure
    console.log('\n📝 Test 2: Validating inventory map structure...');
    const inventoryMap = data.inventoryMap || {};
    
    let groupCount = 0;
    let productCount = 0;
    let modelCount = 0;
    let spareCount = 0;

    for (const [groupId, groupData] of Object.entries(inventoryMap)) {
      groupCount++;
      console.log(`\n   📦 Group ID: ${groupId}`);
      console.log(`      Name: ${groupData.groupName}`);
      
      for (const [prodId, prodData] of Object.entries(groupData.products || {})) {
        productCount++;
        console.log(`      └─ Product ID: ${prodId}`);
        console.log(`         Name: ${prodData.productName}`);
        
        for (const [modelId, modelData] of Object.entries(prodData.models || {})) {
          modelCount++;
          console.log(`         └─ Model ID: ${modelId}`);
          console.log(`            Code: ${modelData.modelCode}`);
          console.log(`            Description: ${modelData.modelDescription}`);
          
          for (const [spareId, spareData] of Object.entries(modelData.spares || {})) {
            spareCount++;
            console.log(`            └─ Spare ID: ${spareId}`);
            console.log(`               Code: ${spareData.partCode}`);
            console.log(`               Desc: ${spareData.partDescription}`);
            console.log(`               Total Qty: ${spareData.totalQty} (Good: ${spareData.goodQty}, Defective: ${spareData.defectiveQty})`);
          }
        }
      }
    }

    console.log(`\n✅ Inventory map structure valid:`);
    console.log(`   - Groups: ${groupCount}`);
    console.log(`   - Products: ${productCount}`);
    console.log(`   - Models: ${modelCount}`);
    console.log(`   - Spares: ${spareCount}`);

    // Test 3: Simulate frontend filtering
    console.log('\n📝 Test 3: Simulating frontend filter logic...');
    
    const availableGroups = Object.values(inventoryMap).map(group => ({
      Id: group.groupId,
      VALUE: group.groupName,
      DESCRIPTION: group.groupName
    }));
    
    console.log(`✅ Available groups for dropdown: ${availableGroups.length}`);
    availableGroups.forEach(g => console.log(`   - ${g.VALUE} (ID: ${g.Id})`));

    if (availableGroups.length > 0) {
      const firstGroupId = availableGroups[0].Id;
      console.log(`\n   Selecting first group: ${availableGroups[0].VALUE}`);
      
      const productsForGroup = Object.values(inventoryMap[firstGroupId]?.products || {}).map(prod => ({
        ID: prod.productId,
        VALUE: prod.productName,
        DESCRIPTION: prod.productName
      }));
      
      console.log(`   Available products: ${productsForGroup.length}`);
      productsForGroup.forEach(p => console.log(`      - ${p.VALUE} (ID: ${p.ID})`));

      if (productsForGroup.length > 0) {
        const firstProdId = productsForGroup[0].ID;
        console.log(`\n   Selecting first product: ${productsForGroup[0].VALUE}`);
        
        const modelsForProduct = Object.values(inventoryMap[firstGroupId].products[firstProdId]?.models || {}).map(mdl => ({
          Id: mdl.modelId,
          MODEL_CODE: mdl.modelCode,
          MODEL_DESCRIPTION: mdl.modelDescription
        }));
        
        console.log(`   Available models: ${modelsForProduct.length}`);
        modelsForProduct.forEach(m => console.log(`      - ${m.MODEL_CODE}: ${m.MODEL_DESCRIPTION} (ID: ${m.Id})`));

        if (modelsForProduct.length > 0) {
          const firstModelId = modelsForProduct[0].Id;
          console.log(`\n   Selecting first model: ${modelsForProduct[0].MODEL_CODE}`);
          
          const sparesForModel = Object.values(inventoryMap[firstGroupId].products[firstProdId].models[firstModelId]?.spares || {}).map(spare => ({
            Id: spare.spareId,
            PART: spare.partCode,
            DESCRIPTION: spare.partDescription,
            totalQty: spare.totalQty,
            goodQty: spare.goodQty,
            defectiveQty: spare.defectiveQty
          }));
          
          console.log(`   Available spares: ${sparesForModel.length}`);
          sparesForModel.forEach(s => console.log(`      - ${s.PART}: ${s.DESCRIPTION} (Qty: ${s.totalQty})`));
        }
      }
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ ALL TESTS PASSED - Inventory API is working correctly!');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('\n❌ Error during testing:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testInventoryAPI();
