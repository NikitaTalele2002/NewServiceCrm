/**
 * Test Complaint Registration Flow
 * Tests the complete flow: customer lookup -> product lookup -> complaint registration
 * Usage: node test_complaint_flow.js
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5000/api';

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  header: (msg) => console.log(`\n${colors.cyan}${colors.bright}════ ${msg} ════${colors.reset}`),
  step: (num, msg) => console.log(`\n${colors.blue}Step ${num}: ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
};

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function makeRequest(method, endpoint, body = null) {
  try {
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      }
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const res = await fetch(`${API_BASE}${endpoint}`, options);
    const data = await res.json();

    return {
      status: res.status,
      ok: res.ok,
      data
    };
  } catch (err) {
    return {
      status: 0,
      ok: false,
      error: err.message
    };
  }
}

async function testComplaintFlow() {
  log.header('COMPLAINT REGISTRATION FLOW TEST');

  try {
    // Step 1: Find a customer
    log.step(1, 'Looking up customer');
    
    // Use a real mobile number - adjust this as needed
    const mobileNo = '09766814799';
    log.info(`Searching for customer with mobile: ${mobileNo}`);
    
    const customerRes = await makeRequest('GET', `/call-center/customer/${mobileNo}`);
    
    if (!customerRes.ok) {
      log.error(`Customer lookup failed: ${customerRes.data?.error || 'Unknown error'}`);
      log.info('Note: If customer not found, you need to create one first');
      process.exit(1);
    }

    const customer = customerRes.data.customer;
    if (!customer || !customer.customer_id) {
      log.error('Invalid customer response');
      process.exit(1);
    }

    log.success(`Found customer: ${customer.name} (ID: ${customer.customer_id})`);
    console.log(`  Mobile: ${customer.mobile_no}`);
    console.log(`  Email: ${customer.email || 'N/A'}`);
    console.log(`  Pincode: ${customer.address?.pincode || 'N/A'}`);

    // Step 2: Get a product for the customer
    log.step(2, 'Getting customer products');

    const products = customerRes.data.products || [];
    if (products.length === 0) {
      log.error('No products found for this customer');
      log.info('Note: Customer must have at least one registered product to register a complaint');
      process.exit(1);
    }

    const product = products[0];
    log.success(`Found product: ${product.product_name} (ID: ${product.customers_products_id})`);
    console.log(`  Model: ${product.model_code || 'N/A'}`);
    console.log(`  Serial: ${product.serial_no || 'N/A'}`);
    console.log(`  Warranty: ${product.warranty_status || 'N/A'}`);

    // Step 3: Register complaint
    log.step(3, 'Registering complaint');

    const complaintPayload = {
      customer_id: customer.customer_id,
      customer_product_id: product.customers_products_id,
      remark: 'Test complaint registration - Product not working',
      visit_date: new Date().toISOString().split('T')[0],
      visit_time: new Date().toTimeString().slice(0, 5),
      assigned_asc_id: null,
      created_by: null
    };

    log.info('Submitting complaint with data:');
    console.log(`  Customer ID: ${complaintPayload.customer_id}`);
    console.log(`  Product ID: ${complaintPayload.customer_product_id}`);
    console.log(`  Remark: ${complaintPayload.remark}`);
    console.log(`  Visit Date: ${complaintPayload.visit_date}`);
    console.log(`  Visit Time: ${complaintPayload.visit_time}`);

    const complaintRes = await makeRequest('POST', '/call-center/complaint', complaintPayload);

    if (!complaintRes.ok) {
      log.error(`Complaint registration failed with status ${complaintRes.status}`);
      log.error(`Error: ${complaintRes.data?.error || 'Unknown error'}`);
      if (complaintRes.data?.details) {
        log.info(`Details: ${complaintRes.data.details}`);
      }
      process.exit(1);
    }

    const call = complaintRes.data.call;
    if (!call || !call.call_id) {
      log.error('Invalid complaint response - no call ID');
      console.log('Response:', complaintRes.data);
      process.exit(1);
    }

    log.success(`Complaint registered successfully!`);
    console.log(`  Call ID: ${call.call_id}`);
    console.log(`  Customer ID: ${call.customer_id}`);
    console.log(`  Status ID: ${call.status_id}`);
    console.log(`  Type: ${call.call_type}`);
    console.log(`  Created: ${new Date(call.created_at).toLocaleString()}`);

    // Step 4: Verify complaint was created
    log.step(4, 'Verifying complaint in database');

    await sleep(500); // Wait a bit for database to confirm

    const verifyRes = await makeRequest('GET', `/call-center/complaints/by-service-center/1`);
    
    if (verifyRes.ok && verifyRes.data) {
      const complaints = verifyRes.data.complaints || [];
      const createdComplaint = complaints.find(c => c.call_id === call.call_id);
      
      if (createdComplaint) {
        log.success(`Complaint verified in database!`);
        console.log(`  Call Status: ${createdComplaint.status_id}`);
      } else {
        log.warning(`Complaint not found in service center list (may not be assigned)`);
      }
    }

    log.header('TEST COMPLETED SUCCESSFULLY');
    log.success('Complaint registration flow is working correctly!');

  } catch (err) {
    log.error(`Test failed: ${err.message}`);
    console.error(err);
    process.exit(1);
  }
}

// Run the test
testComplaintFlow();
