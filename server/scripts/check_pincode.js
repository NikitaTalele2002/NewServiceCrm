import { sequelize, Pincode } from '../models/index.js';

async function run() {
  try {
    console.log('\n=== Checking Pincode 422201 ===\n');

    const pincode = await Pincode.findOne({
      where: { VALUE: '422201' }
    });

    if (pincode) {
      console.log(`✓ Pincode 422201 exists:`);
      console.log(`  - VALUE: ${pincode.VALUE}`);
      console.log(`  - DESCRIPTION: ${pincode.DESCRIPTION}`);
      process.exit(0);
    }

    console.log('❌ Pincode 422201 does NOT exist');
    console.log('\n📌 Creating pincode 422201...');

    const newPincode = await Pincode.create({
      VALUE: '422201',
      DESCRIPTION: 'Nashik, Maharashtra',
      City_ID: 331 // From the error, they're using city_id: 331
    });

    console.log(`✓ Created pincode: ${newPincode.VALUE}`);
    console.log(`  - Description: ${newPincode.DESCRIPTION}`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

run();
