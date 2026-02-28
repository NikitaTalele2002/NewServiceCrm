/**
 * SAP Integration Service
 * Handles mock SAP data generation for Sales Orders, Delivery Notes, and Challan
 */

/**
 * Generate mock SAP data for a spare request
 * @param {Object} spareRequest - The spare request object
 * @param {Array} items - The spare request items
 * @returns {Object} - Mock SAP data with SO, DN, and Challan
 */
export function generateMockSAPData(spareRequest, items) {
  const requestId = spareRequest.request_id || spareRequest.id;
  const timestamp = new Date();
  const dateStr = timestamp.toISOString().split('T')[0].replace(/-/g, '');
  
  // Generate Sales Order (SO)
  const soNumber = `SO-${dateStr}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
  const soData = {
    document_type: 'SO',
    document_number: soNumber,
    reference_doc_number: `REQ-${requestId}`,
    reference_type: 'SPARE_REQUEST',
    reference_id: requestId,
    status: 'Posted',
    document_date: timestamp,
    items: items.map((item, index) => ({
      line_number: index + 1,
      spare_id: item.spare_id,
      spare_part_id: item.spare_id,  // Ensure spare_part_id is always set from spare_id
      part_id: item.spare_id,
      part_number: item.sku || `PART-${item.spare_id}`,
      part_description: item.spareName || item.spare_description || `Part ${index + 1}`,
      requested_qty: item.requested_qty || 0,
      supplied_qty: item.approved_qty || 0,
      received_qty: item.approved_qty || 0,
      qty: item.approved_qty || 0,
      uom: item.uom || 'PCS',
      hsn: item.hsn || null,
      unit_price: Math.floor(Math.random() * 5000) + 500,
      line_total: (item.approved_qty || 0) * (Math.floor(Math.random() * 5000) + 500)
    }))
  };

  // Generate Delivery Note (DN)
  const dnNumber = `DN-${dateStr}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
  const dispatchDate = new Date(timestamp.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days later
  
  const dnData = {
    document_type: 'DN',
    document_number: dnNumber,
    reference_doc_number: soNumber,
    reference_type: 'SPARE_REQUEST',
    reference_id: requestId,
    status: 'Posted',
    document_date: dispatchDate,
    items: soData.items.map(item => ({
      ...item,
      received_qty: item.supplied_qty
    }))
  };

  // Generate Challan
  const challanNumber = `CHALLAN-${dateStr}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
  const courierCompanies = ['FedEx', 'DHL', 'DTDC', 'BlueDart', 'XpressCart'];
  const randomCourier = courierCompanies[Math.floor(Math.random() * courierCompanies.length)];
  const trackingNo = `TRACK${Math.random().toString(36).substr(2, 10).toUpperCase()}`;
  
  const challanData = {
    document_type: 'CHALLAN',
    document_number: challanNumber,
    reference_doc_number: dnNumber,
    reference_type: 'SPARE_REQUEST',
    reference_id: requestId,
    status: 'Posted',
    document_date: dispatchDate,
    transportDetails: {
      courierName: randomCourier,
      trackingNumber: trackingNo,
      estimatedDelivery: new Date(dispatchDate.getTime() + 5 * 24 * 60 * 60 * 1000) // 5 days for delivery
    },
    items: dnData.items
  };

  // Generate Invoice (stored in SAPDocuments table)
  const invoiceNumber = `INV-${dateStr}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
  const invoiceDate = new Date(timestamp.getTime() + 1 * 24 * 60 * 60 * 1000); // 1 day after SO
  const totalAmount = calculateTotalAmount(soData.items);
  
  const invoiceData = {
    sap_doc_type: 'INVOICE',
    sap_doc_number: invoiceNumber,
    module_type: 'spare_request',  // reference_type
    reference_id: soNumber,  // SO number is the reference document
    status: 'Posted',
    amount: totalAmount,
    document_date: invoiceDate,
    items: dnData.items
  };

  return {
    salesOrder: soData,
    deliveryNote: dnData,
    challan: challanData,
    invoice: invoiceData,
    sapIntegrationData: {
      externalSystem: 'SAP_HANA',
      integrationTimestamp: timestamp,
      status: 'Completed',
      syncedAt: timestamp
    }
  };
}

/**
 * Calculate total amount for a set of items
 * @param {Array} items - Array of line items
 * @returns {number} - Total amount
 */
export function calculateTotalAmount(items) {
  return items.reduce((sum, item) => sum + (item.line_total || 0), 0);
}

/**
 * Format SAP data for database storage
 * @param {Object} sapData - Raw SAP data
 * @param {Object} fromEntity - Source entity (e.g., warehouse)
 * @param {Object} toEntity - Target entity (e.g., service center)
 * @returns {Object} - Formatted data for database
 */
export function formatSAPDataForDB(sapData, fromEntity, toEntity) {
  const amount = calculateTotalAmount(sapData.salesOrder.items);
  
  return {
    documents: [
      {
        external_system: 'SAP_HANA',
        document_type: 'SO',
        external_doc_type: 'Purchase Order',
        document_number: sapData.salesOrder.document_number,
        reference_doc_number: sapData.salesOrder.reference_doc_number,
        reference_type: 'SPARE_REQUEST',
        reference_id: sapData.salesOrder.reference_id,
        from_entity_type: fromEntity?.type || 'warehouse',
        from_entity_id: fromEntity?.id || null,
        to_entity_type: toEntity?.type || 'service_center',
        to_entity_id: toEntity?.id || null,
        amount: amount,
        status: 'Posted',
        document_date: sapData.salesOrder.document_date,
        items: sapData.salesOrder.items
      },
      {
        external_system: 'SAP_HANA',
        document_type: 'DN',
        external_doc_type: 'Goods Receipt',
        document_number: sapData.deliveryNote.document_number,
        reference_doc_number: sapData.deliveryNote.reference_doc_number,
        reference_type: 'SPARE_REQUEST',
        reference_id: sapData.deliveryNote.reference_id,
        from_entity_type: fromEntity?.type || 'warehouse',
        from_entity_id: fromEntity?.id || null,
        to_entity_type: toEntity?.type || 'service_center',
        to_entity_id: toEntity?.id || null,
        amount: amount,
        status: 'Posted',
        document_date: sapData.deliveryNote.document_date,
        items: sapData.deliveryNote.items
      },
      {
        external_system: 'SAP_HANA',
        document_type: 'CHALLAN',
        external_doc_type: 'Dispatch Note',
        document_number: sapData.challan.document_number,
        reference_doc_number: sapData.challan.reference_doc_number,
        reference_type: 'SPARE_REQUEST',
        reference_id: sapData.challan.reference_id,
        from_entity_type: fromEntity?.type || 'warehouse',
        from_entity_id: fromEntity?.id || null,
        to_entity_type: toEntity?.type || 'service_center',
        to_entity_id: toEntity?.id || null,
        amount: amount,
        status: 'Posted',
        document_date: sapData.challan.document_date,
        items: sapData.challan.items
      }
    ],
    transportDetails: sapData.challan.transportDetails
  };
}

/**
 * Get invoice from SAPDocuments by request ID
 * @param {number} requestId - The spare request ID
 * @param {Object} sequelize - Sequelize instance
 * @returns {Promise<Object>} - Invoice document or null
 */
export async function getInvoiceByRequestId(requestId, sequelize) {
  try {
    // Find invoice directly by request ID
    // Since both SO and INVOICE reference the same spare_request_id
    const invoice = await sequelize.models.SAPDocuments.findOne({
      where: {
        reference_id: requestId,  // Use requestId directly (INTEGER)
        sap_doc_type: 'INVOICE',
        module_type: 'spare_request'
      }
    });

    return invoice ? invoice.toJSON() : null;
  } catch (error) {
    console.error('Error fetching invoice:', error.message);
    return null;
  }
}

/**
 * Get invoice by SO (Sales Order) number
 * @param {string} soNumber - The Sales Order number
 * @param {Object} sequelize - Sequelize instance
 * @returns {Promise<Object>} - Invoice document or null
 */
export async function getInvoiceBySONumber(soNumber, sequelize) {
  try {
    // Find the SO document by number to get the requestId
    const soDoc = await sequelize.models.LogisticsDocuments.findOne({
      where: {
        document_number: soNumber,  // SO number is the document_number
        document_type: 'SO'
      }
    });

    if (!soDoc) {
      return null;
    }

    // Find invoice using the reference_id (spare_request_id)
    const invoice = await sequelize.models.SAPDocuments.findOne({
      where: {
        reference_id: soDoc.reference_id,  // Use the INTEGER reference_id
        sap_doc_type: 'INVOICE'
      }
    });

    return invoice ? invoice.toJSON() : null;
  } catch (error) {
    console.error('Error fetching invoice by SO:', error.message);
    return null;
  }
}

