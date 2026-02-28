// Complete workflow verification: SpareRequest → DN → StockMovement → Invoice → SAP Items
import axios from 'axios';

const BASE_URL = 'http://localhost:3000/api';

async function verifyCompleteApprovalWorkflow() {
  try {
    console.log('='.repeat(80));
    console.log('COMPLETE WORKFLOW VERIFICATION: SpareRequest → DN → StockMovement → Invoice');
    console.log('='.repeat(80));

    // ===== STEP 1: LOGIN AS RSM =====
    console.log('\n[STEP 1] Authenticating as RSM...');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'rsm@gmail.com',
      password: 'password'
    });
    const token = loginRes.data.token;
    const rsmId = loginRes.data.user?.id;
    console.log('✅ RSM Authenticated');

    // ===== STEP 2: GET PENDING REQUEST =====
    console.log('\n[STEP 2] Fetching pending spare request...');
    const requestsRes = await axios.get(`${BASE_URL}/rsm/spare-requests?status=pending`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const pendingRequest = requestsRes.data.find(r => r.status === 'pending');
    if (!pendingRequest) {
      console.log('❌ No pending requests found');
      return;
    }
    
    const spareRequestId = pendingRequest.spare_request_id;
    const plantId = pendingRequest.requested_to_id;
    const serviceCenter = pendingRequest.requested_source_id;
    
    console.log(`✅ Found pending request: SR-${spareRequestId}`);
    console.log(`   Plant: ${plantId}, Service Center: ${serviceCenter}`);
    console.log(`   Status: ${pendingRequest.status}`);
    console.log(`   Type: ${pendingRequest.spare_request_type}`);

    // ===== STEP 3: GET REQUEST ITEMS =====
    console.log('\n[STEP 3] Fetching request items for approval...');
    const itemsRes = await axios.get(`${BASE_URL}/rsm/spare-requests/${spareRequestId}/items`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const itemsToApprove = itemsRes.data || [];
    if (itemsToApprove.length === 0) {
      console.log('❌ No items found in request');
      return;
    }
    
    console.log(`✅ Found ${itemsToApprove.length} items:`);
    const approvals = {};
    itemsToApprove.forEach(item => {
      const appQty = Math.max(1, Math.floor(item.requested_qty / 2));
      approvals[item.spare_request_item_id] = { approvedQty: appQty };
      console.log(`   - Item ${item.spare_request_item_id}: Requested=${item.requested_qty}, Approving=${appQty}`);
    });

    // ===== STEP 4: APPROVE THE REQUEST =====
    console.log('\n[STEP 4] Submitting approval...');
    const approveRes = await axios.post(
      `${BASE_URL}/rsm/spare-requests/${spareRequestId}/approve`,
      { approvals },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log('✅ Approval request submitted');

    // ===== VERIFY: Request Status Updated =====
    console.log('\n[VERIFY 1] Checking spare request status...');
    const updatedReqRes = await axios.get(
      `${BASE_URL}/spare-requests/${spareRequestId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const updatedRequest = updatedReqRes.data;
    const statusCorrect = updatedRequest.status === 'approved_by_rsm' || updatedRequest.status === 'approved';
    console.log(`   Status: ${updatedRequest.status} ${statusCorrect ? '✅' : '❌'}`);

    // ===== VERIFY: Items Approved =====
    console.log('\n[VERIFY 2] Checking spare request items approval...');
    const itemsCheckRes = await axios.get(
      `${BASE_URL}/rsm/spare-requests/${spareRequestId}/items`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const approvedItems = itemsCheckRes.data.filter(i => i.approved_qty > 0);
    console.log(`   Items with approved_qty > 0: ${approvedItems.length} ${approvedItems.length > 0 ? '✅' : '❌'}`);
    approvedItems.forEach(item => {
      console.log(`     - Item ${item.spare_request_item_id}: approved_qty=${item.approved_qty}`);
    });

    // ===== VERIFY: Delivery Note Created =====
    console.log('\n[VERIFY 3] Checking Delivery Note in logistics_documents...');
    const logisticsRes = await axios.get(
      `${BASE_URL}/logistics/documents?reference_id=${spareRequestId}&type=DN`,
      { headers: { Authorization: `Bearer ${token}` } }
    ).catch(() => ({ data: [] }));
    
    const deliveryNote = logisticsRes.data?.[0];
    if (deliveryNote) {
      console.log(`   ✅ DN Created: ${deliveryNote.document_number}`);
      console.log(`      ID: ${deliveryNote.id}`);
      console.log(`      From: ${deliveryNote.from_entity_type} (ID: ${deliveryNote.from_entity_id})`);
      console.log(`      To: ${deliveryNote.to_entity_type} (ID: ${deliveryNote.to_entity_id})`);
      console.log(`      Status: ${deliveryNote.status}`);
    } else {
      console.log(`   ❌ No Delivery Note found`);
    }

    // ===== VERIFY: Stock Movement Created =====
    console.log('\n[VERIFY 4] Checking Stock Movement...');
    const dnNumber = deliveryNote?.document_number || `SR-${spareRequestId}`;
    const movementRes = await axios.get(
      `${BASE_URL}/stock-movements?reference_no=${dnNumber}`,
      { headers: { Authorization: `Bearer ${token}` } }
    ).catch(() => ({ data: [] }));
    
    const stockMovement = movementRes.data?.[0];
    if (stockMovement) {
      console.log(`   ✅ Stock Movement Created: ID=${stockMovement.movement_id}`);
      console.log(`      Reference Type: ${stockMovement.reference_type} (Expected: DN)`);
      console.log(`      Reference No: ${stockMovement.reference_no}`);
      console.log(`      Type: ${stockMovement.stock_movement_type}`);
      console.log(`      Source: ${stockMovement.source_location_type} (ID: ${stockMovement.source_location_id})`);
      console.log(`      Destination: ${stockMovement.destination_location_type} (ID: ${stockMovement.destination_location_id})`);
      console.log(`      Qty: ${stockMovement.total_qty}`);
      console.log(`      Status: ${stockMovement.status}`);
      
      // Check if reference is DN not SR
      const referenceCorrect = stockMovement.reference_type === 'DN' && stockMovement.reference_no === dnNumber;
      console.log(`      Reference is DN: ${referenceCorrect ? '✅' : '❌'}`);
    } else {
      console.log(`   ❌ No Stock Movement found for reference: ${dnNumber}`);
    }

    // ===== VERIFY: SAP Document (Invoice) Created =====
    console.log('\n[VERIFY 5] Checking SAP Document (Invoice)...');
    const sapRes = await axios.get(
      `${BASE_URL}/sap-documents?reference_id=${spareRequestId}&type=INVOICE`,
      { headers: { Authorization: `Bearer ${token}` } }
    ).catch(() => ({ data: [] }));
    
    const invoice = sapRes.data?.[0];
    if (invoice) {
      console.log(`   ✅ Invoice Created: ${invoice.sap_doc_number}`);
      console.log(`      ID: ${invoice.id}`);
      console.log(`      Reference ID: ${invoice.reference_id}`);
      console.log(`      Module Type: ${invoice.module_type}`);
      console.log(`      SAP Doc Type: ${invoice.sap_doc_type}`);
      console.log(`      Status: ${invoice.status}`);
      console.log(`      Created At: ${invoice.created_at}`);
    } else {
      console.log(`   ❌ No Invoice found in sap_documents for reference_id=${spareRequestId}`);
    }

    // ===== VERIFY: SAP Document Items Created =====
    console.log('\n[VERIFY 6] Checking SAP Document Items...');
    if (invoice) {
      const sapItemsRes = await axios.get(
        `${BASE_URL}/sap-document-items?sap_doc_id=${invoice.id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      ).catch(() => ({ data: [] }));
      
      const sapItems = sapItemsRes.data || [];
      if (sapItems.length > 0) {
        console.log(`   ✅ SAP Document Items Created: ${sapItems.length} items`);
        sapItems.forEach((item, idx) => {
          console.log(`      Item ${idx + 1}:`);
          console.log(`        - Spare Part ID: ${item.spare_part_id}`);
          console.log(`        - Qty: ${item.qty}`);
          console.log(`        - Unit Price: ${item.unit_price}`);
          console.log(`        - GST: ${item.gst}%`);
          console.log(`        - HSN: ${item.hsn || 'N/A'}`);
        });
      } else {
        console.log(`   ❌ No SAP Document Items found for invoice ID=${invoice.id}`);
      }
    }

    // ===== VERIFY: Inventory Updated =====
    console.log('\n[VERIFY 7] Checking Inventory Updates...');
    try {
      // Check plant inventory (should be decreased)
      const plantInventoriesRes = await axios.get(
        `${BASE_URL}/inventory?location_id=${plantId}&location_type=plant`,
        { headers: { Authorization: `Bearer ${token}` } }
      ).catch(() => ({ data: [] }));
      
      console.log(`   Plant Inventory (ID=${plantId}):`);
      const plantInventories = plantInventoriesRes.data || [];
      if (plantInventories.length > 0) {
        plantInventories.forEach(inv => {
          console.log(`     - Spare ${inv.spare_id}: qty_good=${inv.qty_good}, qty_defective=${inv.qty_defective}`);
        });
        console.log(`   ✅ Plant inventory checked`);
      } else {
        console.log(`   ⚠️  Could not fetch plant inventory details`);
      }

      // Check service center inventory (should be increased)
      const scInventoriesRes = await axios.get(
        `${BASE_URL}/inventory?location_id=${serviceCenter}&location_type=service_center`,
        { headers: { Authorization: `Bearer ${token}` } }
      ).catch(() => ({ data: [] }));
      
      console.log(`   Service Center Inventory (ID=${serviceCenter}):`);
      const scInventories = scInventoriesRes.data || [];
      if (scInventories.length > 0) {
        scInventories.forEach(inv => {
          console.log(`     - Spare ${inv.spare_id}: qty_good=${inv.qty_good}, qty_defective=${inv.qty_defective}`);
        });
        console.log(`   ✅ Service center inventory checked`);
      } else {
        console.log(`   ⚠️  Could not fetch service center inventory details`);
      }
    } catch (error) {
      console.log(`   ⚠️  Inventory check failed: ${error.message}`);
    }

    // ===== FINAL SUMMARY =====
    console.log('\n' + '='.repeat(80));
    console.log('WORKFLOW VERIFICATION SUMMARY');
    console.log('='.repeat(80));
    
    const checks = {
      'Spare Request Status Updated': statusCorrect,
      'Items Marked as Approved': approvedItems.length > 0,
      'Delivery Note Created': !!deliveryNote,
      'Stock Movement Created': !!stockMovement,
      'Stock Movement References DN': stockMovement?.reference_type === 'DN',
      'Invoice (SAP Document) Created': !!invoice,
      'SAP Document Items Created': (sapItemsRes.data?.length || 0) > 0
    };

    let passCount = 0;
    let failCount = 0;
    
    for (const [check, passed] of Object.entries(checks)) {
      const status = passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${status}: ${check}`);
      if (passed) passCount++;
      else failCount++;
    }

    console.log('='.repeat(80));
    console.log(`RESULT: ${passCount} passed, ${failCount} failed`);
    
    if (failCount === 0) {
      console.log('🎉 ALL WORKFLOW STEPS COMPLETED SUCCESSFULLY!');
    } else {
      console.log(`⚠️  ${failCount} STEP(S) FAILED - Please review above`);
    }
    console.log('='.repeat(80));

  } catch (error) {
    console.error('\n❌ TEST ERROR:', error.response?.data || error.message);
    console.error('Stack:', error.stack);
  }
}

verifyCompleteApprovalWorkflow();
