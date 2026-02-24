/**
 * Automatic Request Type Determination Based on Inventory & Item Status
 * No manual input needed - system checks actual data and determines type
 */

import { SpareInventory, SparePart } from '../models/index.js';
import { determineRequestType, getSAPConsignmentCode } from './requestTypeHelper.js';
import { REQUEST_TYPES, REQUEST_REASONS, LOCATION_TYPES } from '../constants/requestTypeConstants.js';

/**
 * Intelligently determine request type based on actual inventory and item status
 * 
 * Trigger Conditions:
 * 1. Current Stock < MSL + ASC→Branch = CFS (Fill-up needed)
 * 2. Qty > MSL Gap + ASC→Branch = CFS (Bulk fill-up)
 * 3. Is Defective = True + ASC→Branch = CR (Return for credit)
 * 4. Is Verified = True + Branch→ASC = CFU (Final retrieval of verified stock)
 * 
 * @param {Object} requestData Request creation data with items
 * @param {string} requestData.fromType Source location type
 * @param {number} requestData.fromId Source location ID
 * @param {string} requestData.toType Destination location type
 * @param {number} requestData.toId Destination location ID
 * @param {Array} requestData.items Items being requested [{spare_id, quantity, is_defective, is_verified}]
 * @returns {Promise<Object>} {request_type, request_reason, analysis}
 */
export async function determineTypeAutomatically(requestData) {
  const { fromType, fromId, toType, toId, items = [] } = requestData;

  try {
    // 1. ASC requesting from Branch (Stock Fill-up scenarios)
    if (fromType === LOCATION_TYPES.SERVICE_CENTER && toType === LOCATION_TYPES.BRANCH) {
      return await analyzeASCRequest(fromId, toId, items);
    }

    // 2. Branch requesting from ASC (Stock Return or Pick-up scenarios)
    if (fromType === LOCATION_TYPES.BRANCH && toType === LOCATION_TYPES.SERVICE_CENTER) {
      return await analyzeBranchRequest(fromId, toId, items);
    }

    // 3. Technician requesting from ASC
    if (fromType === LOCATION_TYPES.TECHNICIAN && toType === LOCATION_TYPES.SERVICE_CENTER) {
      return await analyzeTechRequest(fromId, toId, items);
    }

    // 4. ASC requesting from Technician (parts return)
    if (fromType === LOCATION_TYPES.SERVICE_CENTER && toType === LOCATION_TYPES.TECHNICIAN) {
      return await analyzeASCToTechRequest(fromId, toId, items);
    }

    // Default fallback
    return {
      request_type: REQUEST_TYPES.NORMAL,
      request_reason: REQUEST_REASONS.MSL,
      sap_code: 'GEN',
      analysis: 'Unknown scenario - using default'
    };
  } catch (error) {
    console.error(`Error auto-determining type: ${error.message}`);
    throw error;
  }
}

/**
 * Analyze ASC→Branch requests
 * Trigger by: MSL level, Bulk orders, or Defective returns
 */
async function analyzeASCRequest(ascId, branchId, items) {
  const analysis = [];
  let totalQty = 0;
  let defectiveQty = 0;
  let hasDefective = false;

  // Analyze each item
  for (const item of items) {
    const spare = await SparePart.findByPk(item.spare_id);
    if (!spare) continue;

    totalQty += item.quantity || 0;

    // Check if item is marked as defective
    if (item.is_defective) {
      hasDefective = true;
      defectiveQty += item.quantity || 0;
      analysis.push({
        spare_id: item.spare_id,
        spare_name: spare.description,
        status: 'DEFECTIVE',
        quantity: item.quantity
      });
    } else {
      // Check inventory level for good stock
      const inventory = await SpareInventory.findOne({
        where: { spare_id: item.spare_id, owner_id: ascId }
      });

      if (inventory) {
        const mslLevel = inventory.msl_level || 0;
        const currentStock = inventory.stock_quantity || 0;
        const stockGap = Math.max(0, mslLevel - currentStock);

        analysis.push({
          spare_id: item.spare_id,
          spare_name: spare.description,
          current_stock: currentStock,
          msl_level: mslLevel,
          stock_gap: stockGap,
          status: currentStock < mslLevel ? 'BELOW_MSL' : 'OK'
        });
      }
    }
  }

  // Determine type based on analysis
  if (hasDefective) {
    // Trigger 3: Returning defective parts
    return {
      request_type: REQUEST_TYPES.CONSIGNMENT_RETURN,
      request_reason: REQUEST_REASONS.DEFECT,
      sap_code: getSAPConsignmentCode(REQUEST_TYPES.CONSIGNMENT_RETURN),
      analysis: {
        message: `Return of ${defectiveQty} defective part(s)`,
        details: analysis
      }
    };
  }

  // Trigger 1 & 2: Check if it's MSL-based or bulk
  if (totalQty > 50 || items.length > 10) {
    // Trigger 2: Bulk order
    return {
      request_type: REQUEST_TYPES.CONSIGNMENT_FILLUP,
      request_reason: REQUEST_REASONS.BULK,
      sap_code: getSAPConsignmentCode(REQUEST_TYPES.CONSIGNMENT_FILLUP),
      analysis: {
        message: `Bulk fill-up order (${totalQty} items)`,
        details: analysis
      }
    };
  }

  // Default: Standard MSL replenishment
  return {
    request_type: REQUEST_TYPES.CONSIGNMENT_FILLUP,
    request_reason: REQUEST_REASONS.MSL,
    sap_code: getSAPConsignmentCode(REQUEST_TYPES.CONSIGNMENT_FILLUP),
    analysis: {
      message: 'Standard MSL replenishment order',
      details: analysis
    }
  };
}

