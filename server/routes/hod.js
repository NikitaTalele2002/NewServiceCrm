import { SpareRequest, SpareRequestItem, Status, Approvals, Plant, Users } from '../models/index.js';
import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { sequelize } from '../db.js';

const router = express.Router();

/**
 * POST /api/hod/spare-requests/:requestId/approve
 * HOD approves a spare request with optional remarks
 */
router.post('/spare-requests/:requestId/approve', authenticateToken, requireRole('hod'), async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { requestId } = req.params;
    const { remarks } = req.body;
    const hodUserId = req.user.id;

    // Fetch the request
    const request = await SpareRequest.findByPk(requestId, { 
      transaction 
    });
    
    if (!request) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Request not found' });
    }

    // Check if RSM has already approved this request
    const rsmApproval = await Approvals.findOne({
      where: {
        entity_type: 'spare_request',
        entity_id: requestId,
        approval_level: 1,
        approval_status: 'approved'
      },
      transaction
    });

    if (!rsmApproval) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Request must be approved by RSM first before HOD approval' });
    }

    // Update request status to approved (final approval)
    let finalApprovedStatus = await Status.findOne({ where: { status_name: 'approved' }, transaction });
    if (!finalApprovedStatus) {
      finalApprovedStatus = await Status.create({ status_name: 'approved' }, { transaction });
    }
    
    await request.update({
      status_id: finalApprovedStatus.status_id,
      updated_at: new Date()
    }, { transaction });

    // Create an approval record in the Approvals table for HOD (level 2)
    await Approvals.create({
      entity_type: 'spare_request',
      entity_id: requestId,
      approval_level: 2, // HOD approval is level 2
      approver_user_id: hodUserId,
      approval_status: 'approved',
      approval_remarks: remarks || 'Approved by HOD',
      approved_at: new Date()
    }, { transaction });

    await transaction.commit();
    
    res.json({ 
      ok: true, 
      message: 'Request approved by HOD successfully',
      requestId: request.request_id
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error approving request by HOD:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/hod/spare-requests/:requestId/reject
 * HOD rejects a spare request
 */
router.post('/spare-requests/:requestId/reject', authenticateToken, requireRole('hod'), async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { requestId } = req.params;
    const { reason } = req.body;
    const hodUserId = req.user.id;

    // Fetch the request
    const request = await SpareRequest.findByPk(requestId, { 
      transaction 
    });
    
    if (!request) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Request not found' });
    }

    // Update request status to rejected
    let rejectedStatus = await Status.findOne({ where: { status_name: 'rejected' }, transaction });
    if (!rejectedStatus) {
      rejectedStatus = await Status.create({ status_name: 'rejected' }, { transaction });
    }
    
    await request.update({
      status_id: rejectedStatus.status_id,
      updated_at: new Date()
    }, { transaction });

    // Create an approval record in the Approvals table for HOD rejection (level 2)
    await Approvals.create({
      entity_type: 'spare_request',
      entity_id: requestId,
      approval_level: 2, // HOD rejection is level 2
      approver_user_id: hodUserId,
      approval_status: 'rejected',
      approval_remarks: reason || 'Rejected by HOD',
      approved_at: new Date()
    }, { transaction });

    await transaction.commit();
    
    res.json({ 
      ok: true, 
      message: 'Request rejected by HOD',
      requestId: request.request_id
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error rejecting request by HOD:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/hod/spare-requests
 * Get spare requests pending HOD approval (approved by RSM but not by HOD)
 */
router.get('/spare-requests', authenticateToken, requireRole('hod'), async (req, res) => {
  try {
    const hodUserId = req.user.id;

    // Find all requests that have RSM approval but not HOD approval
    // Get all request IDs that have level 1 approved status
    const rsmApprovedRequests = await Approvals.findAll({
      where: {
        entity_type: 'spare_request',
        approval_level: 1,
        approval_status: 'approved'
      },
      attributes: ['entity_id'],
      raw: true,
      transaction: undefined
    });

    const requestIds = rsmApprovedRequests.map(a => a.entity_id);

    if (requestIds.length === 0) {
      return res.json({ ok: true, requests: [] });
    }

    // Exclude requests that already have HOD approval (level 2)
    const hodApprovedRequests = await Approvals.findAll({
      where: {
        entity_type: 'spare_request',
        approval_level: 2
      },
      attributes: ['entity_id'],
      raw: true
    });

    const hodApprovedIds = hodApprovedRequests.map(a => a.entity_id);
    const pendingHodApprovalIds = requestIds.filter(id => !hodApprovedIds.includes(id));

    if (pendingHodApprovalIds.length === 0) {
      return res.json({ ok: true, requests: [] });
    }

    // Get the actual request details
    const requests = await SpareRequest.findAll({
      where: {
        request_id: pendingHodApprovalIds
      },
      include: [
        {
          model: SpareRequestItem,
          as: 'SpareRequestItems',
          required: false
        }
      ],
      order: [['created_at', 'DESC']],
      limit: 500
    });

    // Fetch approver details for each request
    const requestsWithApprovals = await Promise.all(
      requests.map(async (request) => {
        const approvals = await Approvals.findAll({
          where: {
            entity_type: 'spare_request',
            entity_id: request.request_id
          },
          order: [['approval_level', 'ASC']],
          include: []
        });

        const approvalsWithUserDetails = await Promise.all(
          approvals.map(async (approval) => {
            let approverName = 'Unknown';
            if (approval.approver_user_id) {
              try {
                const { Users } = await import('../models/index.js');
                const user = await Users.findByPk(approval.approver_user_id);
                if (user) approverName = user.username;
              } catch (e) {
                console.warn('Could not fetch user details:', e.message);
              }
            }
            return {
              approval_id: approval.approval_id,
              approval_level: approval.approval_level,
              approver_user_id: approval.approver_user_id,
              approver_name: approverName,
              approval_status: approval.approval_status,
              approval_remarks: approval.approval_remarks,
              approved_at: approval.approved_at
            };
          })
        );

        return {
          request_id: request.request_id,
          request_type: request.request_type,
          request_reason: request.request_reason,
          requested_source_type: request.requested_source_type,
          requested_source_id: request.requested_source_id,
          requested_to_type: request.requested_to_type,
          requested_to_id: request.requested_to_id,
          created_at: request.created_at,
          items: request.SpareRequestItems || [],
          approvals: approvalsWithUserDetails
        };
      })
    );

    res.json({ ok: true, requests: requestsWithApprovals });
  } catch (err) {
    console.error('Error in getHodSpareRequests:', err && err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
