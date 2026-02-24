import { sequelize, Customer, CustomersProducts, Calls, Status } from '../models/index.js';

/**
 * Test script to verify complaint registration works end-to-end
 * Usage: `node server/scripts/test_complaint_creation.js`
 */
async function run() {
  try {
    console.log('\n=== Testing Complaint Registration ===\n');

    // Ensure we have at least one status (required for FK constraint)
    let status = await Status.findOne();
    if (!status) {
      console.log('📌 Creating default "Open" status...');
      status = await Status.create({
        status_name: 'Open',
      });
      console.log(`✓ Created status: ${status.status_name} (ID: ${status.status_id})`);
    } else {
      console.log(`✓ Using existing status: ${status.status_name} (ID: ${status.status_id})`);
    }

    // Fetch customer with products (join CustomersProducts to find one with products)
    const customerProduct = await CustomersProducts.findOne({
      include: {
        model: Customer,
        as: 'Customer'
      }
    });
    
    if (!customerProduct) {
      console.log('❌ No customer products found. Please register a product first.');
      process.exit(1);
    }
    
    const customer = customerProduct.Customer;
    console.log(`✓ Found customer: ${customer.name} (ID: ${customer.customer_id})`);
    console.log(`✓ Found product: ${customerProduct.serial_no} (ID: ${customerProduct.customers_products_id})`);

    // Create test complaint
    console.log('\n📝 Creating test complaint...');
    const now = new Date();
    const timeString = now.toTimeString().slice(0, 8); // Format: HH:MM:SS
    const complaint = await Calls.create({
      customer_id: customer.customer_id,
      customer_product_id: customerProduct.customers_products_id,
      assigned_asc_id: null,
      call_type: 'complaint',
      call_source: 'phone',
      caller_type: 'customer',
      remark: 'Test complaint from automated test script',
      visit_date: now,
      visit_time: timeString,
      status_id: status.status_id,
      created_at: now
    });

    console.log(`✓ Complaint created successfully!`);
    console.log(`  - Call ID: ${complaint.call_id}`);
    console.log(`  - Customer: ${customer.name}`);
    console.log(`  - Product Serial: ${customerProduct.serial_no}`);
    console.log(`  - Type: ${complaint.call_type}`);
    console.log(`  - Remark: ${complaint.remark}`);

    console.log('\n✅ Complaint creation test PASSED\n');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error testing complaint creation:');
    console.error('  Message:', err && err.message ? err.message : err);
    console.error('  Stack:', err && err.stack ? err.stack : "No stack trace");
    process.exit(1);
  }
}

run();
