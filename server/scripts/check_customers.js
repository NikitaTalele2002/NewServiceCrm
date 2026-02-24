import { sequelize, Customer } from '../models/index.js';

async function run() {
  try {
    console.log('\n=== Checking Existing Customers ===\n');

    const customers = await Customer.findAll({
      attributes: ['customer_id', 'name', 'email', 'mobile_no'],
      limit: 20,
    });

    if (customers.length === 0) {
      console.log('No customers found');
      process.exit(0);
    }

    console.log(`Found ${customers.length} customers:\n`);
    customers.forEach(cust => {
      console.log(`ID: ${cust.customer_id}`);
      console.log(`  Name: ${cust.name}`);
      console.log(`  Email: ${cust.email || '(none)'}`);
      console.log(`  Mobile: ${cust.mobile_no}`);
      console.log();
    });

    // Check for duplicate email
    const dupCheck = await Customer.findOne({
      where: { email: 'nikitatalele2002@gmail.com' }
    });

    if (dupCheck) {
      console.log(`⚠️  Email 'nikitatalele2002@gmail.com' is already used by: ${dupCheck.name}`);
      console.log(`   To register a new customer, use a different email address.\n`);
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

run();
