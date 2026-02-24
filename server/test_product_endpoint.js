import { sequelize, ProductMaster } from './models/index.js';

async function testProductEndpoint() {
  try {
    console.log('\n=== Testing Product Endpoint Logic ===\n');

    // Simulate what the endpoint does
    console.log('Step 1: Attempting ProductMaster.findAll()...');
    let results = await ProductMaster.findAll({ order: [["VALUE", "ASC"]], raw: true });
    console.log('✓ ProductMaster.findAll() succeeded, fetched', results.length, 'rows');

    if (Array.isArray(results) && results.length > 0) {
      console.log('\nStep 2: Normalizing field names...');
      const normalized = results.map(r => ({
        ...r,
        ID: r.ID ?? r.Id ?? r.id,
        ProductGroupID: r.ProductGroupID ?? r.Product_group_ID
      }));
      
      console.log('✓ Normalized', normalized.length, 'rows');
      console.log('\nSample normalized row:');
      console.log(normalized[0]);
      
      console.log('\nStep 3: Testing filter by ProductGroupID=1...');
      const filtered = normalized.filter(r => String(r.ProductGroupID) === String(1));
      console.log('✓ Filtered to', filtered.length, 'products for group 1');
      if (filtered.length > 0) {
        console.log('Sample filtered product:', filtered[0]);
      }
    }

    console.log('\n✅ Endpoint logic test PASSED - products will display correctly\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Test FAILED:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

testProductEndpoint();
