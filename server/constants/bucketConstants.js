/**
 * Bucket Constants
 * Defines inventory buckets and their operations
 * 
 * Each stock movement affects exactly ONE bucket
 */

/**
 * Bucket Types enum
 * Three main buckets for inventory tracking
 */
export const BUCKETS = {
  GOOD: 'GOOD',              // Saleable / usable stock
  DEFECTIVE: 'DEFECTIVE',    // IW defective spares
  IN_TRANSIT: 'IN_TRANSIT'   // Moving between locations
};

/**
 * Bucket Operations enum
 * How the bucket quantity changes
 */
export const BUCKET_OPERATIONS = {
  INCREASE: 'INCREASE',      // Add to bucket quantity
  DECREASE: 'DECREASE'       // Remove from bucket quantity
};

/**
 * Stock Movement to Bucket Mapping
 * Maps each stock_movement_type to its bucket and operation
 * 
 * Format: {
 *   bucket: BUCKETS.XXX,
 *   operation: BUCKET_OPERATIONS.XXX,
 *   description: 'Human readable'
 * }
 */
export const MOVEMENT_TO_BUCKET_MAPPING = {
  // Consignment Fill-Up Movements ===============================
  FILLUP_DISPATCH: {
    bucket: BUCKETS.IN_TRANSIT,
    operation: BUCKET_OPERATIONS.INCREASE,
    description: 'Branch dispatch to ASC - qty moves to IN_TRANSIT'
  },
  
  FILLUP_RECEIPT: {
    bucket: BUCKETS.GOOD,
    operation: BUCKET_OPERATIONS.INCREASE,
    description: 'ASC received fill-up - qty added to GOOD stock'
  },

  // Technician Issue Movements ===============================
  TECH_ISSUE_OUT: {
    bucket: BUCKETS.GOOD,
    operation: BUCKET_OPERATIONS.DECREASE,
    description: 'Spare issued to technician - qty removed from GOOD stock'
  },
  
  TECH_ISSUE_IN: {
    bucket: BUCKETS.GOOD,
    operation: BUCKET_OPERATIONS.INCREASE,
    description: 'Technician receives spare - qty added to GOOD stock'
  },

  // Technician Return Movements ===============================
  TECH_RETURN_DEFECTIVE: {
    bucket: BUCKETS.DEFECTIVE,
    operation: BUCKET_OPERATIONS.INCREASE,
    description: 'Defective returned by technician - qty added to DEFECTIVE stock'
  },

  // ASC Return Defective Movements ===============================
  ASC_RETURN_DEFECTIVE_OUT: {
    bucket: BUCKETS.GOOD,
    operation: BUCKET_OPERATIONS.DECREASE,
    description: 'ASC sends defective - qty removed from GOOD stock'
  },
  
  ASC_RETURN_DEFECTIVE_IN: {
    bucket: BUCKETS.DEFECTIVE,
    operation: BUCKET_OPERATIONS.INCREASE,
    description: 'Branch receives defective - qty added to DEFECTIVE stock'
  },

  // Consumption Movements ===============================
  CONSUMPTION_IW: {
    bucket: BUCKETS.GOOD,
    operation: BUCKET_OPERATIONS.DECREASE,
    description: 'In-Warranty consumption - qty removed from GOOD stock'
  },
  
  CONSUMPTION_OOW: {
    bucket: BUCKETS.GOOD,
    operation: BUCKET_OPERATIONS.DECREASE,
    description: 'Out-of-Warranty consumption - qty removed from GOOD stock'
  }
};

/**
 * Bucket Descriptions
 * Human-readable descriptions for each bucket
 */
export const BUCKET_DESCRIPTIONS = {
  [BUCKETS.GOOD]: 'Saleable / usable stock available for allocation',
  [BUCKETS.DEFECTIVE]: 'IW defective spares awaiting return or disposal',
  [BUCKETS.IN_TRANSIT]: 'Stock in movement between locations'
};

/**
 * Helper function: Get bucket info for a stock movement
 * 
 * @param {string} stockMovementType - The stock_movement_type
 * @returns {object|null} Bucket mapping object or null if not found
 */
export function getBucketForMovement(stockMovementType) {
  return MOVEMENT_TO_BUCKET_MAPPING[stockMovementType] || null;
}

/**
 * Helper function: Check if operation increases or decreases bucket
 * 
 * @param {string} operation - BUCKET_OPERATIONS.XXX value
 * @returns {boolean} true if INCREASE, false if DECREASE
 */
export function isIncreaseOperation(operation) {
  return operation === BUCKET_OPERATIONS.INCREASE;
}

/**
 * Helper function: Calculate new quantity based on operation
 * 
 * @param {number} currentQty - Current bucket quantity
 * @param {number} movementQty - Quantity being moved
 * @param {string} operation - BUCKET_OPERATIONS.INCREASE or DECREASE
 * @returns {number} New bucket quantity
 */
export function calculateNewQuantity(currentQty, movementQty, operation) {
  if (operation === BUCKET_OPERATIONS.INCREASE) {
    return currentQty + movementQty;
  } else if (operation === BUCKET_OPERATIONS.DECREASE) {
    return Math.max(0, currentQty - movementQty); // Never go below 0
  }
  return currentQty;
}

/**
 * Helper function: Validate bucket quantity doesn't go negative
 * 
 * @param {number} currentQty - Current quantity in bucket
 * @param {number} decreaseQty - Quantity to decrease by
 * @returns {object} { valid: boolean, message: string, adjustedQty: number }
 */
export function validateBucketDecrease(currentQty, decreaseQty) {
  if (decreaseQty > currentQty) {
    return {
      valid: false,
      message: `Insufficient stock. Trying to remove ${decreaseQty} but only ${currentQty} available`,
      adjustedQty: 0
    };
  }
  
  return {
    valid: true,
    message: 'Decrease operation valid',
    adjustedQty: currentQty - decreaseQty
  };
}
