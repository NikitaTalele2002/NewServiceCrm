import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { sequelize } from '../db.js';
import * as spareReturnService from '../services/spareReturnRequestService.js';

const router = express.Router();

/**
 * Check if return request is in a READ-ONLY status
 * Reopened and verified requests should not be modified
 */
async function checkReadOnlyStatus(returnRequestId, transaction) {
  try {
    const returnRequest = await sequelize.models.SpareRequest.findOne({
      where: { request_id: returnRequestId },
      include: [
        {
          association: 'status',
          model: sequelize.models.Status,
          attributes: ['status_id', 'status_name']
        }
      ],
      transaction
    });

    if (!returnRequest) {
      throw new Error(`Return request ${returnRequestId} not found`);
    }

    // These statuses should be read-only
    const readOnlyStatuses = ['reopened'];
    
    if (readOnlyStatuses.includes(returnRequest.status?.status_name)) {
      return {
        isReadOnly: true,
        status: returnRequest.status.status_name,
        message: `Cannot modify ${returnRequest.status.status_name} request. This request is in READ-ONLY mode.`
      };
    }

    return {
      isReadOnly: false,
      status: returnRequest.status?.status_name,
      returnRequest
    };
  } catch (error) {
    throw error;
  }
}

/**
 * POST /api/spare-return-requests
 * Create a new spare return request
 * 
 * Request body:
 * {
 *   technician_id: number,
 *   call_id: number (optional),
 *   request_reason: 'defective_collected' | 'remaining_goods' | 'excess_allocation',
 *   items: [
 *     {
 *       spare_id: number,
 *       spare_part_code: string,
 *       spare_part_name: string,
 *       good_qty: number (remaining good spares),
 *       defective_qty: number (defective spares collected),
 *       remarks: string (optional)
 *     }
 *   ],
 *   remarks: string (optional, general remarks for the return)
 * }
 */
router.post('/', authenticateToken, async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { technician_id, call_id, request_reason, items, remarks } = req.body;

    // Validate required fields
    if (!technician_id || !items || items.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ 
        error: 'Missing required fields: technician_id and items[] are mandatory' 
      });
    }

    // Create the return request
    const returnRequest = await spareReturnService.createReturnRequest(
      {
        technician_id,
        call_id,
        request_reason: request_reason || 'defective_collected',
        items,
        remarks,
        created_by: req.user.id
      },
      transaction
    );

    await transaction.commit();
    
    res.status(201).json({
      success: true,
      message: 'Spare return request created successfully',
      returnRequestId: returnRequest.return_request_id,
      requestNumber: returnRequest.request_number,
      status: returnRequest.status
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error creating spare return request:', error);
    res.status(500).json({ 
      error: 'Failed to create spare return request',
      details: error.message 
    });
  }
});

/**
 * GET /api/spare-return-requests
 * List return requests for the user's service center
 * 
 * Query params:
 * - technician_id: filter by technician
 * - status: filter by status (pending, received, verified, rejected)
 * - from_date: filter by creation date (ISO format)
 * - to_date: filter by creation date (ISO format)
 * - include_items: true/false (include items in response)
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const serviceCenterId = req.user.centerId || req.user.service_center_id;
    const { technician_id, status, from_date, to_date, include_items = 'true' } = req.query;

    console.log('🔍 Fetching return requests for SC:', serviceCenterId);

    if (!serviceCenterId) {
      return res.status(400).json({ error: 'Service center ID not found' });
    }

    const requests = await spareReturnService.getReturnRequestsForServiceCenter(
      serviceCenterId,
      {
        technician_id: technician_id ? parseInt(technician_id) : null,
        status,
        from_date: from_date ? new Date(from_date) : null,
        to_date: to_date ? new Date(to_date) : null,
        include_items: include_items === 'true'
      }
    );

    console.log('✅ Found:', requests.length, 'return requests');

    res.json({
      success: true,
      data: requests,
      count: requests.length
    });
  } catch (error) {
    console.error('Error fetching return requests:', error);
    res.status(500).json({ 
      error: 'Failed to fetch return requests',
      details: error.message 
    });
  }
});

/**
 * GET /api/spare-return-requests/:returnRequestId
 * Get return request details
 */
