/**
 * Utility function to create SpareRequest with auto-determined type based on reason
 * Handles all consignment scenarios with SAP-compliant tracking
 */

import { SpareRequest } from '../models/index.js';
import { determineRequestType, getSAPConsignmentCode } from './requestTypeHelper.js';
import { REQUEST_REASONS, LOCATION_TYPES } from '../constants/requestTypeConstants.js';

/**
 * Create a SpareRequest with auto-determined type
 * 
 * @param {Object} requestData Request creation data
 * @param {Object} options Additional options (transaction, etc)
 * @returns {Promise<SpareRequest>} Created request with auto-determined type
 */
export async function createSpareRequestWithAutoType(requestData, options = {}) {
  const {
    requested_source_type,
    requested_source_id,
    requested_to_type,
    requested_to_id,
    request_reason = REQUEST_REASONS.MSL,
    call_id = null,
    status_id = 1,
    created_by = null
  } = requestData;

  if (!requested_source_type || !requested_to_type) {
    throw new Error('requested_source_type and requested_to_type are required');
  }

  const autoRequestType = determineRequestType(
    requested_source_type,
    requested_to_type,
    request_reason
  );

  const sapCode = getSAPConsignmentCode(autoRequestType);

  const createData = {
    request_type: autoRequestType,
    sap_code: sapCode,
    call_id,
    requested_source_type,
    requested_source_id,
    requested_to_type,
    requested_to_id,
    request_reason,
    status_id,
    created_by,
    created_at: new Date(),
    updated_at: new Date()
  };

  try {
    const spareRequest = await SpareRequest.create(createData, {
      transaction: options.transaction
    });
    return spareRequest;
  } catch (error) {
    console.error(`Failed to create SpareRequest: ${error.message}`);
    throw error;
  }
}

/**
 * Helper to get detailed info about request type and reason combination
 * 
 * @param {string} sourceType Source location type
 * @param {string} destType Destination location type
 * @param {string} reason Request reason
 * @returns {Object} Detailed info including type, SAP code, description
 */
export function getRequestTypeInfo(sourceType, destType, reason) {
  const requestType = determineRequestType(sourceType, destType, reason);
  const sapCode = getSAPConsignmentCode(requestType);
  
  return {
    source: sourceType,
    destination: destType,
    reason: reason,
    request_type: requestType,
    sap_code: sapCode,
    description: getRequestTypeSAPDescription(requestType)
  };
}

/**
 * Get detailed SAP consignment description
 */
function getRequestTypeSAPDescription(requestType) {
  const descriptions = {
    'consignment_fillup': 'CFS - Consignment Fill-up (New Stock. Branch → ASC)',
    'consignment_return': 'CR - Consignment Return (Defective/Old Stock. ASC → Branch)',
    'consignment_pickup': 'CFU - Consignment Pick-up (Physical Retrieval. Branch → ASC)',
    'tech_defective_return': 'TDR - Tech Defective Return (Tech Parts. Technician → ASC)',
    'tech_consignment_issue': 'TCI - Tech Consignment Issue (Issue. ASC → Technician)'
  };
  return descriptions[requestType] || requestType;
}
