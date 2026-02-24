import { sequelize, ProductGroup } from './models/index.js';

async function testProductGroupEndpoint() {
  try {
    console.log('\n=== Testing ProductGroup Endpoint ===\n');

    // Test findAll with raw=true
    const results = await ProductGroup.findAll({ order: [["VALUE", "ASC"]], raw: true });
    
    console.log('✓ ProductGroup.findAll() with raw=true succeeded');
    console.log('✓ Fetched', results.length, 'product groups');
    console.log('✓ Data is raw (plain objects, not Sequelize instances):', 
      results[0] && typeof results[0].dataValues === 'undefined');
    
    console.log('\nSample product group:');
    console.log(results[0]);
    
    console.log('\n✅ ProductGroup endpoint test PASSED\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Test FAILED:', err.message);
    process.exit(1);
  }
}

testProductGroupEndpoint();
