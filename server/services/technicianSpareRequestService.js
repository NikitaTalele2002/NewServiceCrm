import { sequelize, sql, poolPromise } from "../db.js";
import { 
  SpareRequest, 
  SpareRequestItem, 
  Approvals, 
  StockMovement,
  Technicians,
  Calls,
  SparePart,
  Status
} from "../models/index.js";
import { Op } from "sequelize";

/**
 * Get technician spare requests for a service center
 * Filters requests from technicians assigned to this service center
 */
export async function getTechnicianRequestsForServiceCenter(serviceCenterId) {
  try {
    const requests = await SpareRequest.findAll({
      where: {
        requested_source_type: 'technician',
        requested_to_type: 'service_center',
        requested_to_id: serviceCenterId,
      },
      include: [
        {
          model: SpareRequestItem,
          as: 'SpareRequestItems',
          include: [
            {
              model: SparePart,
              as: 'SparePart',
              attributes: ['Id', 'Spare_Code', 'Spare_Desc']
            }
          ]
        },
        {
          model: Technicians,
          as: 'Technician',
          attributes: ['technician_id', 'name', 'mobile_no']
        },
        {
          model: Calls,
          as: 'Call',
          attributes: ['call_id', 'ref_call_id']
        }
      ],
      order: [['created_at', 'DESC']],
      raw: false,
    });

    return requests.map(req => ({
      id: req.request_id,
      requestId: `REQ-${req.request_id}`,
      spare_request_type: req.spare_request_type,
      request_reason: req.request_reason,
      technician_id: req.requested_source_id,
      technicianName: req.Technician?.name || 'Unknown',
      call_id: req.call_id,
      status: req.status_id,
      createdAt: req.created_at,
      items: req.SpareRequestItems?.map(item => ({
        id: item.id,
        spare_id: item.spare_id,
        spare_code: item.SparePart?.Spare_Code,
        spare_desc: item.SparePart?.Spare_Desc,
        requestedQty: item.requested_qty,
        approvedQty: item.approved_qty || 0,
        rejectionReason: item.rejection_reason,
        sku: item.SparePart?.Spare_Code,
        partCode: item.SparePart?.Spare_Code,
        description: item.SparePart?.Spare_Desc,
      })) || []
    }));
  } catch (error) {
    console.error('Error fetching technician requests:', error);
    throw error;
  }
}

/**
 * Get single technician request details
 */
export async function getTechnicianRequestDetails(requestId, serviceCenterId) {
  try {
    const request = await SpareRequest.findByPk(requestId, {
      include: [
        {
          model: SpareRequestItem,
          as: 'SpareRequestItems',
          include: [
            {
              model: SparePart,
              as: 'SparePart',
              attributes: ['Id', 'Spare_Code', 'Spare_Desc']
            }
          ]
        },
        {
          model: Technicians,
          as: 'Technician',
          attributes: ['technician_id', 'name', 'mobile_no', 'service_center_id']
        },
        {
          model: Calls,
          as: 'Call',
          attributes: ['call_id']
        }
      ],
      raw: false,
    });

    if (!request) {
      throw new Error('Request not found');
    }

    // Check authorization
    if (request.requested_to_id !== serviceCenterId) {
      throw new Error('Not authorized to view this request');
    }

    return {
      id: request.request_id,
      requestId: `REQ-${request.request_id}`,
      spare_request_type: request.spare_request_type,
      request_reason: request.request_reason,
      technician_id: request.requested_source_id,
      technicianName: request.Technician?.name || 'Unknown',
      call_id: request.call_id,
      status_id: request.status_id,
      createdAt: request.created_at,
      items: request.SpareRequestItems?.map(item => ({
        id: item.id,
        spare_id: item.spare_id,
        spare_code: item.SparePart?.Spare_Code,
        spare_desc: item.SparePart?.Spare_Desc,
        requestedQty: item.requested_qty,
        approvedQty: item.approved_qty || 0,
        rejectionReason: item.rejection_reason,
        sku: item.SparePart?.Spare_Code,
        partCode: item.SparePart?.Spare_Code,
        description: item.SparePart?.Spare_Desc,
      })) || []
    };
  } catch (error) {
    console.error('Error fetching request details:', error);
    throw error;
  }
}

/**
 * Approve technician spare request
 * - Check inventory at service center
 * - Create approval record
 * - Create stock movement for approved items
 */
