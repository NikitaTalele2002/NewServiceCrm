/**
 * Spare Request and Stock Movement Type Utilities
 * Helper functions for mapping and handling the new business intent and physical reality enums
 * 
 * This file provides utilities to work with:
 * 1. SPARE_REQUEST_TYPES (WHY material is moving)
 * 2. STOCK_MOVEMENT_TYPES (WHAT actually happened to stock)
 */

import { SPARE_REQUEST_TYPES, SPARE_REQUEST_TO_MOVEMENTS } from '../constants/requestTypeConstants.js';
import { STOCK_MOVEMENT_TYPES, BUCKET_IMPACT_MAPPING, SAP_INTEGRATION_MAPPING } from '../constants/stockMovementConstants.js';

/**
 * Convert legacy request_type to new spare_request_type
 * 
 * Mapping:
 * - 'consignment_fillup' → 'CFU'
 * - 'tech_consignment_issue' → 'TECH_ISSUE'
 * - 'tech_defective_return' → 'TECH_RETURN_DEFECTIVE'
 * - 'consignment_return' → 'ASC_RETURN_DEFECTIVE' or 'ASC_RETURN_EXCESS'
 * - 'consignment_pickup' → 'BRANCH_PICKUP'
 * 
 * @param {string} legacyType - Old request_type value
 * @param {string} reason - Optional reason to determine exact mapping
 * @returns {string} New spare_request_type
 */
export function convertLegacyRequestType(legacyType, reason = null) {
  const typeMap = {
    'consignment_fillup': SPARE_REQUEST_TYPES.CFU,
    'tech_consignment_issue': SPARE_REQUEST_TYPES.TECH_ISSUE,
    'tech_defective_return': SPARE_REQUEST_TYPES.TECH_RETURN_DEFECTIVE,
    'consignment_return': reason === 'excess' ? SPARE_REQUEST_TYPES.ASC_RETURN_EXCESS : SPARE_REQUEST_TYPES.ASC_RETURN_DEFECTIVE,
    'consignment_pickup': SPARE_REQUEST_TYPES.BRANCH_PICKUP
  };
  
  return typeMap[legacyType] || null;
}

/**
 * Get the stock movement types triggered by a spare request type
 * 
 * @param {string} spareRequestType - The spare_request_type
 * @returns {string[]} Array of stock_movement_types
 */
export function getMovementTypesForRequest(spareRequestType) {
  return SPARE_REQUEST_TO_MOVEMENTS[spareRequestType] || [];
}

/**
 * Get bucket impact for a stock movement
 * 
 * @param {string} stockMovementType - The stock_movement_type
 * @returns {string} The bucket impact ('Good', 'Good-Decrease', 'Defective', 'In-Transit')
 */
export function getBucketImpact(stockMovementType) {
  return BUCKET_IMPACT_MAPPING[stockMovementType] || null;
}

/**
 * Check if a movement type triggers SAP integration
 * 
 * @param {string} stockMovementType - The stock_movement_type
 * @returns {object} { sapUploader: boolean, sapProcess: string }
 */
export function getSAPIntegration(stockMovementType) {
  return SAP_INTEGRATION_MAPPING[stockMovementType] || { sapUploader: false, sapProcess: null };
}

/**
 * Auto-generate stock movements for a spare request
 * 
 * @param {object} spareRequest - The spare request object
 * @returns {object[]} Array of stock movements to create
 * 
 * Example:
 * const movements = generateMovementsForRequest(spareRequest);
 * // Returns array with all required movements based on spare_request_type
 */
export function generateMovementsForRequest(spareRequest) {
  const movements = [];
  const movementTypes = getMovementTypesForRequest(spareRequest.spare_request_type);
  
  movementTypes.forEach(movementType => {
    const movement = {
      stock_movement_type: movementType,
      spare_request_id: spareRequest.request_id,
      reference_type: 'spare_request',
      reference_no: spareRequest.reference_no,
      bucket_impact: getBucketImpact(movementType),
      sap_integration: getSAPIntegration(movementType).sapUploader,
      sap_process: getSAPIntegration(movementType).sapProcess,
      source_location_type: getSourceLocation(spareRequest, movementType),
      source_location_id: getSourceLocationId(spareRequest, movementType),
      destination_location_type: getDestinationLocation(spareRequest, movementType),
      destination_location_id: getDestinationLocationId(spareRequest, movementType),
      total_qty: spareRequest.total_qty || 0,
      movement_date: new Date()
    };
    
    movements.push(movement);
  });
  
  return movements;
}

/**
 * Helper: Get source location type for a movement
 */
