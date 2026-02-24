/**
 * MSL Check Service
 * Checks if spare inventory falls below MSL and automatically generates spare requests
 */

import { SpareInventory, SparePartMSL, ServiceCenter, CityTierMaster, SpareRequest, SpareRequestItem, Status } from '../models/index.js';
import { sequelize } from '../db.js';
import { Op } from 'sequelize';
import { SPARE_REQUEST_TYPE_TO_LEGACY_TYPE } from '../constants/requestTypeConstants.js';

/**
 * Check if a service center needs stock replenishment based on MSL
 * @param {number} spareId - Spare part ID
 * @param {number} locationId - Service center ID
 * @param {number} currentQuantity - Current good quantity in inventory
 * @returns {Promise<object>} { needsReplenishment, mslInfo, currentQty }
 */
export async function checkMSLRequirement(spareId, locationId, currentQuantity) {
  try {
    // Get the service center to find city tier
    const serviceCenter = await ServiceCenter.findByPk(locationId);
    if (!serviceCenter) {
      return { needsReplenishment: false, reason: 'Service center not found' };
    }

    // Get city tier for this service center
    const cityTier = await CityTierMaster.findByPk(serviceCenter.city_tier_id);
    if (!cityTier) {
      return { needsReplenishment: false, reason: 'City tier not found' };
    }

    // Get MSL for this spare part and city tier
    const msl = await SparePartMSL.findOne({
      where: {
        spare_part_id: spareId,
        city_tier_id: cityTier.city_tier_id,
        is_active: true,
        effective_from: { [Op.lte]: new Date() },
        [Op.or]: [
          { effective_to: null },
          { effective_to: { [Op.gte]: new Date() } }
        ]
      }
    });

    if (!msl) {
      return { needsReplenishment: false, reason: 'No active MSL found for this spare part' };
    }

    const needsReplenishment = currentQuantity <= msl.minimum_stock_level_qty;

    return {
      needsReplenishment,
      mslInfo: {
        spareId,
        locationId,
        minimumLevel: msl.minimum_stock_level_qty,
        maximumLevel: msl.maximum_stock_level_qty,
        cityTier: cityTier.tier_name
      },
      currentQuantity,
      shortageQty: needsReplenishment ? msl.maximum_stock_level_qty - currentQuantity : 0
    };
  } catch (err) {
    console.error('Error checking MSL:', err.message);
    return { needsReplenishment: false, reason: err.message };
  }
}

/**
 * Auto-generate spare request if inventory is below MSL
 * @param {number} spareId - Spare part ID
 * @param {number} locationId - Service center ID
 * @param {number} currentQuantity - Current good quantity
 * @param {number} userId - User ID initiating the request
 * @returns {Promise<object>} Created request or null if not needed
 */
export async function autoGenerateSpareRequest(spareId, locationId, currentQuantity, userId) {
  try {
    // Check MSL requirement
    const mslCheck = await checkMSLRequirement(spareId, locationId, currentQuantity);

    if (!mslCheck.needsReplenishment) {
      console.log(`ℹ️  Spare ${spareId} at location ${locationId} is above MSL. No request needed.`);
      return null;
    }

    console.log(`📢 Spare ${spareId} at location ${locationId} is BELOW MSL. Quantity needed: ${mslCheck.shortageQty}`);

    // Get service center's plant for routing
    const serviceCenter = await ServiceCenter.findByPk(locationId);
    if (!serviceCenter || !serviceCenter.plant_id) {
      console.error('Cannot create auto-request: Service center or plant_id not found');
      return null;
    }

    // Get or create pending status
    let statusRow = await Status.findOne({ where: { status_name: 'pending' } });
    if (!statusRow) {
      statusRow = await Status.create({ status_name: 'pending' });
    }

    // Create the spare request
    const newRequest = await SpareRequest.create({
      request_type: SPARE_REQUEST_TYPE_TO_LEGACY_TYPE['CFU'], // consignment_fillup
      spare_request_type: 'CFU',
      call_id: null,
      requested_source_type: 'service_center',
      requested_source_id: locationId,
      requested_to_type: 'branch',
      requested_to_id: serviceCenter.plant_id,
      request_reason: 'msl',
      status_id: statusRow.status_id,
      created_by: userId
    });

    // Create request item
    const requestItem = await SpareRequestItem.create({
      request_id: newRequest.request_id,
      spare_id: spareId,
      requested_qty: mslCheck.shortageQty,
      approved_qty: 0
    });

    console.log(`✅ Auto-generated spare request: REQ-${newRequest.request_id} for ${mslCheck.shortageQty} units`);

    return {
      requestId: newRequest.request_id,
      spareId,
      locationId,
      requestedQty: mslCheck.shortageQty
    };
  } catch (err) {
    console.error('Error auto-generating spare request:', err.message);
    return null;
  }
}

/**
 * Scan all service centers and auto-generate requests for spares below MSL
 * @param {number} userId - User ID
 * @returns {Promise<array>} Array of generated requests
 */
export async function scanAndAutoGenerateRequests(userId = 1) {
  try {
    console.log('\n🔍 Scanning all service center inventory for MSL breaches...\n');

    // Get all service center inventory
    const inventoryRecords = await SpareInventory.findAll({
      where: { location_type: 'service_center' },
      attributes: ['spare_id', 'location_id', 'qty_good']
    });

    console.log(`Found ${inventoryRecords.length} inventory records to check\n`);

    const generatedRequests = [];
    let skipped = 0;

    for (const record of inventoryRecords) {
      const result = await autoGenerateSpareRequest(
        record.spare_id,
        record.location_id,
        record.qty_good,
        userId
      );

      if (result) {
        generatedRequests.push(result);
      } else {
        skipped++;
      }
    }

    console.log(`\n📊 Scan Complete:`);
    console.log(`  ✅ Generated: ${generatedRequests.length} requests`);
    console.log(`  ℹ️  Skipped: ${skipped} (inventory above MSL)`);

    return generatedRequests;
  } catch (err) {
    console.error('Error scanning inventory:', err.message);
    return [];
  }
}

export default {
  checkMSLRequirement,
  autoGenerateSpareRequest,
  scanAndAutoGenerateRequests
};
