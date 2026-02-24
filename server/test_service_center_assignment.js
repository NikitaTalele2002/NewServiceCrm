/**
 * Test Script: Service Center Assignment Workflow
 * Tests the complete flow:
 * 1. Search for customer by mobile
 * 2. Create complaint for customer's product
 * 3. Fetch service centers serving the customer's pincode
 * 4. Assign complaint to selected service center
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = 'http://localhost:3001/api/call-center';
const CUSTOMER_MOBILE = '7850669444'; // Nikita Talele's number
const TEST_HEADERS = {
  'Content-Type': 'application/json',
};

async function test() {
  try {
    console.log('\n========== SERVICE CENTER ASSIGNMENT WORKFLOW TEST ==========\n');

    // Step 1: Lookup customer
    console.log('Step 1: Looking up customer by mobile number...');
    const lookupRes = await fetch(`${BASE_URL}/customer/${CUSTOMER_MOBILE}`, {
      method: 'GET',
      headers: TEST_HEADERS,
    });

    const lookupData = await lookupRes.json();

    if (!lookupRes.ok || !lookupData.customer) {
      console.error('❌ Customer lookup failed:', lookupData);
      return;
    }

    const customer = lookupData.customer;
    console.log(`✅ Customer found: ${customer.name} (ID: ${customer.customer_id})`);
    console.log(`   Pincode: ${customer.pincode}`);

    // Step 2: Get first product
    if (!lookupData.products || lookupData.products.length === 0) {
      console.error('❌ No products found for customer');
      return;
    }

    const product = lookupData.products[0];
    console.log(`✅ Product selected: ${product.product_name}`);

    // Step 3: Fetch service centers for customer's pincode
    console.log(`\nStep 2: Fetching service centers for pincode ${customer.pincode}...`);
    const serviceCentersRes = await fetch(
      `${BASE_URL}/service-centers/pincode/${customer.pincode}`,
      {
        method: 'GET',
        headers: TEST_HEADERS,
      }
    );

    const serviceCentersData = await serviceCentersRes.json();

    if (!serviceCentersRes.ok) {
      console.error('❌ Failed to fetch service centers:', serviceCentersData);
      return;
    }

    const serviceCenters = serviceCentersData.serviceCenters || [];
    if (serviceCenters.length === 0) {
      console.error('❌ No service centers found for this pincode');
      return;
    }

    console.log(`✅ Found ${serviceCenters.length} service center(s):`);
    serviceCenters.forEach(sc => {
      console.log(`   - ${sc.asc_name} (${sc.asc_code})`);
      console.log(`     Location Type: ${sc.location_type}`);
      console.log(`     Distance: ${sc.two_way_distance} km`);
    });

    const selectedASC = serviceCenters[0];

    // Step 4: Register complaint
    console.log(`\nStep 3: Registering complaint...`);
    const complaintPayload = {
      customer_id: customer.customer_id,
      customer_product_id: product.customers_products_id,
      complaint_description: 'Test complaint for service center assignment',
      visit_date: new Date().toISOString().split('T')[0],
      visit_time: new Date().toTimeString().split(' ')[0],
    };

    const complaintRes = await fetch(`${BASE_URL}/complaint`, {
      method: 'POST',
      headers: TEST_HEADERS,
      body: JSON.stringify(complaintPayload),
    });

    const complaintData = await complaintRes.json();

    if (!complaintRes.ok || !complaintData.call) {
      console.error('❌ Complaint registration failed:', complaintData);
      return;
    }

    const callId = complaintData.call.call_id;
    console.log(`✅ Complaint registered (Call ID: ${callId})`);

    // Step 5: Assign complaint to service center
    console.log(`\nStep 4: Assigning complaint to service center...`);
    const assignPayload = {
      call_id: callId,
      asc_id: selectedASC.asc_id,
      assigned_by: 'test-script',
    };

    const assignRes = await fetch(`${BASE_URL}/complaint/assign-asc`, {
      method: 'POST',
      headers: TEST_HEADERS,
      body: JSON.stringify(assignPayload),
    });

    const assignData = await assignRes.json();

    if (!assignRes.ok) {
      console.error('❌ Assignment failed:', assignData);
      return;
    }

    const assignedCall = assignData.call;
    console.log(`✅ Complaint assigned successfully!`);
    console.log(`   Call ID: ${assignedCall.call_id}`);
    console.log(`   Assigned ASC ID: ${assignedCall.assigned_asc_id}`);
    if (assignedCall.service_center) {
      console.log(`   Service Center: ${assignedCall.service_center.asc_name}`);
    }

    console.log('\n========== TEST COMPLETED SUCCESSFULLY ==========\n');
  } catch (err) {
    console.error('❌ Test failed with error:', err.message);
  }
}

test();