function getSourceLocation(spareRequest, movementType) {
  const locationMap = {
    // CFU: Branch → ASC
    'FILLUP_DISPATCH': 'branch',
    'FILLUP_RECEIPT': 'branch',
    
    // TECH_ISSUE: ASC → Technician
    'TECH_ISSUE_OUT': 'service_center',
    'TECH_ISSUE_IN': 'service_center',
    
    // TECH_RETURN_DEFECTIVE: Technician → ASC
    'TECH_RETURN_DEFECTIVE': 'technician',
    
    // ASC_RETURN_DEFECTIVE: ASC → Branch
    'ASC_RETURN_DEFECTIVE_OUT': 'service_center',
    'ASC_RETURN_DEFECTIVE_IN': 'service_center'
  };
  
  return locationMap[movementType] || spareRequest.requested_source_type;
}

/**
 * Helper: Get source location ID for a movement
 */
function getSourceLocationId(spareRequest, movementType) {
  return spareRequest.requested_source_id;
}

/**
 * Helper: Get destination location type for a movement
 */
function getDestinationLocation(spareRequest, movementType) {
  const locationMap = {
    // CFU: Branch → ASC
    'FILLUP_DISPATCH': 'service_center',
    'FILLUP_RECEIPT': 'service_center',
    
    // TECH_ISSUE: ASC → Technician
    'TECH_ISSUE_OUT': 'technician',
    'TECH_ISSUE_IN': 'technician',
    
    // TECH_RETURN_DEFECTIVE: Technician → ASC
    'TECH_RETURN_DEFECTIVE': 'service_center',
    
    // ASC_RETURN_DEFECTIVE: ASC → Branch
    'ASC_RETURN_DEFECTIVE_OUT': 'branch',
    'ASC_RETURN_DEFECTIVE_IN': 'branch'
  };
  
  return locationMap[movementType] || spareRequest.requested_to_type;
}

/**
 * Helper: Get destination location ID for a movement
 */
function getDestinationLocationId(spareRequest, movementType) {
  return spareRequest.requested_to_id;
}

/**
 * Validate if a spare request type is valid
 * 
 * @param {string} spareRequestType - The sparse_request_type to validate
 * @returns {boolean} True if valid
 */
export function isValidSpareRequestType(spareRequestType) {
  return Object.values(SPARE_REQUEST_TYPES).includes(spareRequestType);
}

/**
 * Validate if a stock movement type is valid
 * 
 * @param {string} stockMovementType - The stock_movement_type to validate
 * @returns {boolean} True if valid
 */
export function isValidStockMovementType(stockMovementType) {
  return Object.values(STOCK_MOVEMENT_TYPES).includes(stockMovementType);
}

/**
 * Get human-readable description for spare request type
 */
export function getSpareRequestTypeDescription(spareRequestType) {
  const descriptions = {
    [SPARE_REQUEST_TYPES.CFU]: 'Consignment Fill-Up - ASC stock replenishment',
    [SPARE_REQUEST_TYPES.TECH_ISSUE]: 'Technician Issue - Issue spare to technician',
    [SPARE_REQUEST_TYPES.TECH_RETURN_DEFECTIVE]: 'Technician Return Defective - Return from technician',
    [SPARE_REQUEST_TYPES.ASC_RETURN_DEFECTIVE]: 'ASC Return Defective - Defective return to branch',
    [SPARE_REQUEST_TYPES.ASC_RETURN_EXCESS]: 'ASC Return Excess - Excess stock return',
    [SPARE_REQUEST_TYPES.BRANCH_PICKUP]: 'Consignment Pick-Up - Physical pickup'
  };
  
  return descriptions[spareRequestType] || 'Unknown type';
}

/**
 * Get human-readable description for stock movement type
 */
export function getStockMovementTypeDescription(stockMovementType) {
  const descriptions = {
    [STOCK_MOVEMENT_TYPES.FILLUP_DISPATCH]: 'Fill-up Dispatch - Branch sends to ASC',
    [STOCK_MOVEMENT_TYPES.FILLUP_RECEIPT]: 'Fill-up Receipt - ASC receives',
    [STOCK_MOVEMENT_TYPES.TECH_ISSUE_OUT]: 'Tech Issue Out - ASC issues to technician',
    [STOCK_MOVEMENT_TYPES.TECH_ISSUE_IN]: 'Tech Issue In - Technician receives',
    [STOCK_MOVEMENT_TYPES.TECH_RETURN_DEFECTIVE]: 'Tech Return Defective - Return from tech',
    [STOCK_MOVEMENT_TYPES.ASC_RETURN_DEFECTIVE_OUT]: 'ASC Return Out - ASC sends defective',
    [STOCK_MOVEMENT_TYPES.ASC_RETURN_DEFECTIVE_IN]: 'ASC Return In - Branch receives defective',
    [STOCK_MOVEMENT_TYPES.CONSUMPTION_IW]: 'Consumption IW - In-Warranty consumption',
    [STOCK_MOVEMENT_TYPES.CONSUMPTION_OOW]: 'Consumption OOW - Out-of-Warranty consumption'
  };
  
  return descriptions[stockMovementType] || 'Unknown type';
}
