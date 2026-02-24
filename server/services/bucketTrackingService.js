/**
 * Bucket Tracking Service
 * Manages inventory bucket updates (GOOD, DEFECTIVE, IN_TRANSIT)
 * Uses SpareInventory table with qty_good, qty_defective, qty_in_transit columns
 * 
 * Each movement updates exactly ONE bucket
 */

import { SpareInventory, StockMovement } from '../models/index.js';
import {
  BUCKETS,
  BUCKET_OPERATIONS,
  MOVEMENT_TO_BUCKET_MAPPING,
  getBucketForMovement,
  calculateNewQuantity,
  validateBucketDecrease
} from '../constants/bucketConstants.js';

/**
 * Get or create inventory record for a spare/location combination
 * @param {number} spareId - Spare ID (from spare_parts table)
 * @param {string} locationType - Location type
 * @param {number} locationId - Location ID
 * @returns {Promise<object>} SpareInventory record
 */
export async function getOrCreateInventory(spareId, locationType, locationId) {
  try {
    let inventory = await SpareInventory.findOne({
      where: {
        spare_id: spareId,
        location_type: locationType,
        location_id: locationId
      }
    });

    if (!inventory) {
      inventory = await SpareInventory.create({
        spare_id: spareId,
        location_type: locationType,
        location_id: locationId,
        qty_good: 0,
        qty_defective: 0,
        qty_in_transit: 0
      });
    }

    return inventory;
  } catch (error) {
    console.error('Error in getOrCreateInventory:', error);
    throw error;
  }
}

/**
 * Get quantity field name for a bucket
 * @param {string} bucket - BUCKETS.GOOD, BUCKETS.DEFECTIVE, or BUCKETS.IN_TRANSIT
 * @returns {string} Field name (qty_good, qty_defective, qty_in_transit)
 */
function getBucketFieldName(bucket) {
  const fieldMap = {
    [BUCKETS.GOOD]: 'qty_good',
    [BUCKETS.DEFECTIVE]: 'qty_defective',
    [BUCKETS.IN_TRANSIT]: 'qty_in_transit'
  };
  return fieldMap[bucket];
}

/**
 * Update bucket quantity based on stock movement
 * @param {object} movement - StockMovement record
 * @param {string} bucket - BUCKETS bucket name
 * @param {string} operation - BUCKET_OPERATIONS operation
 * @param {number} quantity - Quantity being moved
 * @returns {Promise<object>} Updated inventory record with change details
 */
export async function updateBucketQuantity(movement, bucket, operation, quantity) {
  try {
    // Determine location: INCREASE uses destination, DECREASE uses source
    let locationType, locationId;
    
    if (operation === BUCKET_OPERATIONS.INCREASE) {
      locationType = movement.destination_location_type || 'warehouse';
      locationId = movement.destination_location_id || 1;
    } else {
      locationType = movement.source_location_type || 'warehouse';
      locationId = movement.source_location_id || 1;
    }

    // Get or create inventory
    const inventory = await getOrCreateInventory(
      movement.spare_id || movement.model_id,
      locationType,
      locationId
    );

    // Get the field name for this bucket
    const fieldName = getBucketFieldName(bucket);
    const currentQty = inventory[fieldName] || 0;

    // Validate DECREASE operations
    if (operation === BUCKET_OPERATIONS.DECREASE) {
      const validation = validateBucketDecrease(currentQty, quantity);
      if (!validation.valid) {
        throw new Error(`Bucket validation failed: ${validation.message}`);
      }
    }

    // Calculate new quantity
    const newQty = calculateNewQuantity(currentQty, quantity, operation);

    // Update the inventory
    const updateData = { [fieldName]: newQty };
    const before = currentQty;
    await inventory.update(updateData);

    return {
      success: true,
      bucket: bucket,
      operation: operation,
      field: fieldName,
      previousQuantity: before,
      newQuantity: newQty,
      delta: operation === BUCKET_OPERATIONS.INCREASE ? quantity : -quantity
    };
  } catch (error) {
    console.error('Error in updateBucketQuantity:', error);
    throw error;
  }
}

/**
 * Process stock movement - automatically updates appropriate bucket
 * IMPORTANT: movement.spare_id must be provided (not model_id)
 * 
 * @param {object} stockMovementData - Stock movement data
 * @param {number} stockMovementData.spare_id - Spare ID (required for inventory update)
 * @param {string} stockMovementData.stock_movement_type - Movement type
 * @param {number} stockMovementData.total_qty - Quantity being moved
 * @returns {Promise<object>} Result with movement and bucket updates
 */
