/**
 * Status and Sub-Status Management Service
 * Handles all status/sub-status updates with action logging
 */

import { Calls, Status, SubStatus, ActionLog, Users, Roles } from '../models/index.js';
import { sequelize } from '../db.js';

/**
 * Get status ID by name
 */
export const getStatusByName = async (statusName) => {
  try {
    const status = await Status.findOne({
      where: sequelize.where(
        sequelize.fn('LOWER', sequelize.col('status_name')),
        sequelize.Op.eq,
        statusName.toLowerCase()
      )
    });
    return status;
  } catch (err) {
    console.error(`Error fetching status "${statusName}":`, err.message);
    return null;
  }
};

/**
 * Get sub-status ID by name and status ID
 */
export const getSubStatusByName = async (statusId, subStatusName) => {
  try {
    const subStatus = await SubStatus.findOne({
      where: {
        status_id: statusId,
        ...sequelize.where(
          sequelize.fn('LOWER', sequelize.col('sub_status_name')),
          sequelize.Op.eq,
          subStatusName.toLowerCase()
        )
      }
    });
    return subStatus;
  } catch (err) {
    console.error(`Error fetching sub-status "${subStatusName}":`, err.message);
    return null;
  }
};

/**
 * Update call status and sub-status with action logging
 * 
 * @param {Object} options
 * @param {number} options.callId - The call ID
 * @param {string} options.statusName - New status name
 * @param {string} options.subStatusName - New sub-status name
 * @param {number} options.userId - User ID making the action
 * @param {number} options.userRoleId - Role ID of the user
 * @param {string} options.remarks - Action remarks
 * @returns {Object} Result with previous and new status details
 */
export const updateCallStatusAndSubStatus = async (options) => {
  const {
    callId,
    statusName,
    subStatusName,
    userId,
    userRoleId,
    remarks = ''
  } = options;

  try {
    // Validate required fields
    if (!callId || !statusName) {
      throw new Error('callId and statusName are required');
    }

    // Fetch current call
    const call = await Calls.findByPk(callId);
    if (!call) {
      throw new Error(`Call ${callId} not found`);
    }

    // Get primary status
    const newStatus = await getStatusByName(statusName);
    if (!newStatus) {
      throw new Error(`Status "${statusName}" not found`);
    }

    // Get sub-status if provided
    let newSubStatus = null;
    if (subStatusName) {
      newSubStatus = await getSubStatusByName(newStatus.status_id, subStatusName);
      if (!newSubStatus) {
        throw new Error(`Sub-status "${subStatusName}" not found for status "${statusName}"`);
      }
    }

    // Store old values for action log
    const oldStatusId = call.status_id;
    const oldSubStatusId = call.sub_status_id;

    // Update call
    await Calls.update(
      {
        status_id: newStatus.status_id,
        sub_status_id: newSubStatus ? newSubStatus.sub_status_id : null
      },
      { where: { call_id: callId } }
    );

    // Log action
    if (userId) {
      await ActionLog.create({
        entity_type: 'Calls',
        entity_id: callId,
        action_user_role_id: userRoleId || null,
        user_id: userId,
        old_status_id: oldStatusId,
        new_status_id: newStatus.status_id,
        old_substatus_id: oldSubStatusId,
        new_substatus_id: newSubStatus ? newSubStatus.sub_status_id : null,
        remarks: remarks || `Status changed from "${call.status_id}" to "${newStatus.status_name}"${newSubStatus ? `, Sub-status: "${newSubStatus.sub_status_name}"` : ''}`
      });
    }

    return {
      success: true,
      callId,
      previousStatus: {
        statusId: oldStatusId,
        subStatusId: oldSubStatusId
      },
      newStatus: {
        statusId: newStatus.status_id,
        statusName: newStatus.status_name,
        subStatusId: newSubStatus ? newSubStatus.sub_status_id : null,
        subStatusName: newSubStatus ? newSubStatus.sub_status_name : null
      }
    };
  } catch (err) {
    console.error('Error updating call status:', err.message);
    throw err;
  }
};

/**
 * Get status sequence/history for a call
 */
export const getCallStatusHistory = async (callId) => {
  try {
    const history = await ActionLog.findAll({
      where: {
        entity_type: 'Calls',
        entity_id: callId
      },
      include: [
        {
          model: Status,
          as: 'oldStatus',
          attributes: ['status_id', 'status_name'],
          foreignKey: 'old_status_id'
        },
        {
          model: Status,
          as: 'newStatus',
          attributes: ['status_id', 'status_name'],
          foreignKey: 'new_status_id'
        },
        {
          model: SubStatus,
          as: 'oldSubStatus',
          attributes: ['sub_status_id', 'sub_status_name'],
          foreignKey: 'old_substatus_id'
        },
        {
          model: SubStatus,
          as: 'newSubStatus',
          attributes: ['sub_status_id', 'sub_status_name'],
          foreignKey: 'new_substatus_id'
        },
        {
          model: Users,
          as: 'user',
          attributes: ['user_id', 'username', 'email'],
          required: false
        }
      ],
      order: [['action_at', 'ASC']]
    });

    return history.map(log => ({
      logId: log.log_id,
      timestamp: log.action_at,
      remarks: log.remarks,
      userId: log.user_id,
      username: log.user?.username || 'System',
      userRoleId: log.action_user_role_id,
      previousStatus: log.oldStatus ? {
        statusId: log.oldStatus.status_id,
        statusName: log.oldStatus.status_name
      } : null,
      newStatus: log.newStatus ? {
        statusId: log.newStatus.status_id,
        statusName: log.newStatus.status_name
      } : null,
      previousSubStatus: log.oldSubStatus ? {
        subStatusId: log.oldSubStatus.sub_status_id,
        subStatusName: log.oldSubStatus.sub_status_name
      } : null,
      newSubStatus: log.newSubStatus ? {
        subStatusId: log.newSubStatus.sub_status_id,
        subStatusName: log.newSubStatus.sub_status_name
      } : null
    }));
  } catch (err) {
    console.error('Error fetching call status history:', err.message);
    return [];
  }
};

/**
 * Get current status details for a call
 */
export const getCallCurrentStatus = async (callId) => {
  try {
    const call = await Calls.findByPk(callId, {
      include: [
        {
          model: Status,
          as: 'status',
          attributes: ['status_id', 'status_name']
        },
        {
          model: SubStatus,
          as: 'subStatus',
          attributes: ['sub_status_id', 'sub_status_name']
        }
      ]
    });

    if (!call) {
      return null;
    }

    return {
      callId,
      status: call.status ? {
        statusId: call.status.status_id,
        statusName: call.status.status_name
      } : null,
      subStatus: call.subStatus ? {
        subStatusId: call.subStatus.sub_status_id,
        subStatusName: call.subStatus.sub_status_name
      } : null
    };
  } catch (err) {
    console.error('Error fetching call current status:', err.message);
    return null;
  }
};

export default {
  getStatusByName,
  getSubStatusByName,
  updateCallStatusAndSubStatus,
  getCallStatusHistory,
  getCallCurrentStatus
};
