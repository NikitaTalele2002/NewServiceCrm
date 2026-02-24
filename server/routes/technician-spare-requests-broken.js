import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { sequelize } from '../db.js';

const router = express.Router();

/**
 * GET /api/technician-spare-requests
 * Get all technician spare requests for the service center
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const serviceCenterId = req.user.centerId || req.user.service_center_id;
    
    console.log('🔍 User:', req.user);
    console.log('📍 Service Center ID:', serviceCenterId);

    if (!serviceCenterId) {
      return res.status(400).json({ 
        error: 'Service center ID not found in user profile',
        userObject: req.user
      });
    }

    // Direct SQL query to fetch spare requests
    const query = `
      SELECT 
        sr.request_id as id,
        sr.request_id,
        CONCAT('REQ-', sr.request_id) as requestId,
        sr.request_type,
        sr.request_reason,
        sr.requested_source_id as technician_id,
        t.name as technicianName,
        sr.call_id,
        sr.status_id as status,
        sr.created_at as createdAt,
        sr.updated_at as updatedAt
      FROM spare_requests sr
      LEFT JOIN technicians t ON sr.requested_source_id = t.technician_id
      WHERE sr.requested_to_id = ?
      AND sr.requested_source_type = 'technician'
      AND sr.requested_to_type = 'service_center'
      ORDER BY sr.created_at DESC
    `;

    console.log('📊 Executing query for service center:', serviceCenterId);

    const requestsResult = await sequelize.query(query, {
      replacements: [serviceCenterId],
      type: sequelize.QueryTypes.SELECT
    });

    // Handle both array and object results from Sequelize
    const requests = Array.isArray(requestsResult) ? requestsResult : (requestsResult[0] || []);

    console.log('✅ Query result type:', Array.isArray(requestsResult) ? 'array' : 'object');
    console.log('✅ Found requests:', requests.length);

    // Fetch items for each request - SIMPLIFIED FOR NOW
    const requestsWithItems = requests.map(request => ({
      ...request,
      items: []  // TODO: Fetch items
    }));

    console.log('✅ Response ready:', requestsWithItems.length, 'requests');

    res.json({
      success: true,
      data: requestsWithItems,
      count: requestsWithItems.length
    });
  } catch (error) {
    console.error('❌ Error fetching technician spare requests:', error);
    console.error('ERROR STACK:', error.stack);
    res.status(500).json({ 
      error: 'Failed to fetch technician spare requests',
      details: error.message,
      stack: error.stack
    });
  }
});

/**
 * GET /api/technician-spare-requests/:requestId
 * Get details of a specific technician spare request
 */
