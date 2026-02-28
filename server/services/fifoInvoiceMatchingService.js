/**
 * FIFO Invoice Matching Service
 * Matches returned spares to the oldest invoice on which they were received
 * Uses FIFO principle to find invoice details (unit_price, gst, hsn)
 */

import { SAPDocuments, SAPDocumentItems, SpareRequest, SparePart } from '../models/index.js';
import { sequelize } from '../db.js';

/**
 * Get the oldest invoice for a specific spare part at a service center
 * Uses FIFO - First In First Out principle
 * @param {number} spareId - Spare part ID
 * @param {number} serviceCenterId - Service center ID
 * @param {number} plantId - Plant ID (for filtering invoices from this plant)
 * @param {Object} transaction - Sequelize transaction
 * @returns {Promise<Object>} - Invoice data with unit_price, gst, hsn
 */
export async function getFIFOInvoiceForSpare(spareId, serviceCenterId, plantId, transaction) {
  try {
    console.log(`[FIFO] Searching for oldest invoice for spare ${spareId} at SC ${serviceCenterId}`);

    // Query to find the oldest SAP invoice that contains this spare
    // and was sent to this service center
    const invoiceData = await sequelize.query(`
      SELECT TOP 1
        sd.id as invoice_id,
        sd.sap_doc_number,
        sd.reference_id,
        sdi.unit_price,
        sdi.gst,
        sdi.hsn,
        sdi.qty as invoice_qty,
        sd.created_at as invoice_date
      FROM sap_documents sd
      INNER JOIN sap_document_items sdi ON sd.id = sdi.sap_doc_id
      INNER JOIN spare_requests sr ON sd.reference_id = sr.request_id
      WHERE sdi.spare_part_id = ?
        AND sr.requested_source_id = ?
        AND sr.requested_to_id = ?
        AND sd.sap_doc_type = 'INVOICE'
        AND sd.module_type = 'spare_request'
        AND sd.status = 'Created'
      ORDER BY sd.created_at ASC
    `, {
      replacements: [spareId, serviceCenterId, plantId],
      type: sequelize.QueryTypes.SELECT,
      transaction
    });

    if (invoiceData && invoiceData.length > 0) {
      const invoice = invoiceData[0];
      console.log(`✅ [FIFO] Found invoice: ${invoice.sap_doc_number}`);
      console.log(`   Unit Price: ${invoice.unit_price}, GST: ${invoice.gst}%, HSN: ${invoice.hsn}`);
      return invoice;
    } else {
      console.warn(`⚠️  [FIFO] No invoice found for spare ${spareId}`);
      // Fallback to spare part master data if no invoice found
      const sparePart = await SparePart.findByPk(spareId, { transaction });
      if (sparePart) {
        console.log(`✅ [FIFO] Using spare part master data as fallback`);
        return {
          invoice_id: null,
          sap_doc_number: 'FALLBACK',
          unit_price: sparePart.unit_price || 0,
          gst: sparePart.gst_rate || 0,
          hsn: sparePart.hsn_code || null,
          invoice_date: new Date()
        };
      }
      return null;
    }
  } catch (error) {
    console.error(`❌ [FIFO] Error finding invoice:`, error.message);
    return null;
  }
}

/**
 * Get FIFO invoice data for multiple spares
 * Returns a map of spareId -> invoiceData
 * @param {Array<number>} spareIds - Array of spare IDs to find invoices for
 * @param {number} serviceCenterId - Service center ID
 * @param {number} plantId - Plant ID
 * @param {Object} transaction - Sequelize transaction
 * @returns {Promise<Map>} - Map of spareId -> invoiceData
 */
export async function getFIFOInvoicesForSpares(spareIds, serviceCenterId, plantId, transaction) {
  console.log(`[FIFO BATCH] Getting invoices for ${spareIds.length} spares`);
  const invoiceMap = new Map();

  for (const spareId of spareIds) {
    const invoiceData = await getFIFOInvoiceForSpare(spareId, serviceCenterId, plantId, transaction);
    if (invoiceData) {
      invoiceMap.set(spareId, invoiceData);
    }
  }

  console.log(`✅ [FIFO BATCH] Got invoices for ${invoiceMap.size} spares`);
  return invoiceMap;
}

/**
 * Get invoice details for a spare return
 * Includes all data needed for the return: unit_price, gst, hsn, invoice_number
 * @param {number} spareId - Spare part ID being returned
 * @param {number} serviceCenterId - Service center returning the item
 * @param {number} plantId - Plant receiving the return
 * @param {Object} transaction - Sequelize transaction
 * @returns {Promise<Object>} - Complete invoice details for the return
 */
export async function getReturnInvoiceDetails(spareId, serviceCenterId, plantId, transaction) {
  try {
    console.log(`[RETURN] Getting invoice details for return of spare ${spareId}`);

    const invoice = await getFIFOInvoiceForSpare(spareId, serviceCenterId, plantId, transaction);

    if (!invoice) {
      console.warn(`⚠️  [RETURN] No invoice data found for spare ${spareId}`);
      return null;
    }

    // Return complete invoice data for use in return record
    return {
      invoiceNumber: invoice.sap_doc_number,
      invoiceId: invoice.invoice_id,
      unitPrice: parseFloat(invoice.unit_price || 0),
      gst: parseFloat(invoice.gst || 0),
      hsn: invoice.hsn || null,
      invoiceDate: invoice.invoice_date,
      totalValue: parseFloat(invoice.unit_price || 0) // Multiplied by qty elsewhere
    };
  } catch (error) {
    console.error(`❌ [RETURN] Error getting invoice details:`, error.message);
    return null;
  }
}

export default {
  getFIFOInvoiceForSpare,
  getFIFOInvoicesForSpares,
  getReturnInvoiceDetails
};
