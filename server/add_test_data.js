import { connectDB, sequelize } from './db.js';
import { Customer, State, City, Pincode } from './models/index.js';

async function addTestData() {
  try {
    console.log('🔄 Connecting to database...');
    await connectDB();
    console.log('✓ Connected to database');

    // Check if test customer already exists
    const existing = await Customer.findOne({
      where: { mobile_no: '9999999999' }
    });

    if (existing) {
      console.log('✓ Test customer already exists with ID:', existing.customer_id);
      process.exit(0);
    }

    console.log('🔄 Creating test customer...');
    
    // Create test customer
    const testCustomer = await Customer.create({
      name: 'Test Customer',
      mobile_no: '9999999999',
      alt_mob_no: '9876543210',
      email: 'test@example.com',
      house_no: '123',
      street_name: 'Main Street',
      building_name: 'Test Building',
      area: 'Downtown',
      landmark: 'Near Market',
      city_id: null,
      state_id: null,
      pincode: null,
      customer_code: `TEST-${Date.now()}`,
      customer_priority: 'medium',
      created_by: null
    });

    console.log('✓ Test customer created successfully!');
    console.log('  Customer ID:', testCustomer.customer_id);
    console.log('  Name:', testCustomer.name);
    console.log('  Mobile:', testCustomer.mobile_no);
    console.log('  Email:', testCustomer.email);
    console.log('  Code:', testCustomer.customer_code);

    // Also add another test customer
    const testCustomer2 = await Customer.create({
      name: 'Nikita Talele',
      mobile_no: '09766814799',
      alt_mob_no: '09876543210',
      email: 'nikitatalele2002@gmail.com',
      house_no: '123',
      street_name: 'Park Avenue',
      building_name: 'Crown Plaza',
      area: 'Bandra',
      landmark: 'Near Station',
      city_id: null,
      state_id: null,
      pincode: null,
      customer_code: `CUST-${Date.now()}`,
      customer_priority: 'high',
      created_by: null
    });

    console.log('\n✓ Second test customer created!');
    console.log('  Customer ID:', testCustomer2.customer_id);
    console.log('  Name:', testCustomer2.name);
    console.log('  Mobile:', testCustomer2.mobile_no);

    console.log('\n✅ All test data added successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error adding test data:', err);
    process.exit(1);
  }
}

addTestData();
