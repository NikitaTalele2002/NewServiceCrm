#!/usr/bin/env node

/**
 * Test script to verify that pincode is properly returned
 * throughout the complaint registration workflow
 * 
 * Workflow:
 * 1. Register a new customer (should return pincode)
 * 2. Register a new product for that customer
 * 3. Register a complaint for that product (should return customer WITH pincode)
 */

import axios from 'axios';
import { randomBytes } from 'crypto';

const API_BASE = 'http://localhost:5000/api';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  step: (num, msg) => console.log(`\n${colors.blue}━━━ Step ${num}: ${msg} ━━━${colors.reset}`),
};

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testPincodeFix() {
  try {
    const uniqueId = randomBytes(4).toString('hex');
    const testMobile = '98765' + uniqueId.substring(0, 5);
    
    // Step 1: Register a new customer with pincode
    log.step(1, 'Register new customer with pincode');
    
    const customerPayload = {
      name: `Test Customer ${uniqueId}`,
      mobile_no: testMobile,
      email: `test.${uniqueId}@example.com`,
      house_no: '123',
      street_name: 'Test Street',
      building_name: 'Test Building',
      area: 'Test Area',
      landmark: 'Test Landmark',
      city_id: 1,
      state_id: 1,
      pincode: '123456',  // IMPORTANT: Including pincode here
      customer_priority: 'medium'
    };

    log.info('Registering customer with pincode: 123456');
    const customerRes = await axios.post(`${API_BASE}/call-center/customer`, customerPayload);
    
    if (!customerRes.data.success) {
      log.error(`Failed to register customer: ${customerRes.data.error}`);
      process.exit(1);
    }

    const customer = customerRes.data.customer;
    log.success(`Customer registered: ${customer.customer_id}`);
    
    // CRITICAL CHECK 1: Verify pincode is in response
    if (!customer.address || !customer.address.pincode) {
      log.error('❌ FAILED: Pincode missing in customer registration response!');
      log.error(`Response: ${JSON.stringify(customer, null, 2)}`);
      process.exit(1);
    }
    
    if (customer.address.pincode !== '123456') {
      log.error(`❌ FAILED: Pincode mismatch! Expected 123456, got ${customer.address.pincode}`);
      process.exit(1);
    }
    
    log.success(`✅ Pincode correctly returned in customer registration: ${customer.address.pincode}`);
    console.log(`   Address: ${customer.address.house_no}, ${customer.address.street_name}, ${customer.address.area}`);
    console.log(`   Pincode: ${customer.address.pincode}`);

    // Step 2: Register a product for this customer
    log.step(2, 'Register a new product for the customer');
    
    const productPayload = {
      product_id: 1,  // Assuming product ID 1 exists
      model_id: 1,     // Assuming model ID 1 exists
      serial_no: `TEST-${uniqueId.toUpperCase()}`,
      date_of_purchase: '2024-01-15',
      qty_with_customer: 1
    };

    log.info(`Registering product with serial: ${productPayload.serial_no}`);
    const productRes = await axios.post(
      `${API_BASE}/call-center/customer/${customer.customer_id}/product`,
      productPayload
    );

    if (!productRes.data.success) {
      log.warning(`Product registration returned: ${productRes.data.message}`);
      // Continue anyway as this might be optional
    }

    const product = productRes.data.customer_product;
    log.success(`Product registered: ${product?.customers_products_id || 'N/A'}`);

    // Step 3: Register complaint for this product
    log.step(3, 'Register complaint for the product (THIS IS WHAT WE\'RE TESTING)');
    
    const complaintPayload = {
      customer_id: customer.customer_id,
      customer_product_id: product?.customers_products_id || null,
      remark: 'Test complaint to verify pincode is returned',
      visit_date: new Date().toISOString().split('T')[0],
      visit_time: new Date().toTimeString().slice(0, 5),
      assigned_asc_id: null
    };

    log.info('Registering complaint...');
    const complaintRes = await axios.post(
      `${API_BASE}/call-center/complaint`,
      complaintPayload
    );

    if (!complaintRes.data.success) {
      log.error(`Failed to register complaint: ${complaintRes.data.error}`);
      process.exit(1);
    }

    const call = complaintRes.data.call;
    const complaintCustomer = complaintRes.data.customer;
    
    log.success(`Complaint/Call registered: ${call.call_id}`);

    // CRITICAL CHECK 2: Verify customer data is in complaint response
    if (!complaintCustomer) {
      log.error('❌ FAILED: Customer data missing in complaint registration response!');
      log.error(`Response: ${JSON.stringify(complaintRes.data, null, 2)}`);
      process.exit(1);
    }

    log.success('✅ Customer data included in complaint response');

    // CRITICAL CHECK 3: Verify pincode is in complaint response
    if (!complaintCustomer.address || !complaintCustomer.address.pincode) {
      log.error('❌ FAILED: Pincode missing in complaint registration response!');
      log.error(`Customer data: ${JSON.stringify(complaintCustomer, null, 2)}`);
      process.exit(1);
    }

    if (complaintCustomer.address.pincode !== '123456') {
      log.error(`❌ FAILED: Pincode mismatch in complaint response! Expected 123456, got ${complaintCustomer.address.pincode}`);
      process.exit(1);
    }

    log.success(`✅ Pincode correctly returned in complaint registration: ${complaintCustomer.address.pincode}`);
    console.log(`   Customer: ${complaintCustomer.name}`);
    console.log(`   Mobile: ${complaintCustomer.mobile_no}`);
    console.log(`   Address: ${complaintCustomer.address.house_no}, ${complaintCustomer.address.street_name}, ${complaintCustomer.address.area}`);
    console.log(`   Pincode: ${complaintCustomer.address.pincode}`);

    // Summary
    log.step('✅', 'TEST PASSED - All pincode checks successful!');
    console.log(`\n${colors.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
    console.log(`${colors.green}✅ PINCODE FIX VERIFIED - Workflow complete!${colors.reset}`);
    console.log(`${colors.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
    
    process.exit(0);

  } catch (err) {
    log.error(`Test failed with error: ${err.message}`);
    if (err.response?.data) {
      log.error(`API Response: ${JSON.stringify(err.response.data, null, 2)}`);
    }
    process.exit(1);
  }
}

// Run the test
testPincodeFix();