router.get('/:returnRequestId', authenticateToken, async (req, res) => {
  try {
    const { returnRequestId } = req.params;
    const serviceCenterId = req.user.centerId || req.user.service_center_id;

    const request = await spareReturnService.getReturnRequestDetails(
      returnRequestId,
      serviceCenterId
    );

    if (!request) {
      return res.status(404).json({ error: 'Return request not found' });
    }

    res.json({
      success: true,
      data: request
    });
  } catch (error) {
    console.error('Error fetching return request details:', error);
    res.status(500).json({ 
      error: 'Failed to fetch return request details',
      details: error.message 
    });
  }
});

/**
 * POST /api/spare-return-requests/:returnRequestId/receive
 * Receive (accept) the return at ASC
 * This creates a stock movement from technician to service center
 * 
 * Request body:
 * {
 *   received_items: [
 *     {
 *       return_item_id: number,
 *       received_good_qty: number,
 *       received_defective_qty: number,
 *       condition: string (optional - good, defective, damaged, partially_damaged),
 *       remarks: string (optional)
 *     }
 *   ],
 *   received_by: string (optional - name of person receiving),
 *   received_remarks: string (optional)
 * }
 */
router.post('/:returnRequestId/receive', authenticateToken, async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { returnRequestId } = req.params;
    const { received_items, received_by, received_remarks } = req.body;
    const serviceCenterId = req.user.centerId || req.user.service_center_id;

    // Check if request is in read-only status
    const statusCheck = await checkReadOnlyStatus(returnRequestId, transaction);
    if (statusCheck.isReadOnly) {
      await transaction.rollback();
      return res.status(403).json({ 
        error: statusCheck.message,
        status: statusCheck.status
      });
    }

    if (!received_items || received_items.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ 
        error: 'Missing received_items array' 
      });
    }

    const result = await spareReturnService.receiveReturnRequest(
      returnRequestId,
      serviceCenterId,
      {
        received_items,
        received_by: received_by || req.user.name || 'System',
        received_remarks,
        received_by_user_id: req.user.id
      },
      transaction
    );

    await transaction.commit();

    res.json({
      success: true,
      message: 'Return request received and processed',
      returnRequestId: result.return_request_id,
      stockMovementId: result.stock_movement_id,
      status: result.status
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error receiving return request:', error);
    res.status(500).json({ 
      error: 'Failed to receive return request',
      details: error.message 
    });
  }
});

/**
 * POST /api/spare-return-requests/:returnRequestId/verify
 * Verify the return at ASC (after visual inspection)
 * Sets final condition and quantity verification
 * 
 * Request body:
 * {
 *   verified_items: [
 *     {
 *       return_item_id: number,
 *       verified_good_qty: number,
 *       verified_defective_qty: number,
 *       condition_notes: string (optional)
 *     }
 *   ],
 *   verified_remarks: string (optional)
 * }
 */
router.post('/:returnRequestId/verify', authenticateToken, async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { returnRequestId } = req.params;
    const { verified_items, verified_remarks } = req.body;
    const serviceCenterId = req.user.centerId || req.user.service_center_id;

    // Check if request is in read-only status
    const statusCheck = await checkReadOnlyStatus(returnRequestId, transaction);
    if (statusCheck.isReadOnly) {
      await transaction.rollback();
      return res.status(403).json({ 
        error: statusCheck.message,
        status: statusCheck.status
      });
    }

    if (!verified_items || verified_items.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ 
        error: 'Missing verified_items array' 
      });
    }

    const result = await spareReturnService.verifyReturnRequest(
      returnRequestId,
      serviceCenterId,
      {
        verified_items,
        verified_remarks,
        verified_by_user_id: req.user.id
      },
      transaction
    );

    await transaction.commit();

    res.json({
      success: true,
      message: 'Return request verified',
      returnRequestId: result.return_request_id,
      status: result.status
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error verifying return request:', error);
    res.status(500).json({ 
      error: 'Failed to verify return request',
      details: error.message 
    });
  }
});

/**
 * POST /api/spare-return-requests/:returnRequestId/reject
 * Reject a return request
 * 
 * Request body:
 * {
 *   reason: string (required - reason for rejection),
 *   remarks: string (optional)
 * }
 */
