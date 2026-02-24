/**
 * Stock Movement Type Constants
 * Defines all valid stock movement types and their characteristics
 * 
 * These represent WHAT actually happened to stock (Physical Reality)
 */

/**
 * Stock Movement Type enum
 * Code | Movement Type | Bucket Impact
 */
export const STOCK_MOVEMENT_TYPES = {
  // FILLUP_DISPATCH: Branch dispatch to ASC
  // Bucket Impact: In-Transit
  // Relations: Consignment Fill-Up (CFU) - Step 1
  FILLUP_DISPATCH: 'FILLUP_DISPATCH',
  
  // FILLUP_RECEIPT: ASC received fill-up
  // Bucket Impact: Good
  // Relations: Consignment Fill-Up (CFU) - Step 2
  FILLUP_RECEIPT: 'FILLUP_RECEIPT',
  
  // TECH_ISSUE_OUT: Spare issued to technician
  // Bucket Impact: Good ↓ (decreases)
  // Relations: Technician Issue (TECH_ISSUE) - Step 1
  TECH_ISSUE_OUT: 'TECH_ISSUE_OUT',
  
  // TECH_ISSUE_IN: Spare received by technician
  // Bucket Impact: Good
  // Relations: Technician Issue (TECH_ISSUE) - Step 2
  TECH_ISSUE_IN: 'TECH_ISSUE_IN',
  
  // TECH_RETURN_DEFECTIVE: Defective returned by tech
  // Bucket Impact: Defective
  // Relations: Technician Return Defective - Single Step
  TECH_RETURN_DEFECTIVE: 'TECH_RETURN_DEFECTIVE',
  
  // ASC_RETURN_DEFECTIVE_OUT: ASC sends defective
  // Bucket Impact: In-Transit
  // Relations: ASC Return Defective (IW) - Step 1, ASC Return Excess - Step 1
  ASC_RETURN_DEFECTIVE_OUT: 'ASC_RETURN_DEFECTIVE_OUT',
  
  // ASC_RETURN_DEFECTIVE_IN: Branch receives defective
  // Bucket Impact: Defective
  // Relations: ASC Return Defective (IW) - Step 2, ASC Return Excess - Step 2
  ASC_RETURN_DEFECTIVE_IN: 'ASC_RETURN_DEFECTIVE_IN',
  
  // CONSUMPTION_IW: In-Warranty consumption
  // Bucket Impact: Good ↓ (decreases)
  // Relations: Warranty consumption tracking
  CONSUMPTION_IW: 'CONSUMPTION_IW',
  
  // CONSUMPTION_OOW: Out-of-Warranty consumption
  // Bucket Impact: Good ↓ (decreases)
  // Relations: Warranty consumption tracking
  CONSUMPTION_OOW: 'CONSUMPTION_OOW'
};

/**
 * Stock Movement Type Descriptions
 * Human-readable descriptions for each movement type
 */
export const STOCK_MOVEMENT_TYPE_DESCRIPTIONS = {
  [STOCK_MOVEMENT_TYPES.FILLUP_DISPATCH]: 'Branch dispatch to ASC - In-Transit',
  [STOCK_MOVEMENT_TYPES.FILLUP_RECEIPT]: 'ASC received fill-up - Good Stock',
  [STOCK_MOVEMENT_TYPES.TECH_ISSUE_OUT]: 'Spare issued to technician - Good Stock',
  [STOCK_MOVEMENT_TYPES.TECH_ISSUE_IN]: 'Spare received by technician - Good Stock',
  [STOCK_MOVEMENT_TYPES.TECH_RETURN_DEFECTIVE]: 'Defective returned by technician - Defective Stock',
  [STOCK_MOVEMENT_TYPES.ASC_RETURN_DEFECTIVE_OUT]: 'ASC sends defective - In-Transit',
  [STOCK_MOVEMENT_TYPES.ASC_RETURN_DEFECTIVE_IN]: 'Branch receives defective - Defective Stock',
  [STOCK_MOVEMENT_TYPES.CONSUMPTION_IW]: 'In-Warranty consumption - Good Stock',
  [STOCK_MOVEMENT_TYPES.CONSUMPTION_OOW]: 'Out-of-Warranty consumption - Good Stock'
};

/**
 * Bucket Impact Mapping
 * Maps movement type to its impact on inventory buckets
 */
