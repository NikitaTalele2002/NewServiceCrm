/**
 * Spare Request Type Constants and Mappings
 * Defines all valid request types and their routing logic
 */

/**
 * Spare Request Type enum - Business Intent
 * Represents WHY material is moving (who requested & why)
 */
export const SPARE_REQUEST_TYPES = {
  // CFU: Consignment Fill-Up
  // From: Branch → ASC
  // When: ASC stock below MSL / replenishment
  CFU: 'CFU',
  
  // TECH_ISSUE: Technician Issue
  // From: ASC → Technician
  // When: Technician requests spare for job
  TECH_ISSUE: 'TECH_ISSUE',
  
  // TECH_RETURN_DEFECTIVE: Technician Return Defective
  // From: Technician → ASC
  // When: Defective spare returned after job
  TECH_RETURN_DEFECTIVE: 'TECH_RETURN_DEFECTIVE',
  
  // ASC_RETURN_DEFECTIVE: ASC Return Defective
  // From: ASC → Branch
  // When: IW defective spares sent back
  ASC_RETURN_DEFECTIVE: 'ASC_RETURN_DEFECTIVE',
  
  // ASC_RETURN_EXCESS: ASC Return Excess
  // From: ASC → Branch
  // When: Unused / excess stock
  ASC_RETURN_EXCESS: 'ASC_RETURN_EXCESS',
  
  // BRANCH_PICKUP: Consignment Pick-Up
  // From: Branch → ASC
  // When: Depot pickup / logistics driven
  BRANCH_PICKUP: 'BRANCH_PICKUP'
};

/**
 * Spare Request Type Descriptions
 * Human-readable descriptions for each spare request type
 */
export const SPARE_REQUEST_TYPE_DESCRIPTIONS = {
  [SPARE_REQUEST_TYPES.CFU]: 'Consignment Fill-Up - ASC stock below MSL / replenishment',
  [SPARE_REQUEST_TYPES.TECH_ISSUE]: 'Technician Issue - Technician requests spare for job',
  [SPARE_REQUEST_TYPES.TECH_RETURN_DEFECTIVE]: 'Technician Return Defective - Defective spare returned after job',
  [SPARE_REQUEST_TYPES.ASC_RETURN_DEFECTIVE]: 'ASC Return Defective - IW defective spares sent back',
  [SPARE_REQUEST_TYPES.ASC_RETURN_EXCESS]: 'ASC Return Excess - Unused / excess stock',
  [SPARE_REQUEST_TYPES.BRANCH_PICKUP]: 'Consignment Pick-Up - Depot pickup / logistics driven'
};

/**
 * Request Reasons enum
 * Used for determining spare request types based on business logic
 */
export const REQUEST_REASONS = {
  MSL: 'msl',              // Minimum stock level fill-up
  BULK: 'bulk',            // Bulk stock order
  DEFECT: 'defect',        // Return of defective parts
  UNUSED: 'unused',        // Return of unused/expired parts
  PICKUP: 'pickup',        // Physical pick-up of stock
  RETURN: 'return',        // General return
  REPLACEMENT: 'replacement'
};

/**
 * Location Types enum
 * Defines the different location types in the system
 */
export const LOCATION_TYPES = {
  TECHNICIAN: 'technician',
  SERVICE_CENTER: 'service_center',
  BRANCH: 'branch',
  WAREHOUSE: 'warehouse'
};

/**
 * NEW: Spare Request Type To Movement Types Mapping
 * Maps spare_request_type to the corresponding stock_movement_types
 */
export const SPARE_REQUEST_TO_MOVEMENTS = {
  // A. Consignment Fill-Up (CFU)
  // Step 1: SAP DN created → FILLUP_DISPATCH
  // Step 2: ASC receives → FILLUP_RECEIPT
  [SPARE_REQUEST_TYPES.CFU]: ['FILLUP_DISPATCH', 'FILLUP_RECEIPT'],
  
  // B. Technician Issue (TECH_ISSUE)
  // Step 1: ASC issues spare → TECH_ISSUE_OUT
  // Step 2: Technician receives → TECH_ISSUE_IN
  // Note: No SAP posting, internal CRM stock movement only
  [SPARE_REQUEST_TYPES.TECH_ISSUE]: ['TECH_ISSUE_OUT', 'TECH_ISSUE_IN'],
  
  // C. Technician Return Defective
  // Step 1: Tech returns defective → TECH_RETURN_DEFECTIVE
  // Note: No PGR / GRN, No SAP posting, Just bucket shift → Defective
  [SPARE_REQUEST_TYPES.TECH_RETURN_DEFECTIVE]: ['TECH_RETURN_DEFECTIVE'],
  
  // D. ASC Return Defective (IW)
  // Step 1: ASC sends → ASC_RETURN_DEFECTIVE_OUT
  // Step 2: Branch receives → ASC_RETURN_DEFECTIVE_IN
  // Note: SAP uploader: YES (CR, Return Delivery, PGR, Credit Note)
  [SPARE_REQUEST_TYPES.ASC_RETURN_DEFECTIVE]: ['ASC_RETURN_DEFECTIVE_OUT', 'ASC_RETURN_DEFECTIVE_IN'],
  
  // E. ASC Return Excess
  // Step 1: ASC sends excess → ASC_RETURN_DEFECTIVE_OUT
  // Step 2: Branch receives → ASC_RETURN_DEFECTIVE_IN
  // Note: SAP uploader: OPTIONAL (depends on business rule)
  [SPARE_REQUEST_TYPES.ASC_RETURN_EXCESS]: ['ASC_RETURN_DEFECTIVE_OUT', 'ASC_RETURN_DEFECTIVE_IN']
};

/**
 * Legacy Request Type Mapping
 * Maps new spare_request_type to legacy request_type for backward compatibility
 * Legacy values are constrained in database: 'consignment_fillup', 'consignment_return'
 */
export const SPARE_REQUEST_TYPE_TO_LEGACY_TYPE = {
  [SPARE_REQUEST_TYPES.CFU]: 'consignment_fillup',
  [SPARE_REQUEST_TYPES.TECH_ISSUE]: 'consignment_fillup',
  [SPARE_REQUEST_TYPES.TECH_RETURN_DEFECTIVE]: 'consignment_return',
  [SPARE_REQUEST_TYPES.ASC_RETURN_DEFECTIVE]: 'consignment_return',
  [SPARE_REQUEST_TYPES.ASC_RETURN_EXCESS]: 'consignment_return',
  [SPARE_REQUEST_TYPES.BRANCH_PICKUP]: 'consignment_fillup'
};