router.post('/:returnRequestId/reject', authenticateToken, async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { returnRequestId } = req.params;
    const { reason, remarks } = req.body;

    // Check if request is in read-only status
    const statusCheck = await checkReadOnlyStatus(returnRequestId, transaction);
    if (statusCheck.isReadOnly) {
      await transaction.rollback();
      return res.status(403).json({ 
        error: statusCheck.message,
        status: statusCheck.status
      });
    }

    if (!reason) {
      await transaction.rollback();
      return res.status(400).json({ 
        error: 'Rejection reason is required' 
      });
    }

    const result = await spareReturnService.rejectReturnRequest(
      returnRequestId,
      {
        reason,
        remarks,
        rejected_by_user_id: req.user.id
      },
      transaction
    );

    await transaction.commit();

    res.json({
      success: true,
      message: 'Return request rejected',
      returnRequestId: result.return_request_id,
      status: result.status
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error rejecting return request:', error);
    res.status(500).json({ 
      error: 'Failed to reject return request',
      details: error.message 
    });
  }
});

/**
 * GET /api/spare-return-requests/summary/technician/:technicianId
 * Get return request summary for a technician
 * Useful for dashboard showing what needs to be returned
 */
router.get('/summary/technician/:technicianId', authenticateToken, async (req, res) => {
  try {
    const { technicianId } = req.params;

    const summary = await spareReturnService.getTechnicianReturnSummary(
      parseInt(technicianId)
    );

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error fetching technician return summary:', error);
    res.status(500).json({ 
      error: 'Failed to fetch return summary',
      details: error.message 
    });
  }
});

/**
 * GET /api/spare-return-requests/technician-inventory/:technicianId
 * Get current technician inventory that can be returned
 */
router.get('/technician-inventory/:technicianId', authenticateToken, async (req, res) => {
  try {
    const { technicianId } = req.params;

    const inventory = await spareReturnService.getTechnicianInventoryForReturn(
      parseInt(technicianId)
    );

    res.json({
      success: true,
      data: inventory,
      count: inventory.length
    });
  } catch (error) {
    console.error('Error fetching technician inventory:', error);
    res.status(500).json({ 
      error: 'Failed to fetch technician inventory',
      details: error.message 
    });
  }
});

/**
 * POST /api/spare-return-requests/:returnRequestId/approve
 * Approve a return request (ASC Approval)
 * This creates stock_movement and updates inventory
 * 
 * Request body:
 * {
 *   approved_items: [
 *     {
 *       return_item_id: number,
 *       approved_good_qty: number,
 *       approved_defective_qty: number,
 *       condition_notes: string (optional)
 *     }
 *   ],
 *   approved_remarks: string (optional)
 * }
 */
router.post('/:returnRequestId/approve', authenticateToken, async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { returnRequestId } = req.params;
    const { approved_items, approved_remarks } = req.body;
    const serviceCenterId = req.user.centerId || req.user.service_center_id;

    if (!approved_items || approved_items.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ 
        error: 'Missing approved_items array' 
      });
    }

    // Use the verify function with renamed parameters for approval
    const result = await spareReturnService.verifyReturnRequest(
      returnRequestId,
      serviceCenterId,
      {
        verified_items: approved_items.map(item => ({
          return_item_id: item.return_item_id,
          verified_good_qty: item.approved_good_qty,
          verified_defective_qty: item.approved_defective_qty,
          condition_notes: item.condition_notes
        })),
        verified_remarks: `Approved by: ${req.user.name || 'User'}\n${approved_remarks || ''}`,
        verified_by_user_id: req.user.id
      },
      transaction
    );

    await transaction.commit();

    res.json({
      success: true,
      message: 'Return request approved and stock movement created',
      returnRequestId: result.return_request_id,
      stockMovementId: result.stock_movement_id,
      totalQtyReturned: result.total_qty_returned,
      goodsMovementItemsCount: result.goods_movement_items_count,
      status: 'verified'
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error approving return request:', error);
    res.status(500).json({ 
      error: 'Failed to approve return request',
      details: error.message 
    });
  }
});

/**
 * POST /api/spare-return-requests/:returnRequestId/reopen
 * Reopen an approved return request (ASC can reopen if needed)
 * Once reopened, the request becomes read-only and cannot be modified
 * 
 * Request body:
 * {
 *   reopen_reason: string (reason for reopening)
 * }
 */