export const BUCKET_IMPACT_MAPPING = {
  // In-Transit movements
  [STOCK_MOVEMENT_TYPES.FILLUP_DISPATCH]: 'In-Transit',
  [STOCK_MOVEMENT_TYPES.ASC_RETURN_DEFECTIVE_OUT]: 'In-Transit',
  
  // Good stock (increases)
  [STOCK_MOVEMENT_TYPES.FILLUP_RECEIPT]: 'Good',
  [STOCK_MOVEMENT_TYPES.TECH_ISSUE_IN]: 'Good',
  
  // Good stock (decreases)
  [STOCK_MOVEMENT_TYPES.TECH_ISSUE_OUT]: 'Good-Decrease',
  [STOCK_MOVEMENT_TYPES.CONSUMPTION_IW]: 'Good-Decrease',
  [STOCK_MOVEMENT_TYPES.CONSUMPTION_OOW]: 'Good-Decrease',
  
  // Defective stock
  [STOCK_MOVEMENT_TYPES.TECH_RETURN_DEFECTIVE]: 'Defective',
  [STOCK_MOVEMENT_TYPES.ASC_RETURN_DEFECTIVE_IN]: 'Defective'
};

/**
 * Movement Type Classification
 * Groups movements by their nature
 */
export const MOVEMENT_CLASSIFICATIONS = {
  // Consignment Fill-Up related
  FILLUP: [
    STOCK_MOVEMENT_TYPES.FILLUP_DISPATCH,
    STOCK_MOVEMENT_TYPES.FILLUP_RECEIPT
  ],
  
  // Technician Issue related
  TECH_ISSUE: [
    STOCK_MOVEMENT_TYPES.TECH_ISSUE_OUT,
    STOCK_MOVEMENT_TYPES.TECH_ISSUE_IN
  ],
  
  // Returns (defective spares)
  RETURNS: [
    STOCK_MOVEMENT_TYPES.TECH_RETURN_DEFECTIVE,
    STOCK_MOVEMENT_TYPES.ASC_RETURN_DEFECTIVE_OUT,
    STOCK_MOVEMENT_TYPES.ASC_RETURN_DEFECTIVE_IN
  ],
  
  // Consumption (warranty)
  CONSUMPTION: [
    STOCK_MOVEMENT_TYPES.CONSUMPTION_IW,
    STOCK_MOVEMENT_TYPES.CONSUMPTION_OOW
  ]
};

/**
 * SAP Integration Mapping
 * Determines which movements trigger SAP uploader
 */
export const SAP_INTEGRATION_MAPPING = {
  // Consignment Fill-Up: SAP uploader = YES (SO → DN → PGI)
  [STOCK_MOVEMENT_TYPES.FILLUP_DISPATCH]: { sapUploader: true, sapProcess: 'SO → DN → PGI' },
  [STOCK_MOVEMENT_TYPES.FILLUP_RECEIPT]: { sapUploader: true, sapProcess: 'SO → DN → PGI' },
  
  // Technician Issue: SAP uploader = NO (Internal CRM stock movement only)
  [STOCK_MOVEMENT_TYPES.TECH_ISSUE_OUT]: { sapUploader: false, sapProcess: 'Internal CRM' },
  [STOCK_MOVEMENT_TYPES.TECH_ISSUE_IN]: { sapUploader: false, sapProcess: 'Internal CRM' },
  
  // Technician Return Defective: SAP uploader = NO (No PGR/GRN, No SAP posting, Just bucket shift)
  [STOCK_MOVEMENT_TYPES.TECH_RETURN_DEFECTIVE]: { sapUploader: false, sapProcess: 'Bucket shift only' },
  
  // ASC Return Defective (IW): SAP uploader = YES (CR, Return Delivery, PGR, Credit Note)
  [STOCK_MOVEMENT_TYPES.ASC_RETURN_DEFECTIVE_OUT]: { sapUploader: true, sapProcess: 'CR → Return Delivery → PGR → CN' },
  [STOCK_MOVEMENT_TYPES.ASC_RETURN_DEFECTIVE_IN]: { sapUploader: true, sapProcess: 'CR → Return Delivery → PGR → CN' },
  
  // Consumption: SAP integration depends on warranty tracking
  [STOCK_MOVEMENT_TYPES.CONSUMPTION_IW]: { sapUploader: false, sapProcess: 'Warranty tracking' },
  [STOCK_MOVEMENT_TYPES.CONSUMPTION_OOW]: { sapUploader: false, sapProcess: 'Warranty tracking' }
};
