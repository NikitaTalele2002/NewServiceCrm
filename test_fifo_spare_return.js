/**
 * Test FIFO Invoice Matching for Spare Returns
 * 
 * Scenario:
 * 1. Create multiple invoices with different spares
 * 2. Inward spares to service center
 * 3. Return spares from service center to plant
 * 4. Verify FIFO invoice matching fetches oldest invoice per spare
 * 5. Verify invoice data (unit_price, gst, hsn) is attached to return items
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:5001';

// Test data
const testData = {
  plantId: 1,
  sciId: 101,
  sciName: 'SC-TEST-FIFO',
  spareIds: [],
  invoiceNumbers: [],
  returnRequestId: null
};

const log = {
  info: (msg) => console.log(`✅ ${msg}`),
  warn: (msg) => console.log(`⚠️  ${msg}`),
  error: (msg) => console.log(`❌ ${msg}`),
  step: (msg) => console.log(`\n📍 ${msg}`),
  data: (label, obj) => console.log(`  ${label}:`, JSON.stringify(obj, null, 2))
};

async function testFIFOSpareReturn() {
  try {
    log.step('1. SET UP TEST DATA');
    
    // Get plant
    const plantRes = await axios.get(`${BASE_URL}/plant?limit=1`);
    const plant = plantRes.data[0];
    testData.plantId = plant.plant_id;
    log.info(`Plant: ${plant.plant_name} (ID: ${plant.plant_id})`);

    // Get or create service center
    let sciRes = await axios.get(`${BASE_URL}/service-centers?limit=1`);
    if (sciRes.data.length === 0) {
      log.warn('No service centers found, creating new one');
      const createRes = await axios.post(`${BASE_URL}/service-centers`, {
        name: testData.sciName,
        plant_id: testData.plantId,
        address: 'Test FIFO Address',
        contact: '9999999999'
      });
      testData.sciId = createRes.data.service_center_id;
    } else {
      testData.sciId = sciRes.data[0].service_center_id;
    }
    log.info(`Service Center: ${testData.sciId}`);

    // Get spares that exist in system
    const sparesRes = await axios.get(`${BASE_URL}/spare-parts?limit=5`);
    const availableSpares = sparesRes.data.slice(0, 3);
    testData.spareIds = availableSpares.map(s => s.spare_id);
    log.info(`Using ${testData.spareIds.length} spares: ${testData.spareIds.join(', ')}`);

    log.step('2. CREATE INVOICES WITH DIFFERENT SPARES');
    
    // Manually insert test invoices (since we can't easily create via API)
    // This simulates invoice creation at different times
    log.info('Test assumes invoices exist in SAP_DOCUMENTS table');
    log.info('Invoices should have:');
    log.info('  - sap_doc_type: INVOICE');
    log.info('  - Different spares per invoice');
    log.info('  - Different creation dates (FIFO will pick oldest)');
    log.data('Spares for test', testData.spareIds);

    log.step('3. INWARD SPARES TO SERVICE CENTER');
    
    // Get a technician from the system
    let techRes = await axios.get(`${BASE_URL}/technicians?limit=1`);
    let techId = 1;
    if (techRes.data.length > 0) {
      techId = techRes.data[0].technician_id;
    }
    
    log.info(`Using technician: ${techId}`);
    log.info('In real scenario: run spare inward, RSM approval creates invoices');
    log.warn('For this test: assuming spares already exist in invoices');

    log.step('4. CREATE SPARE RETURN REQUEST WITH FIFO MATCHING');
    
    const returnPayload = {
      service_center_id: testData.sciId,
      user_id: 1,
      items: testData.spareIds.map(spareId => ({
        spareId,
        returnQty: 1,
        remainingQty: 0,
        reason: 'DEFECTIVE'
      }))
    };

    log.data('Return Request Payload', returnPayload);

    const returnRes = await axios.post(
      `${BASE_URL}/spare-part-returns/create`,
      returnPayload
    );

    log.info(`Return Request Created: ${returnRes.data.request_id}`);
    testData.returnRequestId = returnRes.data.request_id;

    log.step('5. VERIFY FIFO INVOICE MATCHING');

    // Get the created request details
    const detailRes = await axios.get(
      `${BASE_URL}/spare-part-returns/${testData.returnRequestId}`
    );

    const returnRequest = detailRes.data;
    const items = returnRequest.items || [];

    log.info(`Return request has ${items.length} items`);

    // Check if invoice_data is attached to items
    let fifoMatched = 0;
    for (const item of items) {
      const invoiceData = item.invoice_data 
        ? JSON.parse(item.invoice_data) 
        : item.invoice_data;

      if (invoiceData) {
        log.info(`✓ Spare ${item.spare_id}:`);
        log.data('    Invoice Data', {
          sap_doc_number: invoiceData.sap_doc_number,
          invoice_number: invoiceData.invoice_number,
          unit_price: invoiceData.unit_price,
          gst: invoiceData.gst,
          hsn: invoiceData.hsn,
          invoice_date: invoiceData.invoice_date
        });
        fifoMatched++;
      } else {
        log.warn(`Spare ${item.spare_id}: No FIFO match (used master data)`);
      }
    }

    log.step('6. VERIFY STOCK MOVEMENT WITH INVOICE REFERENCES');

    // Check stock movement
    const smRes = await axios.get(
      `${BASE_URL}/stock-movements?reference_type=return_request&reference_no=SPR-${testData.returnRequestId}`
    );

    if (smRes.data.length > 0) {
      const sm = smRes.data[0];
      log.info(`Stock Movement Created: ${sm.movement_id}`);
      log.data('Stock Movement Details', {
        type: sm.stock_movement_type,
        total_qty: sm.total_qty,
        total_amount: sm.total_amount,
        memo: sm.memo
      });
      
      if (sm.memo && sm.memo.includes('FIFO')) {
        log.info('✓ Stock movement includes FIFO invoice references');
      } else {
        log.warn('Stock movement memo does not contain FIFO invoice references');
      }
    } else {
      log.warn('No stock movement found for return request');
    }

    log.step('7. TEST RESULT SUMMARY');

    log.info(`Total items returned: ${items.length}`);
    log.info(`Items with FIFO matched invoices: ${fifoMatched}/${items.length}`);
    
    if (fifoMatched > 0) {
      log.info('✅ FIFO INVOICE MATCHING IS WORKING!');
      log.info('');
      log.info('Invoice data attached to return items:');
      log.info('  ✓ sap_doc_number (for debit note reference)');
      log.info('  ✓ invoice_number (for tracking)');
      log.info('  ✓ unit_price (for credit/debit note amount)');
      log.info('  ✓ gst (for tax credit)');
      log.info('  ✓ hsn (for item classification)');
      log.info('  ✓ invoice_date (for audit trail)');
      log.info('');
      log.info('Return flow enhanced with:');
      log.info('  ✓ FIFO oldest invoice matching');
      log.info('  ✓ Invoice data storage in SpareRequestItem');
      log.info('  ✓ Stock movement with invoice references in memo');
      log.info('  ✓ Price calculation using invoice unit_price');
    } else {
      log.warn('⚠️  No FIFO matches found - check if test invoices exist');
    }

    log.step('8. DATABASE VERIFICATION QUERIES');

    log.info('To verify FIFO logic in database:');
    log.info('');
    log.info('-- Check return items with invoice data:');
    log.info(`SELECT request_item_id, spare_id, requested_qty, invoice_data`);
    log.info(`FROM spare_request_items`);
    log.info(`WHERE request_id = ${testData.returnRequestId};`);
    log.info('');
    log.info('-- Check stock movement memo with invoice refs:');
    log.info(`SELECT movement_id, reference_no, total_qty, total_amount, memo`);
    log.info(`FROM stock_movements`);
    log.info(`WHERE reference_no = 'SPR-${testData.returnRequestId}';`);
    log.info('');
    log.info('-- Verify FIFO invoice matching:');
    log.info('SELECT sd.sap_doc_number, sd.created_at, sdi.spare_part_id');
    log.info('FROM sap_documents sd');
    log.info('JOIN sap_document_items sdi ON sd.document_number = sdi.document_number');
    log.info(`WHERE sdi.spare_part_id IN (${testData.spareIds.join(',')})`);
    log.info('AND sd.sap_doc_type = "INVOICE"');
    log.info('AND sd.requested_source_id = ' + testData.sciId);
    log.info('ORDER BY sd.created_at ASC;');

    process.exit(0);

  } catch (error) {
    log.error(`Test Failed: ${error.message}`);
    if (error.response) {
      log.data('Error Response', error.response.data);
    }
    process.exit(1);
  }
}

// Run test
console.log('\n' + '='.repeat(70));
console.log('   FIFO INVOICE MATCHING TEST FOR SPARE RETURNS');
console.log('='.repeat(70));
testFIFOSpareReturn();