router.post('/:returnRequestId/reopen', authenticateToken, async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { returnRequestId } = req.params;
    const { reopen_reason } = req.body;
    const serviceCenterId = req.user.centerId || req.user.service_center_id;

    console.log(`🔄 Reopening return request ${returnRequestId}`);

    // Get the return request
    const returnRequest = await sequelize.models.SpareRequest.findOne({
      where: { request_id: returnRequestId },
      transaction
    });

    if (!returnRequest) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Return request not found' });
    }

    // Check if request is in a reopenable state
    const reopenableStatuses = ['verified', 'received', 'pending'];
    const currentStatus = await sequelize.models.Status.findOne({
      where: { status_id: returnRequest.status_id },
      transaction
    });

    if (!reopenableStatuses.includes(currentStatus?.status_name)) {
      await transaction.rollback();
      return res.status(400).json({ 
        error: `Cannot reopen request with status: ${currentStatus?.status_name || 'unknown'}`,
        currentStatus: currentStatus?.status_name 
      });
    }

    // Get or create 'reopened' status
    let reopenedStatus = await sequelize.models.Status.findOne({
      where: { status_name: 'reopened' },
      transaction
    });

    if (!reopenedStatus) {
      // Create the reopened status if it doesn't exist
      reopenedStatus = await sequelize.models.Status.create({
        status_name: 'reopened',
        description: 'Request has been reopened - read-only access only',
        status_category: 'return_request'
      }, { transaction });
    }

    // Update return request status to reopened
    const updatedNotes = (returnRequest.notes || '') + 
      `\n\nReopened at ${new Date().toISOString()} by ${req.user.name || 'User'}` + 
      (reopen_reason ? `\nReason: ${reopen_reason}` : '') +
      `\n⚠️ This request is now in READ-ONLY mode. The originally approved stock movement and inventory updates remain in effect.`;

    await returnRequest.update({
      status_id: reopenedStatus.status_id,
      updated_at: new Date(),
      notes: updatedNotes
    }, { transaction });

    await transaction.commit();

    console.log(`✅ Return request ${returnRequestId} reopened successfully`);

    res.json({
      success: true,
      message: 'Return request reopened successfully. This request is now in READ-ONLY mode.',
      returnRequestId: returnRequestId,
      status: 'reopened',
      note: 'Originally approved stock movement and inventory updates remain in effect'
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error reopening return request:', error);
    res.status(500).json({ 
      error: 'Failed to reopen return request',
      details: error.message 
    });
  }
});

/**
 * PUT /api/spare-return-requests/:returnRequestId
 * Update return request (with status check to prevent editing reopened requests)
 */
router.put('/:returnRequestId', authenticateToken, async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { returnRequestId } = req.params;
    const { ...updateData } = req.body;

    // Get the return request with its status
    const returnRequest = await sequelize.models.SpareRequest.findOne({
      where: { request_id: returnRequestId },
      include: [
        {
          association: 'status',
          model: sequelize.models.Status,
          attributes: ['status_id', 'status_name']
        }
      ],
      transaction
    });

    if (!returnRequest) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Return request not found' });
    }

    // Check if request is reopened or verified (read-only statuses)
    const readOnlyStatuses = ['reopened', 'verified'];
    if (readOnlyStatuses.includes(returnRequest.status?.status_name)) {
      await transaction.rollback();
      return res.status(403).json({ 
        error: `Cannot modify ${returnRequest.status.status_name} request. This request is in READ-ONLY mode.`,
        status: returnRequest.status.status_name
      });
    }

    // Allowed modifications for pending/received requests
    const allowedFields = ['remarks', 'notes'];
    const cleanUpdateData = {};
    
    for (const key of allowedFields) {
      if (key in updateData) {
        cleanUpdateData[key] = updateData[key];
      }
    }

    if (Object.keys(cleanUpdateData).length === 0) {
      await transaction.rollback();
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    await returnRequest.update(cleanUpdateData, { transaction });
    await transaction.commit();

    res.json({
      success: true,
      message: 'Return request updated successfully',
      returnRequestId: returnRequestId
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error updating return request:', error);
    res.status(500).json({ 
      error: 'Failed to update return request',
      details: error.message 
    });
  }
});

export default router;