export async function approveTechnicianRequest(
  requestId, 
  serviceCenterId, 
  approverId,
  approvalData
) {
  const transaction = await sequelize.transaction();
  try {
    const request = await SpareRequest.findByPk(requestId, {
      include: [
        {
          model: SpareRequestItem,
          as: 'SpareRequestItems',
        }
      ],
      transaction,
    });

    if (!request) throw new Error('Request not found');
    if (request.requested_to_id !== serviceCenterId) throw new Error('Not authorized');

    const approvedItemsData = approvalData.items || [];
    const stockMovements = [];

    // Process each item items are approveditemsData =
    for (const itemData of approvedItemsData) {
      const item = request.SpareRequestItems.find(i => i.id === itemData.itemId);
      if (!item) continue;

      const approvedQty = itemData.approvedQty || 0;
      const isRejected = itemData.isRejected || false;

      // Update spare request item
      await item.update({
        approved_qty: isRejected ? 0 : approvedQty,
        rejection_reason: isRejected ? itemData.rejectionReason : null,
      }, { transaction });

      // Create approval record
      await Approvals.create({
        entity_type: 'spare_request_item',
        entity_id: item.id,
        approval_level: 1,
        approver_user_id: approverId,
        approval_status: isRejected ? 'rejected' : 'approved',
        approval_remarks: itemData.remarks || null,
        approved_at: new Date(),
      }, { transaction });

      // Create stock movement if approved (no physical DN/Challan for tech requests)
      if (!isRejected && approvedQty > 0) {
        const movement = await StockMovement.create({
          stock_movement_type: 'TECH_ISSUE_OUT',
          reference_type: 'spare_request',
          reference_no: `REQ-${request.request_id}`,
          source_location_type: 'service_center',
          source_location_id: serviceCenterId,
          destination_location_type: 'technician',
          destination_location_id: request.requested_source_id,
          total_qty: approvedQty,
          movement_date: new Date(),
          status: 'pending',
          created_by: approverId,
          created_at: new Date(),
        }, { transaction });

        // Create goods movement item for this spare
        const { GoodsMovementItems } = await import('../models/index.js');
        await GoodsMovementItems.create({
          movement_id: movement.movement_id,
          spare_part_id: item.spare_id,
          qty: approvedQty,
          condition: 'good'
        }, { transaction });

        stockMovements.push({
          movement_id: movement.movement_id,
          reference_no: movement.reference_no,
          qty: approvedQty,
        });
        console.log(`Created stock movement: ${movement.movement_id}`);
      }
    }

    // Update the request status
    const approvedStatus = await Status.findOne({
      where: { status_name: 'approved' },
      transaction,
    });

    if (approvedStatus) {
      await request.update({
        status_id: approvedStatus.status_id,
        updated_at: new Date(),
      }, { transaction });
    }

    await transaction.commit();

    return {
      success: true,
      requestId: request.request_id,
      stockMovements: stockMovements.map(m => ({
        movement_id: m.movement_id,
        reference_no: m.reference_no,
        qty: m.qty,
      }))
    };
  } catch (error) {
    await transaction.rollback();
    console.error('Error approving technician request:', error);
    throw error;
  }
}

/**
 * Reject technician spare request
 */
export async function rejectTechnicianRequest(
  requestId,
  serviceCenterId,
  approverId,
  rejectionData
) {
  const transaction = await sequelize.transaction();
  try {
    const request = await SpareRequest.findByPk(requestId, {
      include: [
        {
          model: SpareRequestItem,
          as: 'SpareRequestItems',
        }
      ],
      transaction,
    });

    if (!request) throw new Error('Request not found');
    if (request.requested_to_id !== serviceCenterId) throw new Error('Not authorized');

    // Reject all items
    const itemIds = request.SpareRequestItems.map(i => i.id);

    for (const itemId of itemIds) {
      const item = request.SpareRequestItems.find(i => i.id === itemId);
      
      await item.update({
        approved_qty: 0,
        rejection_reason: rejectionData.reason || 'Requested by service center',
      }, { transaction });

      // Create rejection approval record
      await Approvals.create({
        entity_type: 'spare_request_item',
        entity_id: itemId,
        approval_level: 1,
        approver_user_id: approverId,
        approval_status: 'rejected',
        approval_remarks: rejectionData.remarks || null,
        approved_at: new Date(),
      }, { transaction });
    }

    // Update request status to rejected
    const rejectedStatus = await Status.findOne({
      where: { status_name: 'rejected' },
      transaction,
    });

    if (rejectedStatus) {
      await request.update({
        status_id: rejectedStatus.status_id,
        updated_at: new Date(),
      }, { transaction });
    }

    await transaction.commit();

    return {
      success: true,
      requestId: request.request_id,
      message: 'Request rejected successfully'
    };
  } catch (error) {
    await transaction.rollback();
    console.error('Error rejecting technician request:', error);
    throw error;
  }
}

/**
 * Get stock movements for technician requests
 * Shows the delivery status of parts to technician
 */
export async function getTechnicianStockMovements(serviceCenterId, filters = {}) {
  try {
    const where = {
      reference_type: 'spare_request',
      destination_location_type: 'technician',
    };

    if (filters.technician_id) {
      where.destination_location_id = filters.technician_id;
    }

    const movements = await StockMovement.findAll({
      where,
      include: [
        {
          model: SparePart,
          as: 'SparePart',
          attributes: ['Id', 'Spare_Code', 'Spare_Desc']
        }
      ],
      order: [['created_at', 'DESC']],
      raw: false,
    });

    return movements.map(m => ({
      movement_id: m.movement_id,
      reference_no: m.reference_no,
      spare_code: m.SparePart?.Spare_Code,
      spare_desc: m.SparePart?.Spare_Desc,
      qty: m.qty,
      status: m.status,
      movement_date: m.movement_date,
      created_at: m.created_at,
    }));
  } catch (error) {
    console.error('Error fetching stock movements:', error);
    throw error;
  }
}

export default {
  getTechnicianRequestsForServiceCenter,
  getTechnicianRequestDetails,
  approveTechnicianRequest,
  rejectTechnicianRequest,
  getTechnicianStockMovements,
};
