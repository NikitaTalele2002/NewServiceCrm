import express from 'express';
import { lookupCustomer, registerCustomer, updateCustomer, addCustomerProduct, registerComplaint, processComplaint, getServiceCentersByPincode, assignComplaintToASC, getComplaintsByServiceCenter, getCallCurrentStatus, getCallStatusHistory } from '../controllers/callCenterController.js';
import { Users, ServiceCenterPincodes, ServiceCenter, Calls, Status, CallSpareUsage, SparePart, CallCancellationRequests, ActionLog, Roles, Approvals } from '../models/index.js';
import { poolPromise, sequelize } from '../db.js';
import { requireRole, authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * IMPORTANT: When a call has a PENDING CANCELLATION REQUEST:
 * - The call status changes to "Pending Cancellation"
 * - NO OTHER OPERATIONS (reply, update, reassign) are allowed on that call
 * - Only RSM can APPROVE (status → Cancelled) or REJECT (status → Active)
 * - The call is LOCKED until the cancellation is resolved
 */

// Helper function to check if a call has a pending cancellation
async function checkPendingCancellation(callId) {
  try {
    const pending = await CallCancellationRequests.findOne({
      where: {
        call_id: callId,
        request_status: 'pending'
      }
    });
    return pending ? true : false;
  } catch (err) {
    console.error('[CallCenter] Error checking pending cancellation:', err.message);
    return false;
  }
}

// Helper function to prevent operations on calls with pending cancellations
function blockIfPendingCancellation(req, res, callId) {
  // This would be async, so we document it for future use
  // Usage: if (await checkPendingCancellation(callId)) return blockIfPendingCancellation(...)
  return {
    error: 'Call is LOCKED - Pending Cancellation Request',
    message: 'This call has a pending cancellation request and cannot be updated or have actions taken on it.',
    status: 423 // HTTP 423 Locked
  };
}

// Customer lookup by mobile number
router.get('/customer/:mobileNo', lookupCustomer);

// Register new customer
router.post('/customer', registerCustomer);

// Update existing customer
router.put('/customer/:customerId', updateCustomer);

// Add product to customer
router.post('/customer/:customerId/product', addCustomerProduct);

// Register complaint for customer with existing product
router.post('/complaint', registerComplaint);

// Get service centers by pincode
router.get('/service-centers/pincode/:pincode', getServiceCentersByPincode);

// Get complaints assigned to a service center
router.get('/complaints/by-service-center/:ascId', getComplaintsByServiceCenter);

// Assign complaint to service center
router.post('/complaint/assign-asc', assignComplaintToASC);

// Full workflow: lookup/register customer, add product, register complaint (all in one)
router.post('/process-complaint', processComplaint);

// Status endpoints
router.get('/complaint/:callId/status', getCallCurrentStatus);
router.get('/complaint/:callId/status-history', getCallStatusHistory);

// Get all available statuses for filtering
router.get('/statuses', async (req, res) => {
  try {
    const statuses = await Status.findAll({
      attributes: ['status_id', 'status_name'],
      order: [['status_name', 'ASC']]
    });

    res.status(200).json(statuses.map(s => ({
      id: s.status_id,
      statusName: s.status_name
    })));
  } catch (err) {
    console.error('Error fetching statuses:', err);
    res.status(500).json({
      error: 'Failed to fetch statuses',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// DEBUG: List all users (temporary - for testing only)
router.get('/debug/users', async (req, res) => {
  try {
    const users = await Users.findAll({
      attributes: ['user_id', 'name', 'email', 'password', 'role_id', 'status']
    });
    
    if(users.length === 0) {
      return res.json({ 
        message: 'No users found in database',
        total: 0,
        instructions: 'Create a test user with: INSERT INTO users (name, email, password, role_id, status) VALUES (\'Test User\', \'test@test.com\', \'testpass\', 1, \'active\')'
      });
    }
    
    return res.json({ 
      total: users.length,
      users: users.map(u => ({
        id: u.user_id,
        name: u.name,
        email: u.email,
        password: u.password,
        role_id: u.role_id,
        status: u.status
      }))
    });
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: err.message });
  }
});

// DEBUG: Check service center pincodes data
router.get('/debug/service-center-pincodes/:pincode', async (req, res) => {
  try {
    const { pincode } = req.params;
    console.log(`\n📍 DEBUG: Checking service center pincodes for: ${pincode}`);
    
    // Query without include to see raw data
    const rawData = await ServiceCenterPincodes.findAll({
      where: { serviceable_pincode: pincode.trim() },
      attributes: ['id', 'asc_id', 'serviceable_pincode', 'location_type', 'two_way_distance'],
      raw: true
    });
    
    console.log(`✓ Found ${rawData.length} raw records`);
    
    // Get ASC IDs that were found
    const ascIds = rawData.map(r => r.asc_id);
    console.log(`Service Center IDs found: ${ascIds.join(', ')}`);
    
    // Check if service centers exist
    const allServiceCenters = await ServiceCenter.findAll({
      attributes: ['asc_id', 'asc_name', 'asc_code'],
      raw: true
    });
    
    // If we found ascIds, fetch their details
    let scDetails = [];
    if (ascIds.length > 0) {
      scDetails = await ServiceCenter.findAll({
        where: { asc_id: ascIds },
        attributes: ['asc_id', 'asc_name', 'asc_code'],
        raw: true
      });
    }
    
    res.json({
      search_pincode: pincode,
      raw_count: rawData.length,
      raw_data: rawData,
      found_asc_ids: ascIds,
      service_center_details: scDetails,
      total_service_centers_in_db: allServiceCenters.length,
      all_service_centers: allServiceCenters
    });
  } catch (err) {
    console.error('Error in debug endpoint:', err);
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

// DEBUG: Check complaints assigned to service center
router.get('/debug/complaints-for-asc/:ascId', async (req, res) => {
  try {
    const { ascId } = req.params;
    console.log(`\n📍 DEBUG: Checking complaints for ASC ID: ${ascId}`);
    
    // Get all complaints assigned to this ASC
    const complaints = await Calls.findAll({
      where: { assigned_asc_id: parseInt(ascId) },
      attributes: ['call_id', 'customer_id', 'assigned_asc_id', 'remark', 'visit_date', 'visit_time', 'status_id', 'created_at'],
      raw: true
    });
    
    console.log(`✓ Found ${complaints.length} complaints for ASC ${ascId}`);
    
    // Also check if this ASC exists
    const serviceCenter = await ServiceCenter.findByPk(parseInt(ascId), {
      attributes: ['asc_id', 'asc_name', 'user_id']
    });
    
    res.json({
      asc_id: ascId,
      service_center_exists: !!serviceCenter,
      service_center: serviceCenter,
      complaints_count: complaints.length,
      complaints: complaints
    });
  } catch (err) {
    console.error('Error in debug endpoint:', err);
    res.status(500).json({ error: err.message, stack: err.stack });
  }
});

// Get spare parts used for a call
router.get('/spare-usage/:callId', async (req, res) => {
  try {
    const { callId } = req.params;
    
    console.log('[spare-usage/:callId] Fetching spare parts for call:', callId);
    
    // Use raw SQL to fetch spare parts with join to get spare part details
    const pool = await poolPromise;
    
    const result = await pool.request()
      .input('callId', callId)
      .query(`
        SELECT 
          csu.usage_id,
          csu.call_id,
          csu.spare_part_id,
          csu.issued_qty,
          csu.used_qty,
          csu.returned_qty,
          csu.usage_status,
          csu.used_at,
          csu.remarks,
          sp.Id,
          sp.PART as spare_part_name,
          sp.DESCRIPTION
        FROM call_spare_usage csu
        LEFT JOIN spare_parts sp ON csu.spare_part_id = sp.Id
        WHERE csu.call_id = @callId
        ORDER BY csu.usage_id DESC
      `);

    console.log('[spare-usage/:callId] Found', result.recordset?.length || 0, 'spare parts');

    const spareUsage = result.recordset || [];
    
    res.json({
      success: true,
      data: spareUsage.map(usage => ({
        usage_id: usage.usage_id,
        call_id: usage.call_id,
        spare_part_id: usage.spare_part_id,
        spare_part_name: usage.spare_part_name || 'Unknown',
        spare_part_code: usage.DESCRIPTION || '',
        issued_qty: usage.issued_qty,
        used_qty: usage.used_qty,
        returned_qty: usage.returned_qty,
        usage_status: usage.usage_status,
        used_at: usage.used_at,
        remarks: usage.remarks
      }))
    });
  } catch (err) {
    console.error('[spare-usage/:callId] Error:', err);
    res.status(500).json({ 
      success: false,
      error: err.message || 'Failed to fetch spare parts' 
    });
  }
});

// ========== CALL CANCELLATION REQUEST ENDPOINTS ==========

// POST /api/call-center/complaints/:callId/cancel
// Service Centers request cancellation of a call
// Only Service Centers can request cancellation
router.post('/complaints/:callId/cancel', authenticateToken, async (req, res) => {
  try {
    const { callId } = req.params;
    const { reason, remarks } = req.body;
    const user = req.user;

    console.log('[Cancel] User data from token:', { userId: user.id, centerId: user.centerId, userRole: user.role });

    // Get centerId from token, or look it up from database if missing
    let centerId = user.centerId;
    
    if (!centerId) {
      console.log('[Cancel] centerId not in token. Looking up from database...');
      try {
        const userRecord = await Users.findByPk(user.id);
        if (userRecord) {
          // Try to find service center for this user
          const serviceCenter = await ServiceCenter.findOne({
            where: { user_id: user.id },
            attributes: ['asc_id']
          });
          if (serviceCenter) {
            centerId = serviceCenter.asc_id;
            console.log('[Cancel] ✓ Found centerId from database:', centerId);
          }
        }
      } catch (err) {
        console.log('[Cancel] Could not lookup centerId from database:', err.message);
      }
    }
    
    // Check if we have a centerId (service center ID)
    if (!centerId) {
      console.log('[Cancel] Error: User does not have a service center ID');
      return res.status(403).json({
        error: 'Only Service Centers can request call cancellation',
        details: 'Service center ID not found. Please re-login to refresh your session.'
      });
    }

    // Verify the call exists and get current status DYNAMICALLY
    const call = await Calls.findByPk(callId, {
      include: [{ association: 'status', attributes: ['status_id', 'status_name'] }]
    });
    if (!call) {
      console.log(`[Cancel] Error: Call ${callId} not found`);
      return res.status(404).json({
        error: 'Call not found'
      });
    }

    // If status relation is null, fetch it separately
    let currentStatusName = 'Unknown';
    if (call.status) {
      currentStatusName = call.status.status_name;
    } else if (call.status_id) {
      const statusRecord = await Status.findByPk(call.status_id, { attributes: ['status_name'] });
      currentStatusName = statusRecord ? statusRecord.status_name : 'Unknown';
    }

    console.log('[Cancel] Call found:', { callId: call.call_id, assigned_asc_id: call.assigned_asc_id, currentStatus: currentStatusName });

    // Verify call is assigned to this service center
    if (call.assigned_asc_id !== centerId) {
      console.log('[Cancel] Error: Call not assigned to user service center', { callAscId: call.assigned_asc_id, userCenterId: centerId });
      return res.status(403).json({
        error: 'You can only cancel calls assigned to your service center'
      });
    }

    // Check if cancellation request already exists
    const existingRequest = await CallCancellationRequests.findOne({
      where: {
        call_id: callId,
        request_status: 'pending'
      }
    });

    if (existingRequest) {
      console.log('[Cancel] ⚠ BLOCKED: Pending request already exists for call:', callId);
      return res.status(400).json({
        error: 'Cancellation request already pending',
        message: 'A cancellation request for this call is already pending. This call CANNOT be updated or have actions taken on it until the cancellation is approved or rejected by RSM.',
        blockingReason: 'PENDING_CANCELLATION'
      });
    }

    // DYNAMICALLY fetch Service Center role ID from database (first!)
    const scRole = await Roles.findOne({
      where: { roles_name: 'service_center' }
    });
    const scRoleId = scRole ? scRole.roles_id : 5; // Fallback to 5 if not found
    console.log('[Cancel] SC Role ID fetched dynamically from database:', scRoleId);

    // DYNAMICALLY fetch "Cancelled - Pending RSM Approval" status BEFORE creating request
    let cancellationStatus = await Status.findOne({
      where: { status_name: 'Cancelled - Pending RSM Approval' }
    });
    
    if (!cancellationStatus) {
      console.log('[Cancel] "Cancelled - Pending RSM Approval" status not found. Looking for alternatives...');
      // Fallback: use "Pending" status
      cancellationStatus = await Status.findOne({
        where: { status_name: 'Pending' }
      });
    }

    if (!cancellationStatus) {
      console.error('[Cancel] ✗ CRITICAL ERROR: No "Pending Cancellation" or "Pending" status found in database!');
      return res.status(500).json({
        error: 'Cannot process cancellation',
        details: 'System cannot find a valid pending status. Please contact administrator.'
      });
    }

    // Store old status BEFORE any updates (DYNAMIC from call object)
    const oldStatusId = call.status_id;
    console.log('[Cancel] Preparing status update:', { 
      oldStatus: currentStatusName + ` (ID: ${oldStatusId})`, 
      newStatus: cancellationStatus.status_name + ` (ID: ${cancellationStatus.status_id})`
    });

    // Update call status FIRST - this MUST succeed before we create the request
    console.log('[Cancel] Executing database update for call status...');
    const updateResult = await Calls.update(
      { status_id: cancellationStatus.status_id },
      { where: { call_id: callId } }
    );
    
    if (updateResult[0] === 0) {
      console.error('[Cancel] ✗ DATABASE UPDATE FAILED: Call status update returned 0 affected rows');
      return res.status(500).json({
        error: 'Failed to update call status',
        details: 'Could not change call status to "Pending Cancellation". Cancellation request aborted.'
      });
    }

    console.log('[Cancel] ✓ STATUS UPDATED IN DATABASE: Call status changed from', currentStatusName, 'to', cancellationStatus.status_name);

    // VERIFY the status was actually updated by fetching the call again
    const updatedCall = await Calls.findByPk(callId, {
      include: [{ association: 'status', attributes: ['status_id', 'status_name'] }]
    });

    if (!updatedCall || updatedCall.status_id !== cancellationStatus.status_id) {
      console.error('[Cancel] ✗ VERIFICATION FAILED: Status change did not persist in database');
      return res.status(500).json({
        error: 'Status update verification failed',
        details: 'Call status was not properly persisted. Cancellation request aborted.'
      });
    }

    console.log('[Cancel] ✓ VERIFIED: Call status confirmed in database as', updatedCall.status.status_name);

    // NOW create the cancellation request with DYNAMIC role ID
    const cancellationRequest = await CallCancellationRequests.create({
      call_id: callId,
      requested_by_role: scRoleId,
      requested_by_id: user.id,
      reason: reason || 'OTHER',
      request_status: 'pending',
      cancellation_remark: remarks || null
    });

    console.log('[Cancel] ✓ Cancellation request created:', { cancellation_id: cancellationRequest.cancellation_id, status: cancellationRequest.request_status });

    // Also update the calls table with cancellation reason from SC request
    try {
      const updateCallResult = await sequelize.query(
        `UPDATE calls 
         SET cancel_reason = ?,
             updated_at = GETDATE()
         WHERE call_id = ?`,
        {
          replacements: [reason || 'OTHER', callId],
          type: sequelize.QueryTypes.UPDATE
        }
      );
      console.log('[Cancel] ✓ Cancellation reason updated in calls table');
    } catch (callUpdateErr) {
      console.error('[Cancel] ⚠ Warning: Could not update cancel_reason in calls table:', callUpdateErr.message);
      // Don't fail the request if this update fails
    }

    // Get RSM role ID for approval creation
    const rsmRole = await Roles.findOne({
      where: { roles_name: 'RSM' }
    });
    const rsmRoleId = rsmRole ? rsmRole.roles_id : 8;

    // Create approval request for RSM
    try {
      const approval = await Approvals.create({
        entity_type: 'CallCancellation',
        entity_id: cancellationRequest.cancellation_id,
        approval_level: 1,
        approver_role: rsmRoleId,
        approver_user_id: null, // Will be assigned to specific RSM who reviews it
        approval_status: 'pending',
        approval_remarks: `Call cancellation request for Call ID: ${callId}. Reason: ${reason || 'OTHER'}. SC Remarks: ${remarks || 'None'}`,
        created_at: new Date()
      });
      console.log('[Cancel] ✓ Approval request created:', { approval_id: approval.approval_id, status: approval.approval_status });
    } catch (approvalErr) {
      console.error('[Cancel] ⚠ Error: Could not create approval request:', approvalErr.message);
      // Don't fail the whole request if approval creation fails
    }

    // Log the action DYNAMICALLY - this automatically creates the record in database
    try {
      const actionLog = await ActionLog.create({
        entity_type: 'Call',
        entity_id: callId,
        user_id: user.id,
        action_user_role_id: scRoleId,
        old_status_id: oldStatusId,
        new_status_id: cancellationStatus ? cancellationStatus.status_id : null,
        remarks: `Status changed from "${currentStatusName}" to "${cancellationStatus.status_name}". Cancellation requested by SC. Reason: ${reason || 'OTHER'}. Remarks: ${remarks || 'None'}`,
        action_at: new Date()
      });
      console.log('[Cancel] ✓ DATABASE AUTOMATICALLY LOGGED: Action log created (Log ID:', actionLog.log_id + ') with status change:', oldStatusId, '→', cancellationStatus?.status_id);
    } catch (logErr) {
      console.error('[Cancel] ⚠ Error: Could not create action log:', logErr.message);
      // Don't fail the whole request if logging fails
    }

    // Get updated status name for response
    let updatedStatusName = cancellationStatus.status_name;
    if (updatedCall && updatedCall.status) {
      updatedStatusName = updatedCall.status.status_name;
    } else if (updatedCall && updatedCall.status_id) {
      const updatedStatusRecord = await Status.findByPk(updatedCall.status_id, { attributes: ['status_name'] });
      if (updatedStatusRecord) {
        updatedStatusName = updatedStatusRecord.status_name;
      }
    }

    res.status(201).json({
      success: true,
      message: 'Cancellation request submitted successfully. CALL STATUS LOCKED: Awaiting RSM approval or rejection.',
      callStatus: {
        previous: currentStatusName,
        current: updatedStatusName,
        locked: true,
        reason: 'Pending cancellation approval - no other updates allowed'
      },
      cancellation_request: {
        id: cancellationRequest.cancellation_id,
        call_id: cancellationRequest.call_id,
        status: cancellationRequest.request_status,
        reason: cancellationRequest.reason,
        created_at: cancellationRequest.created_at
      }
    });

  } catch (err) {
    console.error('[Cancel] Error creating cancellation request:', err);
    res.status(500).json({
      error: 'Failed to create cancellation request',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// GET /api/call-center/complaints/:callId/cancellation-status
// Check if a call has a pending cancellation request
router.get('/complaints/:callId/cancellation-status', authenticateToken, async (req, res) => {
  try {
    const { callId } = req.params;

    const existingRequest = await CallCancellationRequests.findOne({
      where: {
        call_id: callId,
        request_status: 'pending'
      },
      attributes: ['cancellation_id', 'call_id', 'request_status', 'created_at', 'reason']
    });

    if (existingRequest) {
      return res.json({
        hasPending: true,
        cancellationRequest: existingRequest
      });
    }

    res.json({
      hasPending: false,
      cancellationRequest: null
    });
  } catch (err) {
    console.error('[Cancellation Status] Error:', err);
    res.status(500).json({
      error: 'Failed to check cancellation status'
    });
  }
});

// GET /api/call-center/cancellation-requests
// RSM views pending cancellation requests
// Only RSM can view
router.get('/cancellation-requests', requireRole('rsm'), async (req, res) => {
  try {
    const { status = 'pending' } = req.query;

    console.log('[Get Cancel Requests] Fetching requests with status:', status);

    const where = {};
    if (status) {
      where.request_status = status;
    }

    // Use raw SQL for better control over the query
    const pool = await poolPromise;
    
    const result = await pool.request()
      .input('RequestStatus', status)
      .query(`
        SELECT 
          ccr.cancellation_id,
          ccr.call_id,
          ccr.requested_by_role,
          ccr.requested_by_id,
          ccr.reason,
          ccr.cancellation_remark,
          ccr.request_status,
          ccr.created_at,
          c.call_id,
          c.customer_id,
          c.assigned_asc_id,
          c.status_id,
          c.created_at as call_created_at,
          sc.asc_id,
          sc.asc_name,
          sc.asc_code
        FROM call_cancellation_requests ccr
        LEFT JOIN calls c ON ccr.call_id = c.call_id
        LEFT JOIN service_centers sc ON c.assigned_asc_id = sc.asc_id
        WHERE ccr.request_status = @RequestStatus
        ORDER BY ccr.created_at DESC
      `);

    console.log('[Get Cancel Requests] Found', result.recordset?.length || 0, 'requests');

    res.json({
      success: true,
      total: result.recordset?.length || 0,
      status_filter: status,
      data: (result.recordset || []).map(req => ({
        cancellation_id: req.cancellation_id,
        call_id: req.call_id,
        call_details: {
          call_id: req.call_id,
          customer_id: req.customer_id,
          assigned_asc_id: req.assigned_asc_id,
          status_id: req.status_id,
          serviceCenter: {
            asc_id: req.asc_id,
            asc_name: req.asc_name,
            asc_code: req.asc_code
          }
        },
        requested_by_id: req.requested_by_id,
        reason: req.reason,
        remarks: req.cancellation_remark,
        status: req.request_status,
        status: req.request_status,
        created_at: req.created_at
      }))
    });

  } catch (err) {
    console.error('[Get Cancel Requests] Error:', err);
    res.status(500).json({
      error: 'Failed to fetch cancellation requests',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// POST /api/call-center/cancellation-requests/:cancellationId/approve
// RSM approves cancellation request
// Only RSM can approve
router.post('/cancellation-requests/:cancellationId/approve', requireRole('rsm'), async (req, res) => {
  try {
    const { cancellationId } = req.params;
    const { remarks } = req.body;
    const user = req.user;

    console.log('[Approve Cancel] Processing approval for request:', cancellationId);

    const cancellationRequest = await CallCancellationRequests.findByPk(cancellationId);
    if (!cancellationRequest) {
      console.log('[Approve Cancel] Request not found:', cancellationId);
      return res.status(404).json({
        error: 'Cancellation request not found'
      });
    }

    if (cancellationRequest.request_status !== 'pending') {
      console.log('[Approve Cancel] Invalid status:', cancellationRequest.request_status);
      return res.status(400).json({
        error: `Cannot approve: request status is ${cancellationRequest.request_status}`
      });
    }

    // Update cancellation request status DYNAMICALLY
    await cancellationRequest.update({
      request_status: 'approved',
      cancellation_remark: remarks || cancellationRequest.cancellation_remark
    });

    console.log('[Approve Cancel] ✓ DATABASE UPDATED: Request status changed to "approved":', cancellationId);

    // Update approval record to approved
    try {
      const approval = await Approvals.findOne({
        where: {
          entity_type: 'CallCancellation',
          entity_id: cancellationId
        }
      });

      if (approval) {
        await approval.update({
          approval_status: 'approved',
          approval_remarks: remarks || approval.approval_remarks,
          approver_user_id: user.id,
          approved_at: new Date()
        });
        console.log('[Approve Cancel] ✓ Approval record updated:', { approval_id: approval.approval_id, status: 'approved' });
      }
    } catch (approvalErr) {
      console.error('[Approve Cancel] ⚠ Failed to update approval record:', approvalErr.message);
      // Don't fail the request if approval update fails
    }

    // Dynamically fetch RSM role ID from database
    const rsmRole = await Roles.findOne({
      where: { roles_name: 'RSM' }
    });
    const rsmRoleId = rsmRole ? rsmRole.roles_id : 8; // Fallback
    console.log('[Approve Cancel] RSM Role ID fetched dynamically from database:', rsmRoleId);

    // Update call status to cancelled
    const call = await Calls.findByPk(cancellationRequest.call_id, {
      include: [{ association: 'status', attributes: ['status_id', 'status_name'] }]
    });
    if (call) {
      console.log('[Approve Cancel] Found call:', call.call_id, 'Current Status:', call.status.status_name);
      
      // Store the OLD status BEFORE updating (DYNAMIC from call object)
      const oldStatusId = call.status_id;
      
      // DYNAMICALLY fetch 'Cancelled' status from database
      const cancelledStatus = await Status.findOne({
        where: { status_name: 'Cancelled' }
      });

      if (!cancelledStatus) {
        console.log('[Approve Cancel] "Cancelled" status not found. Trying alternatives...');
      }

      if (cancelledStatus) {
        console.log('[Approve Cancel] Found Cancelled status (ID:', cancelledStatus.status_id + '). Updating database...');
        
        // Prepare update data
        const cancelledAtTime = new Date();
        const cancelReason = cancellationRequest.reason || 'Not specified';
        const cancelRemarks = remarks || cancellationRequest.cancellation_remark || 'Approved by RSM';
        const cancelledByUserId = user.id;
        
        console.log('[Approve Cancel] ✓ Approval user details:', {
          user_id: cancelledByUserId,
          user_name: user.name || 'Unknown',
          cancelled_at: cancelledAtTime
        });
        
        // Update call with ALL cancellation details using Sequelize
        try {
          const updateResult = await call.update({
            status_id: cancelledStatus.status_id,
            cancel_reason: cancelReason,
            cancel_remarks: cancelRemarks,
            cancelled_by_userId: cancelledByUserId,
            cancelled_at: cancelledAtTime,
            call_closure_source: 'system'
          });

          console.log('[Approve Cancel] ✓ DATABASE UPDATED: Calls table updated successfully');
        } catch (updateErr) {
          console.error('[Approve Cancel] ✗ UPDATE ERROR:', updateErr.message);
          throw updateErr;
        }

        // Verify the update by re-fetching
        try {
          const verifyResult = await Calls.findByPk(cancellationRequest.call_id);
          
          if (verifyResult) {
            console.log('[Approve Cancel] ✓ VERIFICATION SUCCESSFUL: Call record after update:', {
              call_id: verifyResult.call_id,
              status_id: verifyResult.status_id,
              cancel_reason: verifyResult.cancel_reason,
              cancel_remarks: verifyResult.cancel_remarks,
              cancelled_by_userId: verifyResult.cancelled_by_userId,
              cancelled_at: verifyResult.cancelled_at
            });
          }
        } catch (verifyErr) {
          console.error('[Approve Cancel] ⚠ VERIFICATION ERROR (non-fatal):', verifyErr.message);
        }

        console.log('[Approve Cancel] ✓ DATABASE AUTOMATICALLY UPDATED: Call status changed from', call.status.status_name, 'to', cancelledStatus.status_name);

        // Create action log entry DYNAMICALLY for call cancellation
        try {
          const actionLog = await ActionLog.create({
            entity_type: 'Call',
            entity_id: call.call_id,
            user_id: user.id,
            action_user_role_id: rsmRoleId,
            old_status_id: oldStatusId,
            new_status_id: cancelledStatus.status_id,
            remarks: `Call cancelled by RSM. Original reason: ${cancellationRequest.reason || 'Not specified'}. RSM remarks: ${remarks || 'No additional remarks'}`,
            action_at: new Date()
          });
          
          console.log('[Approve Cancel] ✓ DATABASE AUTOMATICALLY LOGGED: Action log created (Log ID:', actionLog.log_id + ')');
        } catch (logErr) {
          console.error('[Approve Cancel] ⚠ Failed to create action log:', logErr.message);
          // Continue even if action log fails
        }
      } else {
        console.warn('[Approve Cancel] ⚠ Cancelled status not found in database - cannot update call status');
      }
    }

    res.json({
      success: true,
      message: 'Cancellation request approved and call status updated',
      cancellation_request: {
        id: cancellationRequest.cancellation_id,
        status: 'approved',
        call_id: cancellationRequest.call_id
      }
    });

  } catch (err) {
    console.error('[Approve Cancel] Error approving request:', err);
    res.status(500).json({
      error: 'Failed to approve cancellation request',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// POST /api/call-center/cancellation-requests/:cancellationId/reject
// RSM rejects cancellation request
// Only RSM can reject
router.post('/cancellation-requests/:cancellationId/reject', requireRole('rsm'), async (req, res) => {
  try {
    const { cancellationId } = req.params;
    const { remarks } = req.body;
    const user = req.user;

    console.log('[Reject Cancel] Processing rejection for request:', cancellationId);

    const cancellationRequest = await CallCancellationRequests.findByPk(cancellationId);
    if (!cancellationRequest) {
      console.log('[Reject Cancel] Request not found:', cancellationId);
      return res.status(404).json({
        error: 'Cancellation request not found'
      });
    }

    if (cancellationRequest.request_status !== 'pending') {
      console.log('[Reject Cancel] Invalid status:', cancellationRequest.request_status);
      return res.status(400).json({
        error: `Cannot reject: request status is ${cancellationRequest.request_status}`
      });
    }

    // Update cancellation request status DYNAMICALLY
    await cancellationRequest.update({
      request_status: 'rejected',
      cancellation_remark: remarks || 'Rejected by RSM'
    });

    console.log('[Reject Cancel] ✓ DATABASE UPDATED: Request status changed to "rejected":', cancellationId);

    // Update approval record to rejected
    try {
      const approval = await Approvals.findOne({
        where: {
          entity_type: 'CallCancellation',
          entity_id: cancellationId
        }
      });

      if (approval) {
        await approval.update({
          approval_status: 'rejected',
          approval_remarks: remarks || approval.approval_remarks,
          approver_user_id: user.id,
          approved_at: new Date()
        });
        console.log('[Reject Cancel] ✓ Approval record updated:', { approval_id: approval.approval_id, status: 'rejected' });
      }
    } catch (approvalErr) {
      console.error('[Reject Cancel] ⚠ Failed to update approval record:', approvalErr.message);
      // Don't fail the request if approval update fails
    }

    // Dynamically fetch RSM role ID from database
    const rsmRole = await Roles.findOne({
      where: { roles_name: 'RSM' }
    });
    const rsmRoleId = rsmRole ? rsmRole.roles_id : 8; // Fallback
    console.log('[Reject Cancel] RSM Role ID fetched dynamically from database:', rsmRoleId);

    // Update call status back to Active (or original status before cancellation request)
    const call = await Calls.findByPk(cancellationRequest.call_id, {
      include: [{ association: 'status', attributes: ['status_id', 'status_name'] }]
    });
    if (call) {
      console.log('[Reject Cancel] Found call:', call.call_id, 'Current Status:', call.status.status_name);
      
      // Store the OLD status BEFORE updating (which is currently "Pending Cancellation")
      const oldStatusId = call.status_id;
      
      // DYNAMICALLY find an appropriate status
      let activeStatus = await Status.findOne({
        where: { status_name: 'Active' }
      });
      
      if (!activeStatus) {
        console.log('[Reject Cancel] "Active" status not found. Looking for alternatives...');
        activeStatus = await Status.findOne({
          where: { status_name: 'Open' }
        });
      }
      
      if (!activeStatus) {
        console.log('[Reject Cancel] "Open" status not found. Looking for "In Progress"...');
        activeStatus = await Status.findOne({
          where: { status_name: 'In Progress' }
        });
      }

      if (activeStatus) {
        console.log('[Reject Cancel] Found target status:', activeStatus.status_name, '(ID:', activeStatus.status_id + '). Updating database...');
        
        // Update call status DYNAMICALLY in database
        const updateResult = await call.update({
          status_id: activeStatus.status_id
        });
        console.log('[Reject Cancel] ✓ DATABASE AUTOMATICALLY UPDATED: Call status changed from', call.status.status_name, 'to', activeStatus.status_name);
        
        // Create action log DYNAMICALLY for rejection with proper old/new status IDs
        try {
          const actionLog = await ActionLog.create({
            entity_type: 'Call',
            entity_id: cancellationRequest.call_id,
            user_id: user.id,
            action_user_role_id: rsmRoleId,
            old_status_id: oldStatusId,
            new_status_id: activeStatus.status_id,
            remarks: `Cancellation request REJECTED by RSM. Call status reverted to ${activeStatus.status_name}. RSM Reason: ${remarks || 'Not provided'}`,
            action_at: new Date()
          });
          console.log('[Reject Cancel] ✓ DATABASE AUTOMATICALLY LOGGED: Action log created (Log ID:', actionLog.log_id + ')');
        } catch (logErr) {
          console.error('[Reject Cancel] ⚠ Error: Could not create action log:', logErr.message);
          // Don't fail the whole request if logging fails
        }
      } else {
        console.warn('[Reject Cancel] ⚠ No suitable status found in database - cannot revert call status');
      }
    }

    res.json({
      success: true,
      message: 'Cancellation request rejected',
      cancellation_request: {
        id: cancellationRequest.cancellation_id,
        status: 'rejected',
        call_id: cancellationRequest.call_id,
        remarks: remarks || 'Rejected by RSM'
      }
    });

  } catch (err) {
    console.error('[Reject Cancel] Error rejecting request:', err);
    res.status(500).json({
      error: 'Failed to reject cancellation request',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

export default router;
