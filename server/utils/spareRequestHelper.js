/**
 * Helper function to create a spare request with auto-determined request_type
 * 
 * @param {Object} requestData - Object containing request details
 * @param {string} requestData.requested_source_type - Type of source (technician, service_center, branch, warehouse)
 * @param {number} requestData.requested_source_id - ID of the source
 * @param {string} requestData.requested_to_type - Type of destination (technician, service_center, branch, warehouse)
 * @param {number} requestData.requested_to_id - ID of the destination
 * @param {string} [requestData.call_id] - Optional call ID
 * @param {string} [requestData.request_reason] - Optional request reason (defect, msl, bulk, replacement)
 * @param {number} [requestData.status_id] - Optional status ID
 * @param {number} [requestData.created_by] - Optional user ID who created the request
 * @param {Object} [options] - Additional options
 * @param {Object} [options.transaction] - Sequelize transaction object
 * @returns {Promise<Object>} Created SpareRequest record
 */
export async function createSpareRequestWithAutoType(requestData, options = {}) {
  const { SpareRequest, determineRequestType } = await import('../models/index.js').then(async (mod) => {
    return {
      SpareRequest: mod.SpareRequest,
      determineRequestType: (await import('./requestTypeHelper.js')).determineRequestType
    };
  });

  // Import the helper function
  const { determineRequestType: getType } = await import('./requestTypeHelper.js');

  // Auto-determine request type based on source and destination
  const autoRequestType = getType(requestData.requested_source_type, requestData.requested_to_type);

  const createData = {
    request_type: autoRequestType,
    call_id: requestData.call_id || null,
    requested_source_type: requestData.requested_source_type,
    requested_source_id: requestData.requested_source_id,
    requested_to_type: requestData.requested_to_type,
    requested_to_id: requestData.requested_to_id,
    request_reason: requestData.request_reason || 'msl',
    status_id: requestData.status_id || null,
    created_by: requestData.created_by || null
  };

  return await SpareRequest.create(createData, { transaction: options.transaction });
}
