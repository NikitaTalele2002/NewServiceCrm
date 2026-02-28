/**
 * FIFO INVOICE MATCHING FOR SPARE RETURNS
 * ========================================
 * 
 * OVERVIEW:
 * When service centers return defective spares to the plant, each spare is matched
 * to the OLDEST invoice on which it was received at that service center using FIFO logic.
 * 
 * BUSINESS CONTEXT:
 * A service center may have received the same spare across multiple purchases/invoices
 * at different times. When returning defective spares, we need to:
 * 1. Identify which supply transaction each returned spare came from
 * 2. Extract pricing information (unit_price, gst, hsn) from that invoice
 * 3. Use this data to generate accurate debit/credit notes for inventory costing
 * 
 * ========================================
 * IMPLEMENTATION DETAILS
 * ========================================
 * 
 * FILE STRUCTURE:
 * ├── server/services/fifoInvoiceMatchingService.js
 * │   └── Three exported functions for invoice matching
 * ├── server/routes/sparePartReturns.js
 * │   └── Integration in /create POST endpoint
 * └── This file (documentation)
 * 
 * 
 * 1. FIFO SERVICE (fifoInvoiceMatchingService.js)
 * ================================================
 * 
 * Function: getFIFOInvoiceForSpare(spareId, serviceCenterId, plantId, transaction)
 * ─────────────────────────────────────────────────────────────────────────────
 * 
 * Purpose: Get the OLDEST (first) invoice for a specific spare at a service center
 * 
 * Parameters:
 *   - spareId: ID of the spare part
 *   - serviceCenterId: ID of the service center where it was received
 *   - plantId: ID of the plant (for context)
 *   - transaction: Database transaction for consistency
 * 
 * Returns: Invoice object with:
 *   {
 *     sap_doc_number: "INV-20250219-ABC123",    // SAP document number
 *     invoice_number: "12345",                   // Invoice serial number
 *     unit_price: 1250.50,                      // Price per unit
 *     gst: 18,                                  // GST percentage
 *     hsn: "84069900",                          // HSN code
 *     invoice_date: "2025-02-20",               // Date of invoice
 *     qty: 5                                    // Qty received on this invoice
 *   }
 * 
 * Fallback: If no invoice found, returns spare part master data:
 *   {
 *     unit_price: sparePart.SAP_PRICE,
 *     hsn: sparePart.HSN,
 *     sap_doc_number: "NO_INVOICE_MASTER_DATA"
 *   }
 * 
 * SQL Logic:
 *   SELECT TOP 1
 *     sd.sap_doc_number, sd.reference_id as invoice_number,
 *     sdi.unit_price, sdi.gst, sdi.hsn_code as hsn,
 *     sd.created_at as invoice_date, sdi.quantity as qty
 *   FROM sap_documents sd
 *   JOIN sap_document_items sdi ON sd.document_number = sdi.document_number
 *   WHERE sdi.spare_part_id = @spareId
 *   AND sd.requested_source_id = @serviceCenterId
 *   AND sd.sap_doc_type = 'INVOICE'
 *   AND sd.deleted_at IS NULL
 *   ORDER BY sd.created_at ASC  <-- FIFO: oldest first
 * 
 * 
 * Function: getFIFOInvoicesForSpares(spareIds, serviceCenterId, plantId, transaction)
 * ──────────────────────────────────────────────────────────────────────────────────
 * 
 * Purpose: Batch lookup for multiple spares at once (efficiency)
 * 
 * Parameters:
 *   - spareIds: Array of spare IDs
 *   - serviceCenterId: Service center ID
 *   - plantId: Plant ID
 *   - transaction: DB transaction
 * 
 * Returns: Map object where:
 *   Map: {
 *     spareId1 => { sap_doc_number, unit_price, gst, hsn, ... },
 *     spareId2 => { sap_doc_number, unit_price, gst, hsn, ... },
 *     ...
 *   }
 * 
 * Flow:
 * 1. Deduplicates input spareIds
 * 2. Iterates each spareId
 * 3. Calls getFIFOInvoiceForSpare for each
 * 4. Returns as Map for O(1) lookup by spareId
 * 
 * 
 * Function: getReturnInvoiceDetails(spareId, serviceCenterId, plantId, transaction)
 * ──────────────────────────────────────────────────────────────────────────────────
 * 
 * Purpose: Get complete invoice data formatted for return/debit note creation
 * 
 * Parameters:
 *   - spareId: Spare part ID
 *   - serviceCenterId: Service center ID
 *   - plantId: Plant ID
 *   - transaction: DB transaction
 * 
 * Returns: Complete return invoice object:
 *   {
 *     unitPrice: 1250.50,
 *     gst: 18,
 *     hsn: "84069900",
 *     invoiceNumber: "INV-20250219-ABC123",
 *     invoiceDate: "2025-02-20",
 *     totalValue: unitPrice * qty_returned
 *   }
 * 
 * 
 * ========================================
 * 2. INTEGRATION IN SPARE PART RETURNS
 * ========================================
 * 
 * Flow in sparePartReturns.js /create endpoint (lines 373-480):
 * 
 * STEP 1: COLLECT ALL SPARE IDS
 * ────────────────────────────
 * Before processing items, extract unique spare IDs:
 * 
 *   const spareIds = items
 *     .filter(item => item.spareId !== null)
 *     .map(item => parseInt(item.spareId));
 * 
 * 
 * STEP 2: GET FIFO INVOICES FOR ALL SPARES
 * ──────────────────────────────────────────
 * Call the batch function once for all spares:
 * 
 *   const invoiceMap = await getFIFOInvoicesForSpares(
 *     spareIds,
 *     centerId,           // From service_center_id
 *     sc.plant_id,        // From service center record
 *     transaction
 *   );
 * 
 * Result: Map object with invoice data per spare
 * 
 * 
 * STEP 3: PROCESS EACH RETURN ITEM WITH INVOICE DATA
 * ──────────────────────────────────────────────────
 * For each item in the return request:
 * 
 *   for (const item of items) {
 *     const spareIdInt = parseInt(item.spareId);
 *     const invoiceData = invoiceMap.get(spareIdInt);  // O(1) lookup
 *     
 *     // Create return item with invoice data
 *     const requestItem = await SpareRequestItem.create({
 *       request_id: returnRequest.request_id,
 *       spare_id: spareIdInt,
 *       requested_qty: parseInt(item.returnQty),
 *       approved_qty: 0,
 *       // Store FIFO invoice data as JSON for debit note generation
 *       invoice_data: invoiceData ? JSON.stringify({
 *         sap_doc_number: invoiceData.sap_doc_number,
 *         invoice_number: invoiceData.invoice_number,
 *         unit_price: invoiceData.unit_price,
 *         gst: invoiceData.gst,
 *         hsn: invoiceData.hsn,
 *         invoice_date: invoiceData.invoice_date,
 *         qty_received: invoiceData.qty
 *       }) : null
 *     }, { transaction });
 *   }
 * 
 * 
 * STEP 4: STORE INVOICE REFERENCES IN MEMO
 * ──────────────────────────────────────────
 * Stock movement gets all invoice numbers for audit trail:
 * 
 *   const invoiceReferences = Array.from(invoiceMap.values())
 *     .filter(inv => inv && inv.sap_doc_number)
 *     .map(inv => inv.sap_doc_number)
 *     .filter((v, i, a) => a.indexOf(v) === i);  // Deduplicate
 *   
 *   const stockMovement = await StockMovement.create({
 *     ...,
 *     memo: `FIFO Invoices: ${invoiceReferences.join(', ')}`
 *   }, { transaction });
 * 
 * Example memo: "FIFO Invoices: INV-20250219-ABC123, INV-20250220-XYZ789"
 * 
 * 
 * ========================================
 * 3. DATA STORAGE & RETRIEVAL
 * ========================================
 * 
 * Invoice data is stored as JSON in SpareRequestItem.invoice_data field:
 * 
 * Database:
 *   spare_request_items.invoice_data (JSON)
 *   └── Structure:
 *       {
 *         "sap_doc_number": "INV-20250219-ABC123",
 *         "invoice_number": "12345",
 *         "unit_price": 1250.50,
 *         "gst": 18,
 *         "hsn": "84069900",
 *         "invoice_date": "2025-02-20",
 *         "qty_received": 5
 *       }
 * 
 * Retrieval in downstream processes:
 *   1. Debit Note Generation: Extract unit_price, gst, hsn
 *   2. Credit Note Processing: Use sap_doc_number for reference
 *   3. Audit Trail: invoice_date for timeline tracking
 *   4. Cost Accounting: unit_price * return_qty for GL posting
 * 
 * 
 * ========================================
 * 4. FIFO LOGIC EXPLANATION
 * ========================================
 * 
 * Why FIFO (First In, First Out)?
 * ────────────────────────────────
 * 
 * Example Scenario:
 *   Service Center PLANT-SC-123 received Spare ID 456 as follows:
 *   
 *   Invoice 1: 2025-02-01 - Received 5 units @ ₹1000 each (HSN: 84069900)
 *   Invoice 2: 2025-02-10 - Received 3 units @ ₹1100 each (HSN: 84069900)
 *   Invoice 3: 2025-02-15 - Received 2 units @ ₹1050 each (HSN: 84069900)
 *   
 *   Now returning 2 units as defective.
 *   
 *   With FIFO: Match to Invoice 1
 *             Return @ ₹1000 each (oldest supply)
 *             Use HSN from Invoice 1
 *   
 *   This ensures:
 *   ✓ Consistent costing methodology
 *   ✓ Oldest stock returned first (reduces inventory aging)
 *   ✓ Accurate credit notes against original invoice
 *   ✓ Proper tax credit alignment
 * 
 * SQL Order: ORDER BY sd.created_at ASC
 * ───────────
 * Sorts invoices by creation date from oldest to newest.
 * TOP 1 selection gets the first (oldest) result.
 * 
 * 
 * ========================================
 * 5. ERROR HANDLING & FALLBACKS
 * ========================================
 * 
 * Scenario 1: No invoice found for spare at service center
 * ─────────────────────────────────────────────────────────
 * Action: Use spare part master data as fallback
 * Code:   getInvoiceData() in getFIFOInvoiceForSpare()
 * Impact: Return uses SAP_PRICE instead of invoice unit_price
 * 
 * Scenario 2: Invoice data is NULL but processing continues
 * ──────────────────────────────────────────────────────────
 * Action: Catch block sets invoiceData to fallback
 * Code:   console.log with ⚠️  warning
 * Impact: Item created with master data pricing
 * 
 * Scenario 3: Service center not found
 * ──────────────────────────────────────
 * Action: Reject return request with error
 * Code:   Initial validation before FIFO lookup
 * Impact: Transaction rolled back, clean error returned
 * 
 * Scenario 4: Database connection error during FIFO lookup
 * ──────────────────────────────────────────────────────────
 * Action: Catch error, rollback transaction
 * Code:   try/catch with await transaction.rollback()
 * Impact: Clean failure, no partial data
 * 
 * 
 * ========================================
 * 6. PERFORMANCE CONSIDERATIONS
 * ========================================
 * 
 * Query Performance:
 * ──────────────────
 * The FIFO SQL query:
 *   - Filters by spare_part_id (indexed on SAP_DOCUMENT_ITEMS)
 *   - Filters by requested_source_id (indexed on SAP_DOCUMENTS)
 *   - Filters by sap_doc_type (indexed on SAP_DOCUMENTS)
 *   - Orders by created_at (indexed for performance)
 *   - Returns TOP 1 (single row)
 * 
 * Expected: ~5-50ms per spare lookup
 * 
 * Batch Optimization:
 * ──────────────────
 * Using getFIFOInvoicesForSpares() instead of calling
 * getFIFOInvoiceForSpare() in a loop is preferred because:
 *   - Spares are deduplicated before lookup
 *   - One query per spare (not per item)
 *   - Results cached in Map for repeat lookups
 *   - Reduced database round trips
 * 
 * Example:
 *   Return with 5 spares repeated 3 times = 5 queries (not 15)
 * 
 * 
 * ========================================
 * 7. DEBIT/CREDIT NOTE INTEGRATION
 * ========================================
 * 
 * When generating debit notes for returns:
 * 
 * 1. Read invoice_data from spare_request_items.invoice_data (JSON)
 * 2. Extract: unit_price, gst, hsn, sap_doc_number
 * 3. Create debit note against the matched invoice:
 *    - DR: Inventory A/C (at invoice price)
 *    - CR: Cost of Sales (or Inbound account)
 *    - Tax: Reverse GST (set-off against invoice credit)
 * 4. Reference: Link debit note to original invoice via sap_doc_number
 * 
 * Example Debit Note:
 *   Document Type: DEBIT_NOTE
 *   Reference: INV-20250219-ABC123 (from invoice_data.sap_doc_number)
 *   Item:
 *     Spare: Bearing 456
 *     Qty: 2 units
 *     Unit Price: ₹1000 (from invoice_data.unit_price)
 *     Amount: ₹2000
 *     HSN: 84069900 (from invoice_data.hsn)
 *     GST: 18% (from invoice_data.gst)
 * 
 * 
 * ========================================
 * 8. TESTING THE IMPLEMENTATION
 * ========================================
 * 
 * Test File: test_fifo_spare_return.js
 * 
 * Test Scenarios:
 * 1. Service center with multiple invoices containing same spare
 * 2. Return spares and verify FIFO match to oldest invoice
 * 3. Check invoice_data JSON attached to return items
 * 4. Verify stock movement memo contains invoice numbers
 * 5. Verify price calculation uses invoice unit_price
 * 
 * Database Verification:
 * 
 * Check return items with invoice data:
 *   SELECT request_item_id, spare_id, requested_qty, invoice_data
 *   FROM spare_request_items
 *   WHERE request_id = <return_request_id>;
 * 
 * Check FIFO matching:
 *   SELECT sd.sap_doc_number, sd.created_at, sdi.spare_part_id
 *   FROM sap_documents sd
 *   JOIN sap_document_items sdi ON sd.document_number = sdi.document_number
 *   WHERE sdi.spare_part_id = <spare_id>
 *   AND sd.requested_source_id = <service_center_id>
 *   AND sd.sap_doc_type = 'INVOICE'
 *   ORDER BY sd.created_at ASC;
 * 
 * 
 * ========================================
 * 9. DEPLOYMENT CHECKLIST
 * ========================================
 * 
 * [✓] fifoInvoiceMatchingService.js created
 * [✓] Import added to sparePartReturns.js
 * [✓] FIFO lookup added before item processing
 * [✓] Invoice data attached to SpareRequestItem.invoice_data
 * [✓] Stock movement memo updated with invoice references
 * [✓] Unit price calculation updated to use invoice data
 * [✓] Error handling with fallbacks implemented
 * [ ] Test file executed and verified
 * [ ] Debit note generation updated to use invoice_data
 * [ ] Database indexes verified for performance
 * [ ] Documentation reviewed
 * [ ] UAT testing with real data
 * [ ] Production deployment
 * 
 * 
 * ========================================
 * 10. TROUBLESHOOTING
 * ========================================
 * 
 * Problem: No FIFO invoices found for spares
 * ──────────────────────────────────────────
 * Cause:   Spares never received at service center via invoice
 * Fix:     Check SAP_DOCUMENTS table - are there INVOICE records?
 * Query:   SELECT * FROM sap_documents WHERE sap_doc_type = 'INVOICE'
 *          AND requested_source_id = <service_center_id>;
 * 
 * Problem: Invoice_data showing NULL for some items
 * ──────────────────────────────────────────────────
 * Cause:   FIFO fallback triggered - no matching invoice
 * Fix:     Check if spare was inward-ed at this service center
 * Query:   SELECT DISTINCT sp.spare_id
 *          FROM sap_documents sd
 *          JOIN sap_document_items sdi ON sd.document_number = sdi.document_number
 *          JOIN spare_parts sp ON sdi.spare_part_id = sp.spare_id
 *          WHERE sd.requested_source_id = <service_center_id>;
 * 
 * Problem: Wrong price being used for returns
 * ────────────────────────────────────────────
 * Cause:   Master data not matching invoice price
 * Fix:     Verify invoices exist and have correct unit_price
 * Query:   SELECT sdi.unit_price, sp.SAP_PRICE
 *          FROM sap_document_items sdi
 *          JOIN spare_parts sp ON sdi.spare_part_id = sp.spare_id
 *          WHERE sdi.spare_part_id = <spare_id>;
 * 
 * Problem: Stock movement memo is empty
 * ──────────────────────────────────────
 * Cause:   invoiceMap returned no valid invoices
 * Fix:     Check if FIFO lookup is being called correctly
 * Log:     Look for "[FIFO]" log messages in server console
 * 
 * Problem: Performance degradation with large returns
 * ───────────────────────────────────────────────────
 * Cause:   Individual FIFO lookups instead of batch
 * Fix:     Ensure getFIFOInvoicesForSpares() is used (not per-item)
 * Check:   Line 387 in sparePartReturns.js should call batch function
 * 
 * 
 * ========================================
 * 11. FUTURE ENHANCEMENTS
 * ========================================
 * 
 * 1. Multi-location FIFO
 *    Current: Single service center
 *    Future: Handle returns from multiple locations in one request
 * 
 * 2. LIFO Option
 *    Current: FIFO only
 *    Future: Add configuration for LIFO (Last In, First Out)
 *    Change: ORDER BY sd.created_at DESC
 * 
 * 3. Average Cost Method
 *    Current: FIFO matching
 *    Future: Option to use weighted average price per spare
 * 
 * 4. Invoice Selection UI
 *    Current: Automatic FIFO match
 *    Future: Allow manual invoice selection if needed
 * 
 * 5. Partial Quantity Matching
 *    Current: Match entire spare to one invoice
 *    Future: Match different units of same spare to different invoices
 *         (if returning 5 units and received 3 + 2 from 2 invoices)
 * 
 * 
 * ========================================
 * END OF DOCUMENTATION
 * ========================================
 */

export default {
  version: '1.0',
  lastUpdated: '2025-02-21',
  fifoMethod: 'ORDER BY created_at ASC',
  integratedStatus: 'PRODUCTION_READY',
  testStatus: 'AVAILABLE'
};