router.get('/:requestId', authenticateToken, async (req, res) => {
  try {
    const serviceCenterId = req.user.centerId || req.user.service_center_id;
    const { requestId } = req.params;

    console.log('🔍 Fetching request:', requestId, 'for service center:', serviceCenterId);

    if (!serviceCenterId) {
      return res.status(400).json({ 
        error: 'Service center ID not found' 
      });
    }

    const query = `
      SELECT 
        sr.request_id as id,
        sr.request_id,
        CONCAT('REQ-', sr.request_id) as requestId,
        sr.request_type,
        sr.request_reason,
        sr.requested_source_id as technician_id,
        t.name as technicianName,
        sr.call_id,
        sr.status_id as status,
        sr.created_at as createdAt,
        sr.updated_at as updatedAt
      FROM spare_requests sr
      LEFT JOIN technicians t ON sr.requested_source_id = t.technician_id
      WHERE sr.request_id = ?
      AND sr.requested_to_id = ?
    `;

    const [requestData] = await sequelize.query(query, {
      replacements: [requestId, serviceCenterId],
      type: sequelize.QueryTypes.SELECT
    });

    if (!requestData || requestData.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const request = Array.isArray(requestData) ? requestData[0] : requestData;

    // Fetch items
    const itemsQuery = `
      SELECT 
        sri.id,
        sri.spare_id,
        sp.Spare_Code as spare_code,
        sp.Spare_Desc as spare_desc,
        sri.requested_qty as requestedQty,
        sri.approved_qty as approvedQty,
        sri.rejection_reason as rejectionReason
      FROM spare_request_items sri
      LEFT JOIN spare_parts sp ON sri.spare_id = sp.Id
      WHERE sri.request_id = ?
    `;

    const itemsResult = await sequelize.query(itemsQuery, {
      replacements: [requestId],
      type: sequelize.QueryTypes.SELECT
    });

    const items = Array.isArray(itemsResult) ? itemsResult : (itemsResult[0] || []);

    res.json({
      success: true,
      data: {
        ...request,
        items: items || []
      }
    });
  } catch (error) {
    console.error('Error fetching request details:', error);
    res.status(500).json({ 
      error: 'Failed to fetch request details',
      details: error.message 
    });
  }
});

/**
 * POST /api/technician-spare-requests/:requestId/approve
 * Approve a technician spare request
 */
router.post('/:requestId/approve', authenticateToken, async (req, res) => {
  try {
    const serviceCenterId = req.user.centerId || req.user.service_center_id;
    const approverId = req.user.userId || req.user.id;
    const { requestId } = req.params;
    const { approvedItems } = req.body;

    console.log('🔍 Approving request:', requestId);
    console.log('📦 Approved items:', approvedItems);

    if (!serviceCenterId) {
      return res.status(400).json({ 
        error: 'Service center ID not found' 
      });
    }

    if (!approvedItems || !Array.isArray(approvedItems)) {
      return res.status(400).json({ 
        error: 'approvedItems array is required' 
      });
    }

    // Verify request exists and belongs to service center
    const [request] = await sequelize.query(
      'SELECT request_id FROM spare_requests WHERE request_id = ? AND requested_to_id = ?',
      { replacements: [requestId, serviceCenterId], type: sequelize.QueryTypes.SELECT }
    );

    if (!request) {
      return res.status(404).json({ error: 'Request not found or not authorized' });
    }

    // For each approved item, create approval record
    for (const item of approvedItems) {
      console.log('✅ Approving item:', item);

      await sequelize.query(
        `INSERT INTO approvals (spare_request_item_id, approver_id, approval_status, remarks, approved_at)
         VALUES (?, ?, ?, ?, NOW())`,
        {
          replacements: [item.spare_request_item_id, approverId, 'approved', item.remarks || ''],
          type: sequelize.QueryTypes.INSERT
        }
      );

      // Update spare_request_item with approved qty
      await sequelize.query(
        `UPDATE spare_request_items SET approved_qty = ? WHERE id = ?`,
        { replacements: [item.quantity || 0, item.spare_request_item_id] }
      );
    }

    // Update request status to approved
    await sequelize.query(
      'UPDATE spare_requests SET status_id = (SELECT status_id FROM status WHERE status_name = "approved") WHERE request_id = ?',
      { replacements: [requestId] }
    );

    console.log('✅ Request approved successfully');

    res.json({
      success: true,
      message: 'Request approved successfully',
      data: { requestId: parseInt(requestId) }
    });

  } catch (error) {
    console.error('❌ Error approving request:', error);
    res.status(500).json({ 
      error: 'Failed to approve request',
      details: error.message 
    });
  }
});

/**
 * POST /api/technician-spare-requests/:requestId/reject
 * Reject a technician spare request
 */
router.post('/:requestId/reject', authenticateToken, async (req, res) => {
  try {
    const serviceCenterId = req.user.centerId || req.user.service_center_id;
    const approverId = req.user.userId || req.user.id;
    const { requestId } = req.params;
    const { reason } = req.body;

    console.log('🔍 Rejecting request:', requestId);

    if (!serviceCenterId) {
      return res.status(400).json({ 
        error: 'Service center ID not found' 
      });
    }

    if (!reason) {
      return res.status(400).json({ 
        error: 'Rejection reason is required' 
      });
    }

    // Verify request exists
    const [request] = await sequelize.query(
      'SELECT request_id FROM spare_requests WHERE request_id = ? AND requested_to_id = ?',
      { replacements: [requestId, serviceCenterId], type: sequelize.QueryTypes.SELECT }
    );

    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    // Get all items for this request
    const [items] = await sequelize.query(
      'SELECT id FROM spare_request_items WHERE request_id = ?',
      { replacements: [requestId], type: sequelize.QueryTypes.SELECT }
    );

    // Create rejection records for all items
    for (const item of items) {
      await sequelize.query(
        `INSERT INTO approvals (spare_request_item_id, approver_id, approval_status, remarks, approved_at)
         VALUES (?, ?, ?, ?, NOW())`,
        {
          replacements: [item.id, approverId, 'rejected', reason],
          type: sequelize.QueryTypes.INSERT
        }
      );
    }

    // Update request status to rejected
    await sequelize.query(
      'UPDATE spare_requests SET status_id = (SELECT status_id FROM status WHERE status_name = "rejected") WHERE request_id = ?',
      { replacements: [requestId] }
    );

    console.log('✅ Request rejected successfully');

    res.json({
      success: true,
      message: 'Request rejected successfully',
      data: { requestId: parseInt(requestId) }
    });

  } catch (error) {
    console.error('❌ Error rejecting request:', error);
    res.status(500).json({ 
      error: 'Failed to reject request',
      details: error.message 
    });
  }
});

/**
 * GET /api/technician-spare-requests/stock-movements/list
 * Get stock movements for technician spare requests
 */
router.get('/stock-movements/list', authenticateToken, async (req, res) => {
  try {
    const serviceCenterId = req.user.centerId || req.user.service_center_id;
    const { technician_id } = req.query;

    console.log('🔍 Fetching stock movements for service center:', serviceCenterId);

    if (!serviceCenterId) {
      return res.status(400).json({ 
        error: 'Service center ID not found' 
      });
    }

    let query = `
      SELECT 
        sm.movement_id,
        sm.spare_id,
        sp.Spare_Code,
        sp.Spare_Desc,
        sm.quantity,
        sm.movement_type,
        sm.source_type,
        sm.destination_type,
        sm.reference_type,
        sm.reference_no,
        sm.created_at
      FROM stock_movement sm
      LEFT JOIN spare_parts sp ON sm.spare_id = sp.Id
      WHERE sm.source_type = 'service_center' 
      AND sm.source_id = ?
      AND sm.reference_type = 'technician_request'
    `;

    const params = [serviceCenterId];

    if (technician_id) {
      query += ` AND sm.destination_id = ?`;
      params.push(technician_id);
    }

    query += ` ORDER BY sm.created_at DESC`;

    const movementsResult = await sequelize.query(query, {
      replacements: params,
      type: sequelize.QueryTypes.SELECT
    });

    const movements = Array.isArray(movementsResult) ? movementsResult : (movementsResult[0] || []);

    res.json({
      success: true,
      data: movements || [],
      count: (movements || []).length
    });
  } catch (error) {
    console.error('Error fetching stock movements:', error);
    res.status(500).json({ 
      error: 'Failed to fetch stock movements',
      details: error.message 
    });
  }
});

export default router;