export async function processMovement(stockMovementData) {
  try {
    // Get bucket mapping for this movement type
    const bucketMapping = getBucketForMovement(stockMovementData.stock_movement_type);
    
    if (!bucketMapping) {
      throw new Error(`Unknown stock_movement_type: ${stockMovementData.stock_movement_type}`);
    }

    // Add bucket and operation to movement data
    const movementDataWithBucket = {
      ...stockMovementData,
      bucket: bucketMapping.bucket,
      bucket_operation: bucketMapping.operation
    };

    // Create the stock movement record
    const movement = await StockMovement.create(movementDataWithBucket);

    // Update the bucket
    const bucketUpdate = await updateBucketQuantity(
      movement,
      bucketMapping.bucket,
      bucketMapping.operation,
      stockMovementData.total_qty
    );

    return {
      success: true,
      movement: movement,
      bucketUpdate: bucketUpdate,
      message: `Movement created and ${bucketMapping.bucket} bucket updated (${bucketMapping.operation} ${stockMovementData.total_qty})`
    };
  } catch (error) {
    console.error('Error in processMovement:', error);
    throw error;
  }
}

/**
 * Get current bucket quantities for a spare at a location
 * @param {number} spareId - Spare ID
 * @param {string} locationType - Location type
 * @param {number} locationId - Location ID
 * @returns {Promise<object>} Current quantities for each bucket
 */
export async function getBucketSummary(spareId, locationType, locationId) {
  try {
    const inventory = await getOrCreateInventory(spareId, locationType, locationId);

    const summary = {
      spare_id: spareId,
      location_type: locationType,
      location_id: locationId,
      [BUCKETS.GOOD]: inventory.qty_good || 0,
      [BUCKETS.DEFECTIVE]: inventory.qty_defective || 0,
      [BUCKETS.IN_TRANSIT]: inventory.qty_in_transit || 0
    };

    summary.total = summary[BUCKETS.GOOD] + summary[BUCKETS.DEFECTIVE] + summary[BUCKETS.IN_TRANSIT];

    return summary;
  } catch (error) {
    console.error('Error in getBucketSummary:', error);
    throw error;
  }
}

/**
 * Get movement history for a spare location
 * @param {number} spareId - Spare ID
 * @param {string} locationType - Location type
 * @param {number} locationId - Location ID
 * @param {string} bucket - Bucket name (or null for all)
 * @returns {Promise<array>} List of movements
 */
export async function getBucketMovementHistory(spareId, locationType, locationId, bucket = null) {
  try {
    const where = {
      spare_id: spareId,
      destination_location_type: locationType,
      destination_location_id: locationId
    };

    if (bucket) {
      where.bucket = bucket;
    }

    const movements = await StockMovement.findAll({
      where: where,
      order: [['movement_date', 'DESC']],
      limit: 100
    });

    return movements;
  } catch (error) {
    console.error('Error in getBucketMovementHistory:', error);
    throw error;
  }
}

/**
 * Validate bucket operation won't cause shortage
 * @param {number} spareId - Spare ID
 * @param {string} locationType - Location type
 * @param {number} locationId - Location ID
 * @param {number} decreaseQuantity - Quantity to decrease
 * @returns {Promise<object>} Validation result
 */
export async function validateBucketOperation(spareId, locationType, locationId, decreaseQuantity) {
  try {
    const summary = await getBucketSummary(spareId, locationType, locationId);
    const goodQty = summary[BUCKETS.GOOD] || 0;

    if (goodQty < decreaseQuantity) {
      return {
        valid: false,
        message: `Insufficient GOOD stock. Available: ${goodQty}, Requested: ${decreaseQuantity}`,
        available: goodQty,
        requested: decreaseQuantity,
        shortage: decreaseQuantity - goodQty
      };
    }

    return {
      valid: true,
      message: 'Sufficient stock available',
      available: goodQty,
      requested: decreaseQuantity,
      shortage: 0
    };
  } catch (error) {
    console.error('Error in validateBucketOperation:', error);
    throw error;
  }
}

export default {
  getOrCreateInventory,
  updateBucketQuantity,
  processMovement,
  getBucketSummary,
  getBucketMovementHistory,
  validateBucketOperation
};
