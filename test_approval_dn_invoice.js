// Test updated approval with DN and Invoice generation
import axios from 'axios';

const BASE_URL = 'http://localhost:3000/api';

async function testApprovalWithDNandInvoice() {
  try {
    console.log('='.repeat(70));
    console.log('TEST: RSM Approval → DN Creation → Invoice Generation');
    console.log('='.repeat(70));

    // 1. LOGIN as RSM
    console.log('\n[1] Login as RSM...');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'rsm@gmail.com',
      password: 'password'
    });
    const token = loginRes.data.token;
    console.log('✅ Logged in as RSM');

    // 2. Get pending requests
    console.log('\n[2] Fetching pending spare requests...');
    const requestsRes = await axios.get(`${BASE_URL}/rsm/spare-requests?status=pending`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const pendingRequest = requestsRes.data.find(r => r.status === 'pending');
    if (!pendingRequest) {
      console.log('❌ No pending requests found');
      return;
    }
    
    const requestId = pendingRequest.spare_request_id;
    console.log(`✅ Found pending request: SR-${requestId}`);

    // 3. Get items for approval
    console.log('\n[3] Fetching request items...');
    const itemsRes = await axios.get(`${BASE_URL}/rsm/spare-requests/${requestId}/items`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const items = itemsRes.data || [];
    console.log(`✅ Found ${items.length} items in request`);

    const approvals = {};
    items.forEach((item, idx) => {
      approvals[item.spare_request_item_id] = {
        approvedQty: Math.max(1, Math.floor(item.requested_qty / 2))
      };
    });

    // 4. Approve the request
    console.log('\n[4] Approving spare request...');
    const approveRes = await axios.post(
      `${BASE_URL}/rsm/spare-requests/${requestId}/approve`,
      { approvals },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('✅ Request approved');

    // 5. Check Logistics Documents (DN)
    console.log('\n[5] Verifying Delivery Note creation...');
    const logisticsRes = await axios.get(
      `${BASE_URL}/logistics/documents?reference_id=${requestId}&type=DN`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    if (logisticsRes.data.length === 0) {
      console.log('⚠️  No Delivery Note found yet');
    } else {
      const dnDoc = logisticsRes.data[0];
      console.log(`✅ Delivery Note created: ${dnDoc.document_number}`);
    }

    // 6. Check Stock Movement
    console.log('\n[6] Verifying Stock Movement creation...');
    const stockMovementRes = await axios.get(
      `${BASE_URL}/stock-movements?reference_no=${logisticsRes.data[0]?.document_number || `SR-${requestId}`}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    if (stockMovementRes.data.length === 0) {
      console.log('⚠️  No stock movement found');
    } else {
      const movement = stockMovementRes.data[0];
      console.log(`✅ Stock Movement created:`);
      console.log(`   Reference Type: ${movement.reference_type}`);
      console.log(`   Reference No: ${movement.reference_no}`);
      console.log(`   Source: ${movement.source_location_type} (ID: ${movement.source_location_id})`);
      console.log(`   Destination: ${movement.destination_location_type} (ID: ${movement.destination_location_id})`);
    }

    // 7. Check SAP Documents (Invoice)
    console.log('\n[7] Verifying Invoice creation in SAP documents...');
    const sapRes = await axios.get(
      `${BASE_URL}/sap-documents?reference_id=${requestId}&type=INVOICE`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    
    if (sapRes.data.length === 0) {
      console.log('⚠️  No invoice found in SAP documents');
    } else {
      const invoice = sapRes.data[0];
      console.log(`✅ Invoice created in SAP documents:`);
      console.log(`   Invoice Number: ${invoice.sap_doc_number}`);
      console.log(`   Reference ID: ${invoice.reference_id}`);
      console.log(`   Status: ${invoice.status}`);
    }

    console.log('\n' + '='.repeat(70));
    console.log('TEST COMPLETE: Check results above');
    console.log('Expected: DN created, Stock movement with DN reference, Invoice generated');
    console.log('='.repeat(70));

  } catch (error) {
    console.error('\n❌ Test Error:', error.response?.data || error.message);
  }
}

testApprovalWithDNandInvoice();
