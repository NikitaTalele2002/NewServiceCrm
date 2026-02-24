/**
 * Utility function to determine SpareRequest type based on source, destination, and reason
 * 
 * CRITICAL: The spare_request_type represents the BUSINESS INTENT (WHY material is moving)
 * 
 * Example flows:
 * 
 * ✓ ASC requests NEW STOCK from branch:
 *   → Request type: CFU (Consignment Fill-up)
 *   → Meaning: ASC stock below MSL, needs replenishment
 * 
 * ✓ Technician needs spare for service:
 *   → Request type: TECH_ISSUE
 *   → Meaning: Issue spare to technician for job
 * 
 * ✓ Technician returns defective parts to ASC:
 *   → Request type: TECH_RETURN_DEFECTIVE
 *   → Meaning: Technician returns defective equipment to ASC
 * 
 * ✓ ASC returns defective stock to branch:
 *   → Request type: ASC_RETURN_DEFECTIVE
 *   → Meaning: IW defective spares sent back
 */

import { 
  SPARE_REQUEST_TYPES, 
  SPARE_REQUEST_TYPE_DESCRIPTIONS, 
  REQUEST_REASONS,
  LOCATION_TYPES
} from '../constants/requestTypeConstants.js';

/**
 * Determine spare request type based on reason and optional location info
 * @param {string} reason - Request reason (msl, bulk, defect, unused, pickup, return)
 * @param {string} sourceType - Optional origin location type (service_center, branch, technician)
 * @param {string} destinationType - Optional target location type (service_center, branch, technician)
 * @returns {string} Spare request type (CFU, TECH_ISSUE, TECH_RETURN_DEFECTIVE, etc.)
 */
export function determineRequestType(reason, sourceType = null, destinationType = null) {
  // Map reason to spare request type
  switch (reason?.toLowerCase()) {
    case REQUEST_REASONS.MSL:
    case REQUEST_REASONS.BULK:
      // Stock replenishment from branch to ASC
      return SPARE_REQUEST_TYPES.CFU;
    
    case REQUEST_REASONS.PICKUP:
      // Physical pickup from ASC by branch
      return SPARE_REQUEST_TYPES.BRANCH_PICKUP;
    
    case REQUEST_REASONS.DEFECT:
    case REQUEST_REASONS.UNUSED:
      // Could be technician return or ASC return
      if (sourceType === LOCATION_TYPES.TECHNICIAN) {
        return SPARE_REQUEST_TYPES.TECH_RETURN_DEFECTIVE;
      }
      return SPARE_REQUEST_TYPES.ASC_RETURN_DEFECTIVE;
    
    case REQUEST_REASONS.RETURN:
      // General return - check source
      if (sourceType === LOCATION_TYPES.TECHNICIAN) {
        return SPARE_REQUEST_TYPES.TECH_RETURN_DEFECTIVE;
      }
      return SPARE_REQUEST_TYPES.ASC_RETURN_DEFECTIVE;
    
    case REQUEST_REASONS.REPLACEMENT:
      // Issue spare to technician
      return SPARE_REQUEST_TYPES.TECH_ISSUE;
    
    default:
      // Default to CFU for stock replenishment
      return SPARE_REQUEST_TYPES.CFU;
  }
}

/**
 * Get human-readable description of spare request type
 * @param {string} requestType - The spare request type (CFU, TECH_ISSUE, etc.)
 * @returns {string} Description
 */
export function getRequestTypeDescription(requestType) {
  return SPARE_REQUEST_TYPE_DESCRIPTIONS[requestType] || requestType;
}

/**
 * Validate if request type is valid
 * @param {string} requestType - The spare request type to validate
 * @returns {boolean} true if valid
 */
export function isValidRequestType(requestType) {
  return Object.values(SPARE_REQUEST_TYPES).includes(requestType);
}

/**
 * Get all available spare request types
 * @returns {object} All SPARE_REQUEST_TYPES
 */
export function getAllRequestTypes() {
  return SPARE_REQUEST_TYPES;
}

export default {
  determineRequestType,
  getRequestTypeDescription,
  isValidRequestType,
  getAllRequestTypes
};
