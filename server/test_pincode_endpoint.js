import { sequelize, Pincode, City } from './models/index.js';

async function testPincodeEndpoint() {
  try {
    console.log('\n=== Testing Pincode Endpoint ===\n');

    // Test 1: Get all pincodes
    console.log('Test 1: Fetching all pincodes...');
    const allPincodes = await Pincode.findAll({
      order: [["VALUE", "ASC"]],
      attributes: ['Id', 'VALUE', 'DESCRIPTION', 'City_ID'],
      raw: true,
    });
    console.log('✓ Fetched', allPincodes.length, 'pincodes');
    
    if (allPincodes.length > 0) {
      console.log('Sample pincode:', allPincodes[0]);
    }

    // Test 2: Get pincodes for a city
    console.log('\nTest 2: Finding a city with pincodes...');
    const citiesWithPincodes = await sequelize.query(
      'SELECT TOP 1 [Id] FROM [Cities] ORDER BY [Id]',
      { type: sequelize.QueryTypes.SELECT }
    );
    
    if (citiesWithPincodes.length > 0) {
      const cityId = citiesWithPincodes[0].Id;
      console.log('Using city ID:', cityId);
      
      const cityPincodes = await Pincode.findAll({
        where: { City_ID: cityId },
        order: [["VALUE", "ASC"]],
        attributes: ['Id', 'VALUE', 'DESCRIPTION', 'City_ID'],
        raw: true,
      });
      console.log('✓ Fetched', cityPincodes.length, 'pincodes for city', cityId);
      
      if (cityPincodes.length > 0) {
        console.log('Sample city pincode:', cityPincodes[0]);
      }
    }

    // Test 3: Normalize output
    console.log('\nTest 3: Testing output normalization...');
    const normalized = allPincodes.slice(0, 1).map(r => ({
      Id: r.Id,
      VALUE: r.VALUE,
      value: r.VALUE,
      DESCRIPTION: r.DESCRIPTION,
      City_ID: r.City_ID,
      cityId: r.City_ID
    }));
    console.log('Normalized sample:', normalized[0]);

    console.log('\n✅ Pincode endpoint test PASSED\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Test FAILED:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

testPincodeEndpoint();
