import { Sequelize } from 'sequelize';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const sequelize = new Sequelize('FinolexCRM', 'crm_user', 'StrongPassword123!', {
  host: 'localhost',
  port: 1433,
  dialect: 'mssql',
  logging: false
});

async function testJalgaon() {
  try {
    // Test 1: Find Jalgaon city
    console.log('\n=== Test 1: Finding Jalgaon City ===');
    const result = await sequelize.query(
      `SELECT Id, Value, Description, Parent_I FROM Cities WHERE Value LIKE '%jalgaon%' OR Description LIKE '%jalgaon%'`,
      { type: 'SELECT' }
    );
    console.log('Jalgaon Cities:', JSON.stringify(result, null, 2));

    if (result.length === 0) {
      console.log('❌ Jalgaon city not found!');
      return;
    }

    const jalgaonId = result[0].Id;
    const stateId = result[0].Parent_I;
    
    console.log(`\n✓ Found Jalgaon: Id=${jalgaonId}, StateId=${stateId}`);

    // Test 2: Find Maharashtra
    console.log('\n=== Test 2: Finding Maharashtra State ===');
    const stateResult = await sequelize.query(
      `SELECT Id, Value FROM States WHERE Value LIKE '%maharashtra%'`,
      { type: 'SELECT' }
    );
    console.log('Maharashtra:', JSON.stringify(stateResult, null, 2));

    // Test 3: Find pincode 425503
    console.log('\n=== Test 3: Finding Pincode 425503 ===');
    const pincodeResult = await sequelize.query(
      `SELECT Id, Value, Description, City_ID FROM Pincodes WHERE Value = '425503'`,
      { type: 'SELECT' }
    );
    console.log('Pincode 425503:', JSON.stringify(pincodeResult, null, 2));

    if (pincodeResult.length === 0) {
      console.log('❌ Pincode 425503 not found in database!');
    } else {
      const pincode = pincodeResult[0];
      console.log(`\n✓ Found Pincode 425503: City_ID=${pincode.City_ID}`);
      
      if (pincode.City_ID === jalgaonId) {
        console.log('✓ Pincode is correctly associated with Jalgaon!');
      } else {
        console.log(`❌ Pincode City_ID (${pincode.City_ID}) does NOT match Jalgaon Id (${jalgaonId})!`);
      }
    }

    // Test 4: List all pincodes for Jalgaon
    console.log(`\n=== Test 4: All Pincodes for Jalgaon (City_ID=${jalgaonId}) ===`);
    const allPincodes = await sequelize.query(
      `SELECT Id, Value, Description, City_ID FROM Pincodes WHERE City_ID = ? ORDER BY Value`,
      { 
        replacements: [jalgaonId],
        type: 'SELECT'
      }
    );
    console.log(`Found ${allPincodes.length} pincodes for Jalgaon:`);
    allPincodes.forEach(p => console.log(`  - ${p.Value} (${p.Description})`));

    // Test 5: Check if 425503 exists in ANY city
    console.log('\n=== Test 5: Which City has Pincode 425503? ===');
    const cityFor425503 = await sequelize.query(
      `SELECT p.Id, p.Value, c.Id as CityId, c.Value as CityName, s.Value as StateName
       FROM Pincodes p
       LEFT JOIN Cities c ON p.City_ID = c.Id
       LEFT JOIN States s ON c.Parent_I = s.Id
       WHERE p.Value = '425503'`,
      { type: 'SELECT' }
    );
    console.log('City for 425503:', JSON.stringify(cityFor425503, null, 2));

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

testJalgaon();