/**
 * Analyze Branch→ASC requests
 * Trigger by: Verified faulty stock retrieval (CFU) or returns (CR)
 */
async function analyzeBranchRequest(branchId, ascId, items) {
  const analysis = [];
  let verifiedCount = 0;
  let unusedCount = 0;

  for (const item of items) {
    const spare = await SparePart.findByPk(item.spare_id);
    if (!spare) continue;

    // Trigger 4: Check if stock is verified (ready for final retrieval)
    if (item.is_verified) {
      verifiedCount++;
      analysis.push({
        spare_id: item.spare_id,
        spare_name: spare.description,
        status: 'VERIFIED_FAULTY',
        quantity: item.quantity
      });
    }
    // Check if marked as unused
    else if (item.is_unused) {
      unusedCount++;
      analysis.push({
        spare_id: item.spare_id,
        spare_name: spare.description,
        status: 'UNUSED',
        quantity: item.quantity
      });
    } else {
      analysis.push({
        spare_id: item.spare_id,
        spare_name: spare.description,
        status: 'REGULAR',
        quantity: item.quantity
      });
    }
  }

  // Trigger 4: Verified stock - final retrieval (Pick-up)
  if (verifiedCount > 0) {
    return {
      request_type: REQUEST_TYPES.CONSIGNMENT_PICKUP,
      request_reason: REQUEST_REASONS.PICKUP,
      sap_code: getSAPConsignmentCode(REQUEST_TYPES.CONSIGNMENT_PICKUP),
      analysis: {
        message: `Physical pick-up of ${verifiedCount} verified faulty part(s)`,
        details: analysis
      }
    };
  }

  // Unused stock return
  if (unusedCount > 0) {
    return {
      request_type: REQUEST_TYPES.CONSIGNMENT_RETURN,
      request_reason: REQUEST_REASONS.UNUSED,
      sap_code: getSAPConsignmentCode(REQUEST_TYPES.CONSIGNMENT_RETURN),
      analysis: {
        message: `Return of ${unusedCount} unused/expired part(s)`,
        details: analysis
      }
    };
  }

  // Default: Regular pick-up
  return {
    request_type: REQUEST_TYPES.CONSIGNMENT_PICKUP,
    request_reason: REQUEST_REASONS.PICKUP,
    sap_code: getSAPConsignmentCode(REQUEST_TYPES.CONSIGNMENT_PICKUP),
    analysis: {
      message: 'Regular stock retrieval/pick-up from ASC',
      details: analysis
    }
  };
}

/**
 * Analyze Technician→ASC requests
 * Trigger by: Defective equipment return
 */
async function analyzeTechRequest(techId, ascId, items) {
  const analysis = [];

  for (const item of items) {
    const spare = await SparePart.findByPk(item.spare_id);
    if (!spare) continue;

    analysis.push({
      spare_id: item.spare_id,
      spare_name: spare.description,
      quantity: item.quantity,
      status: 'TECH_RETURN'
    });
  }

  return {
    request_type: REQUEST_TYPES.TECH_DEFECTIVE_RETURN,
    request_reason: REQUEST_REASONS.DEFECT,
    sap_code: getSAPConsignmentCode(REQUEST_TYPES.TECH_DEFECTIVE_RETURN),
    analysis: {
      message: `Technician returning ${items.length} defective equipment item(s)`,
      details: analysis
    }
  };
}

/**
 * Analyze ASC→Technician requests
 * Always Tech Consignment Issue
 */
async function analyzeASCToTechRequest(ascId, techId, items) {
  const analysis = [];

  for (const item of items) {
    const spare = await SparePart.findByPk(item.spare_id);
    if (!spare) continue;

    analysis.push({
      spare_id: item.spare_id,
      spare_name: spare.description,
      quantity: item.quantity,
      status: 'ISSUED_TO_TECH'
    });
  }

  return {
    request_type: REQUEST_TYPES.TECH_CONSIGNMENT_ISSUE,
    request_reason: REQUEST_REASONS.BULK,
    sap_code: getSAPConsignmentCode(REQUEST_TYPES.TECH_CONSIGNMENT_ISSUE),
    analysis: {
      message: `Issuing ${items.length} part(s) to technician`,
      details: analysis
    }
  };
}

/**
 * Get a human-readable summary of the determination
 */
export function getAutoDeterminationSummary(result) {
  return {
    type: result.request_type,
    sap_code: result.sap_code,
    reason: result.request_reason,
    message: result.analysis.message,
    details: result.analysis.details
  };
}
