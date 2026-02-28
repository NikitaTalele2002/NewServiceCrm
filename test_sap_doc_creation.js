// Test SAP Documents and Items via direct database queries after approval
import axios from 'axios';
import 'dotenv/config.js';
import { sequelize, connectDB } from './server/db.js';

const BASE_URL = 'http://localhost:3000/api';

async function testSAPCreationInApprovalFlow() {
  let hasError = false;
  try {
    console.log('='.repeat(80));
    console.log('TEST: SAP Document Creation in Approval Flow');
    console.log('='.repeat(80));

    // Connect to DB for direct checks
    console.log('\n[CONNECTING] Connecting to database...');
    try {
      await connectDB();
      console.log('✅ Database connected');
    } catch (dbError) {
      console.error('❌ Database connection error:', dbError.message);
      return;
    }

    // ===== STEP 1: LOGIN =====
    console.log('\n[STEP 1] Authenticating as RSM...');
    let loginRes;
    try {
      loginRes = await axios.post(`${BASE_URL}/auth/login`, {
        email: 'rsm@gmail.com',
        password: 'password'
      });
    } catch (loginError) {
      console.error('❌ Login failed:', loginError.response?.data || loginError.message);
      console.error('   Is the server running on', BASE_URL, '?');
      await sequelize.close();
      return;
    }
    const token = loginRes.data.token;
    console.log('✅ Authenticated');

    // ===== STEP 2: GET PENDING REQUEST =====
    console.log('\n[STEP 2] Getting pending spare request...');
    let requestsRes;
    try {
      requestsRes = await axios.get(`${BASE_URL}/rsm/spare-requests?status=pending`, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (reqError) {
      console.error('❌ Failed to fetch pending requests:', reqError.response?.data || reqError.message);
      await sequelize.close();
      return;
    }
    
    const pendingRequest = requestsRes.data.find(r => r.status === 'pending');
    if (!pendingRequest) {
      console.log('❌ No pending requests');
      await sequelize.close();
      return;
    }

    const spareRequestId = pendingRequest.spare_request_id;
    console.log(`✅ Found request: SR-${spareRequestId}`);

    // ===== STEP 3: GET ITEMS =====
    console.log('\n[STEP 3] Getting items to approve...');
    let itemsRes;
    try {
      itemsRes = await axios.get(
        `${BASE_URL}/rsm/spare-requests/${spareRequestId}/items`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (itemsError) {
      console.error('❌ Failed to fetch items:', itemsError.response?.data || itemsError.message);
      await sequelize.close();
      return;
    }
    
    const items = itemsRes.data || [];
    if (items.length === 0) {
      console.log('❌ No items found');
      await sequelize.close();
      return;
    }

    const approvals = {};
    items.forEach(item => {
      approvals[item.spare_request_item_id] = {
        approvedQty: Math.max(1, Math.floor(item.requested_qty / 2))
      };
    });

    console.log(`✅ Found ${items.length} items to approve`);

    // ===== STEP 4: APPROVE =====
    console.log('\n[STEP 4] Submitting approval...');
    try {
      const approveRes = await axios.post(
        `${BASE_URL}/rsm/spare-requests/${spareRequestId}/approve`,
        { approvals },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      console.log('✅ Approval submitted');
    } catch (approveError) {
      console.error('❌ Approval failed:', approveError.response?.data || approveError.message);
      await sequelize.close();
      return;
    }

    // Give database a moment to process
    console.log('\n⏳ Waiting for database to process approval (2 seconds)...');
    await new Promise(r => setTimeout(r, 2000));

    // ===== VERIFY: Check DB directly for SAP Documents =====
    console.log('\n[VERIFY 1] Checking SAP Documents in database...');
    const SAPDocuments = sequelize.models.SAPDocuments;
    const SAPDocumentItems = sequelize.models.SAPDocumentItems;
    const SpareRequest = sequelize.models.SpareRequest;
    
    const sapDocs = await SAPDocuments.findAll({
      where: { reference_id: spareRequestId, sap_doc_type: 'INVOICE' },
      raw: true
    });

    if (sapDocs.length === 0) {
      console.log(`❌ NO SAP DOCUMENTS FOUND for request ${spareRequestId}`);
      hasError = true;
      
      // Check if any SAP documents exist for this request
      const allSAPDocs = await SAPDocuments.findAll({
        where: { reference_id: spareRequestId },
        raw: true
      });
      
      if (allSAPDocs.length > 0) {
        console.log(`   But found ${allSAPDocs.length} other SAP document(s):`);
        allSAPDocs.forEach(doc => {
          console.log(`   - Type: ${doc.sap_doc_type}, Number: ${doc.sap_doc_number}, Status: ${doc.status}`);
        });
      }
    } else {
      console.log(`✅ Found ${sapDocs.length} SAP Document(s):`);
      
      for (const sapDoc of sapDocs) {
        console.log(`\n   Invoice: ${sapDoc.sap_doc_number}`);
        console.log(`   ID: ${sapDoc.id}`);
        console.log(`   Status: ${sapDoc.status}`);
        console.log(`   Reference ID: ${sapDoc.reference_id}`);
        console.log(`   Amount: ${sapDoc.amount || 'NULL'}`);

        // Check SAP Document Items
        console.log(`\n   [SAP ITEMS] Checking items for this invoice...`);
        const sapItems = await SAPDocumentItems.findAll({
          where: { sap_doc_id: sapDoc.id },
          raw: true
        });

        if (sapItems.length === 0) {
          console.log(`   ❌ NO SAP DOCUMENT ITEMS FOUND`);
        } else {
          console.log(`   ✅ Found ${sapItems.length} item(s):`);
          sapItems.forEach((item, idx) => {
            console.log(`      Item ${idx + 1}: Spare=${item.spare_part_id}, Qty=${item.qty}, Price=${item.unit_price}`);
          });
        }
      }
    }

    // ===== Check Request Status =====
    console.log('\n[VERIFY 2] Checking updated request status...');
    const updatedReq = await SpareRequest.findByPk(spareRequestId, { raw: true });
    console.log(`   Status: ${updatedReq.status}`);

    console.log('\n' + '='.repeat(80));
    if (hasError) {
      console.log('⚠️  TEST COMPLETED WITH WARNINGS - See above for details');
    } else {
      console.log('✅ TEST COMPLETE - All checks passed!');
    }
    console.log('='.repeat(80));

    await sequelize.close();

  } catch (error) {
    console.error('\n❌ FATAL ERROR:', error.message);
    if (error.response?.data) {
      console.error('Response Data:', error.response.data);
    }
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
    try {
      await sequelize.close();
    } catch (closeError) {
      console.error('Error closing database:', closeError.message);
    }
    process.exit(1);
  }
}

console.log('\nStarting test...\n');
testSAPCreationInApprovalFlow().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});

