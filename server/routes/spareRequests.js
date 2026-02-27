import express from 'express';
import { sequelize } from '../db.js';
import { SpareRequest, SpareRequestItem, Status, Users, Approvals, SpareInventory, StockMovement, ServiceCenter, SparePartMSL } from '../models/index.js';
import { authenticateToken, optionalAuthenticate } from '../middleware/auth.js';
import { QueryTypes, Op } from 'sequelize';
import { determineRequestType, getRequestTypeDescription } from '../utils/requestTypeHelper.js';
import {
  processMovement,
  getBucketSummary,
  validateBucketOperation
} from '../services/bucketTrackingService.js';
import {
  SPARE_REQUEST_TYPES,
  SPARE_REQUEST_TO_MOVEMENTS,
  SPARE_REQUEST_TYPE_DESCRIPTIONS,
  SPARE_REQUEST_TYPE_TO_LEGACY_TYPE
} from '../constants/requestTypeConstants.js';
import { scanAndAutoGenerateRequests, checkMSLRequirement } from '../services/mslCheckService.js';

const router = express.Router();

/**
 * GET /api/spare-requests
 * Get spare requests for a service center with filters
 */

// get the spare requests for a service center with optional filters for date range and status;
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { serviceCenterId, dateFrom, dateTo, status } = req.query;
    
    console.log('📤 GET /api/spare-requests:', {
      serviceCenterId,
      dateFrom,
      dateTo,
      status,
      userRole: req.user?.role,
      userCenterId: req.user?.centerId
    });
    
    // Get service center ID from user if not provided
    let centerId = serviceCenterId;
    if (!centerId && req.user) {
      centerId = req.user.centerId;
    }

    if (!centerId) {
      return res.status(400).json({ error: 'Service center ID required' });
    }

    // Check if this is a rental return request (looking for allocated requests)
    if (status === 'Allocated') {
      console.log('🔍 Fetching allocated requests for rental return...');
      
      // Query the spare_requests table directly for allocated requests
      const whereConditions = [];
      const replacements = [];
      
      whereConditions.push('sr.status_id = ?');
      replacements.push(3); // 3 = Allocated status
      
      whereConditions.push('sr.requested_to_id = ?');
      replacements.push(centerId); // Service center receiving the allocated items
      
      whereConditions.push('sr.requested_source_type = ?');
      replacements.push('technician');
      
      const whereClause = 'WHERE ' + whereConditions.join(' AND ');
      
      const query = `
        SELECT 
          sr.request_id as id,
          sr.request_id as requestNumber,
          sr.status_id as statusId,
          sr.request_type as type,
          sr.created_at as createdAt,
          sr.requested_source_id as technicianId,
          t.name as technicianName,
          sr.requested_to_id as serviceCenterId
        FROM spare_requests sr
        LEFT JOIN technicians t ON sr.requested_source_id = t.technician_id
        ${whereClause}
        ORDER BY sr.created_at DESC
      `;
      
      console.log('SQL Query:', query);
      console.log('Replacements:', replacements);
      
      const requests = await sequelize.query(query, {
        replacements: replacements,
        type: sequelize.QueryTypes.SELECT
      });
      
      console.log(`✅ Found ${requests.length} allocated requests`);
      
      // Fetch items for each request
      const formatted = await Promise.all(requests.map(async (req) => {
        const items = await sequelize.query(
          'SELECT id, spare_id, requested_qty, approved_qty FROM spare_request_items WHERE request_id = ?',
          {
            replacements: [req.id],
            type: sequelize.QueryTypes.SELECT
          }
        );
        
        return {
          id: req.id,
          requestId: req.requestNumber,
          technicianName: req.technicianName || 'Technician',
          technicianId: req.technicianId,
          status: 'Allocated',
          createdAt: req.createdAt,
          items: items.map(item => ({
            id: item.id,
            spareId: item.spare_id,
            requestedQty: item.requested_qty,
            approvedQty: item.approved_qty
          }))
        };
      }));
      
      return res.json(formatted);
    }

    // Original logic for other status types
    const where = {
      requested_source_type: 'service_center',
      requested_source_id: parseInt(centerId),
      // Only show consignment fillup orders (bulk, msl)
      request_reason: {
        [Op.in]: ['bulk', 'msl']
      }
    };

    if (status) {
      // Map status string to request_reason if needed
      where.request_reason = status;
    }

    if (dateFrom || dateTo) {
      where.created_at = {};
      if (dateFrom) where.created_at[Op.gte] = new Date(dateFrom);
      if (dateTo) where.created_at[Op.lte] = new Date(dateTo);
    }

    const requests = await SpareRequest.findAll({
      where,
      include: [
        {
          model: SpareRequestItem,
          as: 'SpareRequestItems',
          attributes: ['id', 'spare_id', 'requested_qty'],
          required: false
        }
      ],
      order: [['created_at', 'DESC']],
      limit: 100
    });

    // Format the response
    const formattedRequests = requests.map((req) => ({
      id: req.request_id,
      requestId: `REQ-${req.request_id}`,
      date: req.created_at,
      createdAt: req.created_at,
      status: req.request_reason || 'msl',
      orderType: req.request_type || 'normal',
      itemCount: (req.SpareRequestItems && req.SpareRequestItems.length) || 0
    }));

    res.json(formattedRequests);
  } catch (err) {
    console.error('Error fetching spare requests:', err);
    res.status(500).json({ error: 'Failed to fetch requests', message: err.message });
  }
});

/**
 * POST /api/spare-requests/scan-msl
 * Scan all service center inventory and auto-generate requests for items below MSL
 * Returns list of auto-generated requests
 */
router.post('/scan-msl', authenticateToken, async (req, res) => {
  try {
    console.log('📢 Starting MSL scan and auto-generation of spare requests...');
    
    const userId = req.user?.id || 1;
    const generatedRequests = await scanAndAutoGenerateRequests(userId);

    res.status(200).json({
      success: true,
      message: `Scan complete. Generated ${generatedRequests.length} spare requests for items below MSL.`,
      generatedRequests,
      summary: {
        total: generatedRequests.length,
        timestamp: new Date()
      }
    });
  } catch (err) {
    console.error('❌ Error scanning MSL:', err);
    res.status(500).json({ error: 'Failed to scan MSL', message: err.message });
  }
});

/**
 * POST /api/spare-requests/check-msl
 * Check if a specific spare part at a location needs replenishment
 */
router.post('/check-msl', authenticateToken, async (req, res) => {
  try {
    const { spareId, locationId, currentQuantity } = req.body;

    if (!spareId || !locationId || currentQuantity === undefined) {
      return res.status(400).json({ error: 'Missing required fields: spareId, locationId, currentQuantity' });
    }

    const mslCheck = await checkMSLRequirement(spareId, locationId, currentQuantity);

    res.status(200).json({
      success: true,
      mslCheck
    });
  } catch (err) {
    console.error('Error checking MSL:', err);
    res.status(500).json({ error: 'Failed to check MSL', message: err.message });
  }
});

/**
 * POST /api/spare-requests
 * Create new spare request(s) from order form
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { items } = req.body;
    const userId = req.user?.id;
    const centerId = req.user?.centerId;

    console.log('📝 POST /api/spare-requests - Creating order request', {
      userId,
      centerId,
      itemCount: items?.length
    });

    if (!items || !Array.isArray(items) || items.length === 0) {
      console.warn('❌ Items validation failed');
      return res.status(400).json({ error: 'Items array is required' });
    }

    if (!centerId) {
      console.warn('❌ CenterId missing from user token');
      return res.status(400).json({ error: 'Service center not identified' });
    }

    // Validate all items have required fields
    for (const item of items) {
      const { sparePartId, quantity } = item;
      if (!sparePartId || !quantity) {
        console.warn('❌ Item validation failed:', { sparePartId, quantity });
        return res.status(400).json({ error: 'Missing sparePartId or quantity in items' });
      }
    }

    console.log('✅ Items validation passed');

    // Determine a valid status_id (prefer 'pending')
    let statusRow = null;
    try {
      console.log('🔍 Looking up status: pending');
      statusRow = await Status.findOne({ where: { status_name: 'pending' } });
      if (!statusRow) {
        console.log('⚠️ No pending status found, trying any status');
        statusRow = await Status.findOne();
      }
      if (!statusRow) {
        console.log('✅ Creating default pending status');
        // create a default pending status if none exists
        statusRow = await Status.create({ status_name: 'pending' });
      }
      console.log('✅ Status resolved:', { statusId: statusRow?.status_id, statusName: statusRow?.status_name });
    } catch (e) {
      console.warn('⚠️ Could not determine/create status row, continuing with status_id null', e && e.message);
    }

    // Find plant_id and city_tier_id for this service center (asc_id)
    console.log('🔍 Looking up ServiceCenter with centerId:', centerId);
    const sc = await ServiceCenter.findByPk(centerId);
    console.log('✅ ServiceCenter lookup result:', { found: !!sc, plantId: sc?.plant_id, cityId: sc?.city_id });
    
    if (!sc || !sc.plant_id) {
      console.error('❌ ServiceCenter validation failed:', { sc, plantId: sc?.plant_id });
      return res.status(400).json({ error: 'No plant_id found for this service center. Cannot submit request.' });
    }

    // Get city_tier_id from the service center's city
    let cityTierId = null;
    if (sc.city_id) {
      try {
        const cityRow = await sequelize.query(
          'SELECT city_tier_id FROM Cities WHERE Id = ?',
          {
            replacements: [sc.city_id],
            type: QueryTypes.SELECT
          }
        );
        if (cityRow.length > 0) {
          cityTierId = cityRow[0].city_tier_id;
          console.log('✅ City tier resolved:', { cityTierId });
        }
      } catch (err) {
        console.warn('⚠️ Could not resolve city tier:', err.message);
      }
    }

    // Determine if this is MSL or BULK request by checking stock levels
    console.log('📊 Determining request reason (MSL vs BULK)...');
    let isMSLRequest = false;
    const stockCheckResults = [];

    for (const item of items) {
      const { sparePartId } = item;
      
      try {
        // Get MSL for this spare part and city tier
        const msl = await SparePartMSL.findOne({
          where: {
            spare_part_id: sparePartId,
            city_tier_id: cityTierId,
            is_active: true,
            effective_from: { [Op.lte]: new Date() },
            [Op.or]: [
              { effective_to: null },
              { effective_to: { [Op.gte]: new Date() } }
            ]
          }
        });

        // Get current stock
        const currentStock = await SpareInventory.findOne({
          where: {
            spare_id: sparePartId,
            location_id: centerId,
            location_type: 'service_center'
          }
        });

        const currentQty = currentStock?.qty_good || 0;
        const minLevel = msl?.minimum_stock_level_qty || 0;
        const isStockLow = currentQty <= minLevel;

        console.log(`  Spare ${sparePartId}: Current=${currentQty}, MSL Min=${minLevel}, IsLow=${isStockLow}`);
        stockCheckResults.push({
          sparePartId,
          currentQty,
          minLevel,
          isStockLow
        });

        if (isStockLow) {
          isMSLRequest = true;
        }
      } catch (err) {
        console.warn(`⚠️ Could not check MSL for spare ${sparePartId}:`, err.message);
        // Continue even if check fails
      }
    }

    const requestReason = isMSLRequest ? 'msl' : 'bulk';
    console.log(`✅ Request reason determined: ${requestReason.toUpperCase()} (${isMSLRequest ? 'stock below MSL' : 'general replenishment'})`);

    console.log('📦 Creating SpareRequest with type:', determineRequestType(requestReason));
    const requestType = determineRequestType(requestReason);
    const legacyType = SPARE_REQUEST_TYPE_TO_LEGACY_TYPE[requestType] || 'consignment_fillup';
    
    const newRequest = await SpareRequest.create({
      request_type: legacyType, // Legacy field for backward compatibility
      spare_request_type: requestType, // Business intent: MSL or BULK replenishment
      call_id: null,
      requested_source_type: 'service_center',
      requested_source_id: parseInt(centerId),
      requested_to_type: 'plant', // destination is plant (location) 
      requested_to_id: sc.plant_id, // use plant_id for correct routing
      request_reason: requestReason, // 'msl' if stock low, 'bulk' otherwise
      status_id: statusRow ? statusRow.status_id : null, // resolved status id
      created_by: userId
    });

    console.log('✅ SpareRequest created:', { requestId: newRequest.request_id });

    // Create SpareRequestItem records for each item
    const requestItems = [];
    for (const item of items) {
      const { sparePartId, quantity } = item;

      console.log('📦 Creating SpareRequestItem:', { sparePartId, quantity });
      const requestItem = await SpareRequestItem.create({
        request_id: newRequest.request_id,
        spare_id: parseInt(sparePartId),
        requested_qty: parseInt(quantity),
        approved_qty: 0
      });

      console.log('✅ SpareRequestItem created:', { itemId: requestItem.id });
      requestItems.push(requestItem);
    }

    console.log('✅ Order request completed successfully');
    res.status(201).json({
      message: `Spare request created with ${requestItems.length} item(s)`,
      spare_request: {
        request_id: newRequest.request_id,
        requestId: `REQ-${newRequest.request_id}`,
        request_reason: requestReason,
        spare_request_type: requestType,
        request_type: legacyType,
        itemCount: requestItems.length,
        status: 'pending',
        stock_check_results: stockCheckResults // Include stock check details for debugging
      },
      request: {
        requestId: `REQ-${newRequest.request_id}`,
        id: newRequest.request_id,
        itemCount: requestItems.length,
        status: 'pending'
      }
    });
  } catch (err) {
    console.error('❌ Error creating spare request:', err);
    console.error('Stack trace:', err.stack);
    res.status(500).json({ error: 'Failed to create request', message: err.message, stack: process.env.NODE_ENV === 'development' ? err.stack : undefined });
  }
});

/**
 * GET /api/spare-requests/:requestId
 * Get specific spare request details
 */
router.get('/:requestId', authenticateToken, async (req, res) => {
  try {
    let { requestId } = req.params;
    
    // Handle both numeric ID and formatted ID (REQ-16)
    if (typeof requestId === 'string' && requestId.startsWith('REQ-')) {
      requestId = parseInt(requestId.substring(4), 10);
    } else {
      requestId = parseInt(requestId, 10);
    }
    
    if (isNaN(requestId)) {
      return res.status(400).json({ error: 'Invalid request ID format' });
    }

    const request = await SpareRequest.findByPk(requestId, {
      include: [
        {
          model: SpareRequestItem,
          as: 'SpareRequestItems',
          required: false,
        }
      ]
    });

    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    // Get status name
    let statusName = 'pending';
    if (request.status_id) {
      try {
        const status = await Status.findByPk(request.status_id);
        if (status) {
          statusName = status.status_name;
        }
      } catch (e) {
        console.warn('Could not fetch status name:', e.message);
      }
    }

    const response = {
      ...request.toJSON(),
      status_name: statusName,
      items: request.SpareRequestItems || [],
      approval_history: null
    };

    // Fetch approval history from Approvals table
    try {
      const approvalRecords = await Approvals.findAll({
        where: {
          entity_type: 'spare_request',
          entity_id: requestId
        },
        order: [['approval_level', 'ASC'], ['created_at', 'ASC']]
      });

      if (approvalRecords && approvalRecords.length > 0) {
        response.approval_history = await Promise.all(
          approvalRecords.map(async (approval) => {
            let approverUserName = 'Unknown';
            if (approval.approver_user_id) {
              try {
                const approverUser = await Users.findByPk(approval.approver_user_id);
                if (approverUser) {
                  approverUserName = approverUser.name || approverUser.username || 'Unknown';
                }
              } catch (e) {
                console.warn('Could not fetch approver user:', e.message);
              }
            }
            return {
              approval_id: approval.approval_id,
              approval_level: approval.approval_level,
              approval_level_name: approval.approval_level === 1 ? 'RSM' : approval.approval_level === 2 ? 'HOD' : `Level ${approval.approval_level}`,
              approver_id: approval.approver_user_id,
              approver_name: approverUserName,
              approval_status: approval.approval_status,
              approval_remarks: approval.approval_remarks,
              approved_at: approval.approved_at,
              created_at: approval.created_at
            };
          })
        );
      }
    } catch (e) {
      console.warn('Could not fetch approval history:', e.message);
    }

    res.json(response);
  } catch (err) {
    console.error('Error fetching request:', err);
    res.status(500).json({ error: 'Failed to fetch request', message: err.message });
  }
});

/**
 * PATCH /api/spare-requests/:requestId/status
 * Update request status
 */
router.patch('/:requestId/status', authenticateToken, async (req, res) => {
  try {
    let { requestId } = req.params;
    
    // Handle both numeric ID and formatted ID (REQ-16)
    if (typeof requestId === 'string' && requestId.startsWith('REQ-')) {
      requestId = parseInt(requestId.substring(4), 10);
    } else {
      requestId = parseInt(requestId, 10);
    }
    
    if (isNaN(requestId)) {
      return res.status(400).json({ error: 'Invalid request ID format' });
    }

    const { status, remarks } = req.body;

    const request = await SpareRequest.findByPk(requestId);
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const updateData = {
      updated_at: new Date()
    };

    // Map status to request_reason if needed
    if (status && ['defect', 'msl', 'bulk', 'replacement'].includes(status)) {
      updateData.request_reason = status;
    }

    await request.update(updateData);

    res.json({
      message: `Request updated successfully`,
      request
    });
  } catch (err) {
    console.error('Error updating request:', err);
    res.status(500).json({ error: 'Failed to update request', message: err.message });
  }
});

/**
 * GET /api/spare-requests/returns/pending
 * Get pending technician return requests for service center approval
 */
router.get('/returns/pending', authenticateToken, async (req, res) => {
  try {
    const serviceCenterId = req.user?.centerId || req.user?.service_center_id;
    
    if (!serviceCenterId) {
      return res.status(400).json({ error: 'Service center ID not found' });
    }

    console.log(`📋 Fetching pending return requests for service center ${serviceCenterId}`);

    // Get pending returns - includes both rental returns AND spare part returns
    // Rental returns: request_reason = 'replacement'
    // Spare part returns: spare_request_type IN ('TECH_RETURN_DEFECTIVE', 'TECH_RETURN_EXCESS')
    const returns = await sequelize.query(`
      SELECT 
        sr.request_id as id,
        sr.request_id as requestId,
        sr.requested_source_id as technicianId,
        t.name as technicianName,
        sr.requested_to_id as serviceCenterId,
        sr.status_id as statusId,
        s.status_name as status,
        sr.request_type,
        sr.request_reason,
        sr.spare_request_type,
        sr.created_at,
        sr.updated_at
      FROM spare_requests sr
      LEFT JOIN technicians t ON sr.requested_source_id = t.technician_id
      LEFT JOIN status s ON sr.status_id = s.status_id
      WHERE sr.requested_to_id = ?
        AND sr.requested_source_type = 'technician'
        AND LOWER(s.status_name) = 'pending'
        AND (sr.request_reason = 'replacement' OR sr.spare_request_type IN ('TECH_RETURN_DEFECTIVE', 'TECH_RETURN_EXCESS'))
      ORDER BY sr.created_at DESC
    `, {
      replacements: [serviceCenterId],
      type: QueryTypes.SELECT
    });

    console.log(`✓ Found ${returns.length} pending return requests`);

    // Fetch items for each return
    const formattedReturns = await Promise.all(
      returns.map(async (ret) => {
        const items = await sequelize.query(`
          SELECT 
            sri.id,
            sri.spare_id,
            sp.PART as sku,
            sp.DESCRIPTION as name,
            sri.requested_qty,
            sri.approved_qty
          FROM spare_request_items sri
          LEFT JOIN spare_parts sp ON sri.spare_id = sp.Id
          WHERE sri.request_id = ?
        `, {
          replacements: [ret.id],
          type: QueryTypes.SELECT
        });

        return {
          id: ret.id,
          requestId: `RET-${ret.requestId}`,
          technicianId: ret.technicianId,
          technicianName: ret.technicianName || 'Technician',
          serviceCenterId: ret.serviceCenterId,
          status: ret.status,
          statusId: ret.statusId,
          createdAt: ret.created_at,
          updatedAt: ret.updated_at,
          returnType: ret.spare_request_type || ret.request_reason, // Show type or reason
          itemCount: items.length,
          items: items.map(item => ({
            id: item.id,
            spareId: item.spare_id,
            sku: item.sku || 'N/A',
            name: item.name || 'Unknown Part',
            requestedQty: item.requested_qty,
            approvedQty: item.approved_qty
          }))
        };
      })
    );

    res.json({
      success: true,
      count: formattedReturns.length,
      returns: formattedReturns
    });

  } catch (err) {
    console.error('❌ Error fetching pending return requests:', err);
    res.status(500).json({
      error: 'Failed to fetch pending return requests',
      message: err.message
    });
  }
});

/**
 * GET /api/spare-requests/returns/:requestId
 * Get details of a specific return request
 */
router.get('/returns/:requestId', authenticateToken, async (req, res) => {
  try {
    const { requestId } = req.params;
    const serviceCenterId = req.user?.centerId || req.user?.service_center_id;

    if (!serviceCenterId) {
      return res.status(400).json({ error: 'Service center ID not found' });
    }

    console.log(`📝 Fetching return request ${requestId}`);

    // Get return request details
    const [returnRequest] = await sequelize.query(`
      SELECT 
        sr.request_id,
        sr.requested_source_id as technicianId,
        t.name as technicianName,
        sr.requested_to_id as serviceCenterId,
        sr.status_id,
        s.status_name as status,
        sr.created_at,
        sr.updated_at
      FROM spare_requests sr
      LEFT JOIN technicians t ON sr.requested_source_id = t.technician_id
      LEFT JOIN status s ON sr.status_id = s.status_id
      WHERE sr.request_id = ?
    `, {
      replacements: [requestId],
      type: QueryTypes.SELECT
    });

    if (!returnRequest) {
      return res.status(404).json({ error: 'Return request not found' });
    }

    // Verify authorization
    if (returnRequest.serviceCenterId !== serviceCenterId) {
      return res.status(403).json({ error: 'Not authorized to view this return request' });
    }

    // Get items
    const items = await sequelize.query(`
      SELECT 
        sri.id,
        sri.spare_id,
        sp.PART as sku,
        sp.DESCRIPTION as name,
        sri.requested_qty,
        sri.approved_qty
      FROM spare_request_items sri
      LEFT JOIN spare_parts sp ON sri.spare_id = sp.Id
      WHERE sri.request_id = ?
    `, {
      replacements: [requestId],
      type: QueryTypes.SELECT
    });

    res.json({
      success: true,
      return: {
        id: returnRequest.request_id,
        requestId: `RET-${returnRequest.request_id}`,
        technicianId: returnRequest.technicianId,
        technicianName: returnRequest.technicianName,
        serviceCenterId: returnRequest.serviceCenterId,
        status: returnRequest.status,
        createdAt: returnRequest.created_at,
        updatedAt: returnRequest.updated_at,
        itemCount: items.length,
        items: items.map(item => ({
          id: item.id,
          spareId: item.spare_id,
          sku: item.sku,
          name: item.name,
          requestedQty: item.requested_qty,
          approvedQty: item.approved_qty
        }))
      }
    });

  } catch (err) {
    console.error('❌ Error fetching return request:', err);
    res.status(500).json({
      error: 'Failed to fetch return request',
      message: err.message
    });
  }
});

/**
 * GET /api/spare-requests/technicians/:id/inventory
 * Get technician's allocated spare inventory for return processing
 */
router.get('/technicians/:id/inventory', optionalAuthenticate, async (req, res) => {
  try {
    const technicianId = parseInt(req.params.id, 10);
    
    if (isNaN(technicianId)) {
      return res.status(400).json({ error: 'Invalid technician ID' });
    }

    console.log(`📦 Fetching inventory for technician ${technicianId}`);

    // Query spare_inventory for this technician's allocated items
    const inventory = await sequelize.query(`
      SELECT 
        si.spare_inventory_id as id,
        si.spare_id,
        sp.PART as sku,
        sp.DESCRIPTION as spareName,
        si.qty_good as goodQty,
        si.qty_defective as defectiveQty,
        (si.qty_good + si.qty_defective) as totalQty
      FROM spare_inventory si
      LEFT JOIN spare_parts sp ON si.spare_id = sp.Id
      WHERE si.location_type = 'technician' 
        AND si.location_id = ?
        AND (si.qty_good > 0 OR si.qty_defective > 0)
      ORDER BY sp.DESCRIPTION ASC
    `, { 
      replacements: [technicianId],
      type: QueryTypes.SELECT 
    });

    console.log(`✓ Found ${inventory ? inventory.length : 0} inventory items for technician ${technicianId}`);

    // Format response
    const items = inventory && Array.isArray(inventory) ? inventory.map(item => ({
      id: item.id,
      spareId: item.spare_id,
      sku: item.sku || 'N/A',
      name: item.spareName || 'Unknown Spare Part',
      goodQty: item.goodQty || 0,
      defectiveQty: item.defectiveQty || 0,
      totalQty: item.totalQty || 0
    })) : [];

    res.json(items);
  } catch (err) {
    console.error('Error fetching technician inventory:', err);
    res.status(500).json({ 
      error: 'Failed to fetch technician inventory', 
      message: err.message 
    });
  }
});

/**
 * POST /api/spare-requests/return
 * Submit technician rental returns - creates a pending return request for service center approval
 * Does NOT auto-reduce inventory. Service center approval will handle inventory updates.
 * Automatically routes to the ASC that the technician is assigned to
 */
router.post('/return', optionalAuthenticate, async (req, res) => {
  try {
    const { returns, technicianId, returnType } = req.body;
    
    if (!returns || !Array.isArray(returns) || returns.length === 0) {
      return res.status(400).json({ error: 'Returns array is required' });
    }

    if (!technicianId) {
      return res.status(400).json({ error: 'Technician ID is required' });
    }

    // Determine return type and reason dynamically
    const validReturnTypes = ['TECH_RETURN_DEFECTIVE', 'TECH_RETURN_EXCESS'];
    const finalReturnType = returnType && validReturnTypes.includes(returnType) 
      ? returnType 
      : 'TECH_RETURN_DEFECTIVE'; // Default to defective
    
    // Dynamic reason based on return type
    const requestReason = finalReturnType === 'TECH_RETURN_EXCESS' ? 'excess' : 'defect';

    console.log(`📤 Creating rental return request from technician ${technicianId}`);
    console.log(`   Type: ${finalReturnType}, Reason: ${requestReason}`);

    // Get technician's assigned service center
    const [techResult] = await sequelize.query(`
      SELECT technician_id, service_center_id, name FROM technicians WHERE technician_id = ?
    `, {
      replacements: [technicianId],
      type: QueryTypes.SELECT
    });

    if (!techResult) {
      return res.status(404).json({ error: `Technician ${technicianId} not found` });
    }

    const serviceCenterId = techResult.service_center_id;
    console.log(`✓ Technician assigned to ASC: ${serviceCenterId}`);

    if (!serviceCenterId) {
      return res.status(400).json({ 
        error: `Technician ${technicianId} is not assigned to any service center` 
      });
    }

    let createdReturns = [];
    let errors = [];
    let totalReturnQty = 0;
    let returnItems = [];

    // Collect all items (NO inventory update yet)
    for (const returnItem of returns) {
      const { inventoryItemId, spareId, goodQty, defectiveQty, sku, name } = returnItem;

      try {
        // Validate input
        if (!spareId || !technicianId) {
          errors.push(`Missing required fields for SKU ${sku}`);
          continue;
        }

        const totalQty = (goodQty || 0) + (defectiveQty || 0);
        if (totalQty <= 0) {
          errors.push(`Invalid quantity for SKU ${sku}: must be greater than 0`);
          continue;
        }

        totalReturnQty += totalQty;

        console.log(`✓ Validated return item for spare_id ${spareId}: good=${goodQty}, defective=${defectiveQty}`);

        createdReturns.push({
          inventoryItemId,
          spareId,
          sku,
          name,
          goodQty: goodQty || 0,
          defectiveQty: defectiveQty || 0,
          totalQty: totalQty
        });

        returnItems.push({
          spare_id: spareId,
          sku,
          good_qty: goodQty || 0,
          defective_qty: defectiveQty || 0,
          name,
          inventory_item_id: inventoryItemId
        });

      } catch (itemErr) {
        console.error(`Error processing return for ${sku}:`, itemErr.message);
        errors.push(`Failed to process return for SKU ${sku}: ${itemErr.message}`);
      }
    }

    // Create formal return request in SpareRequest table (with PENDING status)
    if (createdReturns.length > 0) {
      console.log(`📝 Creating PENDING return request for technician ${technicianId} to ASC ${serviceCenterId}`);

      // Get pending status
      const [statusResult] = await sequelize.query(`
        SELECT TOP 1 status_id FROM status WHERE status_name = 'pending'
      `, { type: QueryTypes.SELECT });

      const statusId = statusResult?.status_id || 1;

      // Create return request with PENDING status (not approved)
      const [returnRequestResult] = await sequelize.query(`
        INSERT INTO spare_requests 
        (request_type, spare_request_type, request_reason, requested_source_type, requested_source_id, 
         requested_to_type, requested_to_id, status_id, created_at, updated_at)
        VALUES ('consignment_return', ?, ?, 'technician', ?, 'service_center', ?, ?, GETDATE(), GETDATE())
      `, {
        replacements: [
          finalReturnType,
          requestReason,
          technicianId,
          serviceCenterId,
          statusId
        ],
        type: QueryTypes.INSERT
      });

      // Get the inserted request ID
      const [reqIdResult] = await sequelize.query(`
        SELECT IDENT_CURRENT('spare_requests') AS request_id
      `, { type: QueryTypes.SELECT });

      const requestId = reqIdResult.request_id;
      console.log(`✓ Created PENDING return request: ID=${requestId}, ASC=${serviceCenterId}`);

      // Create return items in SpareRequestItems with requested_qty only (approved_qty = 0)
      for (const item of returnItems) {
        await sequelize.query(`
          INSERT INTO spare_request_items 
          (request_id, spare_id, requested_qty, approved_qty)
          VALUES (?, ?, ?, 0)
        `, {
          replacements: [
            requestId,
            item.spare_id,
            item.good_qty + item.defective_qty
          ],
          type: QueryTypes.INSERT
        });
      }

      console.log(`✓ Created ${returnItems.length} pending return items (awaiting service center approval)`);
    }

    // Return results
    if (createdReturns.length === 0 && errors.length > 0) {
      return res.status(400).json({
        error: 'All returns failed',
        details: errors
      });
    }

    res.json({
      message: `✅ Return request submitted successfully! Waiting for service center approval.`,
      success: true,
      returns: createdReturns,
      serviceCenterId: serviceCenterId,
      technicianId: technicianId,
      totalQtyReturned: totalReturnQty,
      status: 'pending',
      note: 'Service center will need to approve this return request before inventory is updated',
      errors: errors.length > 0 ? errors : undefined,
      hasErrors: errors.length > 0
    });

  } catch (err) {
    console.error('❌ Error creating return request:', err);
    console.error('Stack:', err.stack);
    res.status(500).json({
      error: 'Failed to create return request',
      message: err.message,
      details: err.stack
    });
  }
});

/**
 * POST /api/spare-requests/:requestId/approve-return
 * Service Center approves a technician return request
 * Creates approval records, stock movements, updates inventory and goods tracking
 * 
 * Request body:
 * {
 *   approvalRemarks: string (optional)
 * }
 */
router.post('/:requestId/approve-return', authenticateToken, async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { requestId } = req.params;
    const { approvalRemarks, approvedQtys = {} } = req.body || {};
    const serviceCenterId = req.user?.centerId || req.user?.service_center_id;
    const approverId = req.user?.id;

    if (!serviceCenterId) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Service center ID not found in user context' });
    }

    if (!approverId) {
      await transaction.rollback();
      return res.status(400).json({ error: 'User ID not found in user context' });
    }

    console.log(`\n✅ STARTING APPROVAL PROCESS for return request ${requestId}`);
    console.log(`   Service Center: ${serviceCenterId}, Approver: ${approverId}`);
    console.log(`   Approved Quantities:`, approvedQtys);

    // Get the return request and validate it
    const [returnRequest] = await sequelize.query(`
      SELECT request_id, requested_source_id, requested_to_id, status_id
      FROM spare_requests
      WHERE request_id = ?
    `, {
      replacements: [requestId],
      type: QueryTypes.SELECT,
      transaction
    });

    if (!returnRequest) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Return request not found' });
    }

    // Verify this service center is authorized to approve this return
    if (returnRequest.requested_to_id !== serviceCenterId) {
      await transaction.rollback();
      return res.status(403).json({ error: 'Not authorized to approve this return request' });
    }

    const technicianId = returnRequest.requested_source_id;
    console.log(`✓ Return request validated - Technician: ${technicianId}, ASC: ${serviceCenterId}`);

    // Get all items in this return request with spare part details
    const items = await sequelize.query(`
      SELECT sri.id, sri.spare_id, sri.requested_qty, sp.PART, sp.DESCRIPTION
      FROM spare_request_items sri
      LEFT JOIN spare_parts sp ON sri.spare_id = sp.Id
      WHERE sri.request_id = ?
    `, {
      replacements: [requestId],
      type: QueryTypes.SELECT,
      transaction
    });

    if (!items || items.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ error: 'No items found in return request' });
    }

    console.log(`📦 Processing ${items.length} items from return request`);

    // Calculate total quantity
    let totalQty = 0;
    items.forEach(item => {
      totalQty += item.requested_qty;
    });

    // Get approved status
    const [approvedStatus] = await sequelize.query(`
      SELECT status_id FROM status WHERE status_name = 'approved'
    `, { 
      type: QueryTypes.SELECT,
      transaction
    });

    const approvedStatusId = approvedStatus?.status_id || 2;

    // Initialize movementId (will be set in STEP 2)
    let movementId = null;
    let processedCount = 0;

    // STEP 1: Create APPROVAL record in Approvals table
    console.log(`\n1️⃣ CREATING APPROVAL RECORD`);
    try {
      const approvalInsert = await sequelize.query(`
        INSERT INTO approvals 
        (entity_type, entity_id, approval_level, approver_user_id, approval_status, approval_remarks, approved_at, created_at, updated_at)
        VALUES ('return_request', ?, 1, ?, 'approved', ?, GETDATE(), GETDATE(), GETDATE())
      `, {
        replacements: [
          requestId,
          approverId,
          approvalRemarks || null
        ],
        type: QueryTypes.INSERT,
        transaction
      });
      console.log(`   ✓ Approval record created for return_request ID: ${requestId}`, {
        raw: approvalInsert
      });
    } catch (approvalErr) {
      console.error(`   ❌ Error creating approval record:`, approvalErr.message);
      await transaction.rollback();
      return res.status(500).json({ 
        error: 'Failed to create approval record',
        message: approvalErr.message
      });
    }

    // STEP 2: Create stock movement for this return
    console.log(`\n2️⃣ CREATING STOCK MOVEMENT`);
    
    try {
      // Insert stock movement with correct column names
      const movementQuery = `
        INSERT INTO stock_movement (
          stock_movement_type,
          bucket,
          bucket_operation,
          reference_type,
          reference_no,
          source_location_type,
          source_location_id,
          destination_location_type,
          destination_location_id,
          total_qty,
          movement_date,
          created_by,
          status,
          created_at,
          updated_at
        )
        VALUES (
          'TECH_RETURN_DEFECTIVE',
          'GOOD',
          'INCREASE',
          'return_request',
          'RET-' + CAST(? AS VARCHAR),
          'technician',
          ?,
          'service_center',
          ?,
          ?,
          GETDATE(),
          ?,
          'completed',
          GETDATE(),
          GETDATE()
        );
        SELECT SCOPE_IDENTITY() as movement_id;
      `;
      
      const movementResults = await sequelize.query(movementQuery, {
        replacements: [requestId, technicianId, serviceCenterId, totalQty, approverId],
        type: QueryTypes.SELECT,
        transaction,
        raw: true
      });

      // SCOPE_IDENTITY() returns the last inserted ID
      movementId = movementResults && movementResults.length > 0 ? movementResults[0].movement_id : null;
      
      if (!movementId) {
        console.error(`❌ Failed to retrieve movement_id from insert result:`, movementResults);
        await transaction.rollback();
        return res.status(500).json({ 
          error: 'Failed to create stock movement',
          details: 'Could not retrieve movement_id after insert'
        });
      }

      console.log(`   ✓ Stock movement created with ID: ${movementId}`);
    } catch (stockErr) {
      console.error(`   ❌ Error creating stock movement:`, stockErr.message);
      console.error(`   Stack:`, stockErr.stack);
      await transaction.rollback();
      return res.status(500).json({ 
        error: 'Failed to create stock movement',
        message: stockErr.message
      });
    }

    // STEP 3: Process each item
    console.log(`\n3️⃣ PROCESSING ITEMS AND UPDATING INVENTORY`);
    
    for (let itemIdx = 0; itemIdx < items.length; itemIdx++) {
      try {
        const item = items[itemIdx];
        const { id, spare_id, requested_qty, PART, DESCRIPTION } = item;

        // Get approved qty from frontend data, or use requested_qty if not provided
        const approvedQty = approvedQtys[itemIdx] !== undefined ? Math.min(approvedQtys[itemIdx], requested_qty) : requested_qty;

        if (approvedQty <= 0) {
          console.log(`\n   Item ${id}: ${PART} (${DESCRIPTION})`);
          console.log(`      ⏭️  Skipped - No quantities approved (0/${requested_qty})`);
          continue;
        }

        console.log(`\n   Item ${id}: ${PART} (${DESCRIPTION})`);
        console.log(`      Approved: ${approvedQty}/${requested_qty} units`);

        // 3a. Update spare_request_items - set approved_qty to the user-approved quantity
        await sequelize.query(`
          UPDATE spare_request_items
          SET approved_qty = ?, updated_at = GETDATE()
          WHERE id = ?
        `, {
          replacements: [approvedQty, id],
          type: QueryTypes.UPDATE,
          transaction
        });
        console.log(`      ✓ Updated approved_qty = ${approvedQty}`);

        // 3b. Create goods_movement_items (use approved qty, not requested qty)
        try {
          const gmiInsert = await sequelize.query(`
            INSERT INTO goods_movement_items (movement_id, spare_part_id, qty, condition, created_at, updated_at)
            VALUES (?, ?, ?, 'good', GETDATE(), GETDATE())
          `, {
            replacements: [movementId, spare_id, approvedQty],
            type: QueryTypes.INSERT,
            transaction
          });
          console.log(`      ✓ Created goods_movement_item: ${approvedQty} units`, {
            movementId,
            spareId: spare_id,
            qty: approvedQty
          });
        } catch (gmiErr) {
          console.error(`      ❌ Error creating goods_movement_item:`, gmiErr.message);
          throw gmiErr;
        }

        // 3c. Reduce technician inventory (from technician location) - use approved qty
        const techUpdateResult = await sequelize.query(`
          UPDATE spare_inventory
          SET qty_good = qty_good - ?, updated_at = GETDATE()
          WHERE spare_id = ? AND location_type = 'technician' AND location_id = ?
        `, {
          replacements: [approvedQty, spare_id, technicianId],
          type: QueryTypes.UPDATE,
          transaction
        });
        console.log(`      ✓ Technician inventory reduced: -${approvedQty}`);

        // 3d. Increase service center inventory (add to service center location)
        const [scInvCheck] = await sequelize.query(`
          SELECT spare_inventory_id FROM spare_inventory
          WHERE spare_id = ? AND location_type = 'service_center' AND location_id = ?
        `, {
          replacements: [spare_id, serviceCenterId],
          type: QueryTypes.SELECT,
          transaction
        });

        if (scInvCheck && scInvCheck.spare_inventory_id) {
          // Update existing SC inventory
          await sequelize.query(`
            UPDATE spare_inventory
            SET qty_good = qty_good + ?, updated_at = GETDATE()
            WHERE spare_id = ? AND location_type = 'service_center' AND location_id = ?
          `, {
            replacements: [approvedQty, spare_id, serviceCenterId],
            type: QueryTypes.UPDATE,
            transaction
          });
          console.log(`      ✓ Service center inventory updated: +${approvedQty}`);
        } else {
          // Create new SC inventory
          await sequelize.query(`
            INSERT INTO spare_inventory (spare_id, location_type, location_id, qty_good, qty_defective, created_at, updated_at)
            VALUES (?, 'service_center', ?, ?, 0, GETDATE(), GETDATE())
          `, {
            replacements: [spare_id, serviceCenterId, approvedQty],
            type: QueryTypes.INSERT,
            transaction
          });
          console.log(`      ✓ Service center inventory created: +${approvedQty}`);
        }

        processedCount++;
      } catch (itemErr) {
        console.error(`      ❌ Error processing item:`, itemErr.message);
        await transaction.rollback();
        throw itemErr;
      }
    }

    // STEP 4: Update return request status to approved
    console.log(`\n4️⃣ UPDATING REQUEST STATUS`);
    await sequelize.query(`
      UPDATE spare_requests
      SET status_id = ?, updated_at = GETDATE()
      WHERE request_id = ?
    `, {
      replacements: [approvedStatusId, requestId],
      type: QueryTypes.UPDATE,
      transaction
    });
    console.log(`   ✓ Return request status updated to 'approved'`);

    // Commit transaction
    await transaction.commit();
    console.log(`\n✅ APPROVAL PROCESS COMPLETED SUCCESSFULLY`);
    console.log(`   - Approval record created`);
    console.log(`   - Stock movement: ${movementId}`);
    console.log(`   - Items processed: ${processedCount}`);
    console.log(`   - Total qty transferred: ${totalQty}`);

    res.json({
      success: true,
      message: `✅ Return request approved successfully!`,
      returnRequestId: requestId,
      approvalId: `APR-${requestId}`,
      stockMovementId: movementId,
      itemsProcessed: processedCount,
      totalQtyApproved: totalQty,
      approvalRemarks: approvalRemarks || '',
      detail: `Transferred ${totalQty} items from technician ${technicianId} to service center ${serviceCenterId}`,
      summary: {
        approvalCreated: true,
        inventoryUpdated: true,
        stockMovementCreated: true,
        goodsMovementCreated: true
      }
    });

  } catch (err) {
    await transaction.rollback();
    console.error('❌ APPROVAL PROCESS FAILED:', err);
    res.status(500).json({
      error: 'Failed to approve return request',
      message: err.message,
      details: err.stack
    });
  }
});

/**
 * POST /api/spare-requests/approve-return (LEGACY - for compatibility)
 * RSM/ASC Approval of rental returns
 * Creates stock_movement and goods_movement_items, updates inventory
 * 
 * Request body:
 * {
 *   technicianId: number,
 *   serviceCenterId: number,
 *   items: [
 *     {
 *       spareId: number,
 *       sku: string,
 *       name: string,
 *       goodQty: number,
 *       defectiveQty: number
 *     }
 *   ],
 *   approvalRemarks: string (optional)
 * }
 */
router.post('/approve-return', optionalAuthenticate, async (req, res) => {
  try {
    const { technicianId, serviceCenterId, items, approvalRemarks } = req.body;

    // Validate input
    if (!technicianId || !serviceCenterId || !items || items.length === 0) {
      return res.status(400).json({
        error: 'Missing required fields: technicianId, serviceCenterId, and items[] are mandatory'
      });
    }

    console.log(`📋 Approving return from technician ${technicianId} to service center ${serviceCenterId}`);

    let totalQty = 0;
    let itemsDetail = [];

    // Calculate total and collect items  
    for (const item of items) {
      const qty = (item.goodQty || 0) + (item.defectiveQty || 0);
      totalQty += qty;
      itemsDetail.push({
        spareId: item.spareId,
        sku: item.sku,
        name: item.name,
        goodQty: item.goodQty || 0,
        defectiveQty: item.defectiveQty || 0,
        totalQty: qty
      });
    }

    // Create stock_movement record
    const [stockMovement] = await sequelize.query(`
      INSERT INTO stock_movement 
      (movement_type, reference_type, reference_no, source_location_type, source_location_id, 
       destination_location_type, destination_location_id, total_qty, movement_date, created_by, status, created_at, updated_at)
      VALUES ('return', 'return_request', ?, 'technician', ?, 'service_center', ?, ?, GETDATE(), ?, 'pending', GETDATE(), GETDATE())
    `, {
      replacements: [
        `RET-APPROVED-${Date.now()}`,
        technicianId,
        serviceCenterId,
        totalQty,
        req.user?.id || null  // Use null if user not available
      ],
      type: QueryTypes.INSERT
    });

    // Get the inserted movement ID
    const [movementResult] = await sequelize.query(`
      SELECT IDENT_CURRENT('stock_movement') AS movement_id
    `, { type: QueryTypes.SELECT });

    const movementId = movementResult.movement_id;
    console.log(`✓ Stock movement created: ${movementId}`);

    // Create goods_movement_items for each item
    for (const item of itemsDetail) {
      // Good items
      if (item.goodQty > 0) {
        await sequelize.query(`
          INSERT INTO goods_movement_items (movement_id, spare_part_id, qty, condition, created_at, updated_at)
          VALUES (?, ?, ?, 'good', GETDATE(), GETDATE())
        `, {
          replacements: [movementId, item.spareId, item.goodQty],
          type: QueryTypes.INSERT
        });
        console.log(`✓ Created good movement item: ${item.sku} x${item.goodQty}`);
      }

      // Defective items
      if (item.defectiveQty > 0) {
        await sequelize.query(`
          INSERT INTO goods_movement_items (movement_id, spare_part_id, qty, condition, created_at, updated_at)
          VALUES (?, ?, ?, 'defective', GETDATE(), GETDATE())
        `, {
          replacements: [movementId, item.spareId, item.defectiveQty],
          type: QueryTypes.INSERT
        });
        console.log(`✓ Created defective movement item: ${item.sku} x${item.defectiveQty}`);
      }

      // Update service center inventory (add received items)
      const [scInvCheck] = await sequelize.query(`
        SELECT spare_inventory_id FROM spare_inventory
        WHERE spare_id = ? AND location_type = 'service_center' AND location_id = ?
      `, {
        replacements: [item.spareId, serviceCenterId],
        type: QueryTypes.SELECT
      });

      // First, reduce technician inventory BEFORE service center updates
      const techUpdateResult = await sequelize.query(`
        UPDATE spare_inventory
        SET qty_good = qty_good - ?,
            qty_defective = qty_defective - ?,
            updated_at = GETDATE()
        WHERE spare_id = ? AND location_type = 'technician' AND location_id = ?
      `, {
        replacements: [item.goodQty, item.defectiveQty, item.spareId, technicianId],
        type: QueryTypes.UPDATE
      });
      console.log(`✓ Reduced technician inventory for spare ${item.spareId}: good -${item.goodQty}, defective -${item.defectiveQty}`);

      if (scInvCheck && scInvCheck.spare_inventory_id) {
        // Update existing
        await sequelize.query(`
          UPDATE spare_inventory
          SET qty_good = qty_good + ?,
              qty_defective = qty_defective + ?,
              updated_at = GETDATE()
          WHERE spare_id = ? AND location_type = 'service_center' AND location_id = ?
        `, {
          replacements: [item.goodQty, item.defectiveQty, item.spareId, serviceCenterId],
          type: QueryTypes.UPDATE
        });
        console.log(`✓ Updated service center inventory for ${item.sku}`);
      } else {
        // Create new
        await sequelize.query(`
          INSERT INTO spare_inventory (spare_id, location_type, location_id, qty_good, qty_defective, created_at, updated_at)
          VALUES (?, 'service_center', ?, ?, ?, GETDATE(), GETDATE())
        `, {
          replacements: [item.spareId, serviceCenterId, item.goodQty, item.defectiveQty],
          type: QueryTypes.INSERT
        });
        console.log(`✓ Created new service center inventory for ${item.sku}`);
      }
    }

    res.json({
      success: true,
      message: `Return approved successfully. ${totalQty} items moved from technician to service center`,
      stockMovementId: movementId,
      totalQtyApproved: totalQty,
      itemsApproved: itemsDetail.length,
      approvalRemarks: approvalRemarks || ''
    });

  } catch (err) {
    console.error('Error approving return:', err);
    res.status(500).json({
      error: 'Failed to approve return',
      message: err.message
    });
  }
});

/**
 * NEW BUCKET SYSTEM ENDPOINTS
 * Integrated spare request creation with automatic bucket tracking
 */

/**
 * GET /api/spare-requests/bucket-inventory/:spareId/:locationType/:locationId
 * Get current bucket quantities for a spare at a location
 */
router.get('/bucket-inventory/:spareId/:locationType/:locationId', authenticateToken, async (req, res) => {
  try {
    const { spareId, locationType, locationId } = req.params;

    const summary = await getBucketSummary(
      parseInt(spareId),
      locationType,
      parseInt(locationId)
    );

    res.json({
      success: true,
      data: summary,
      message: `Inventory for spare ${spareId} at ${locationType}/${locationId}`
    });
  } catch (error) {
    console.error('❌ Error fetching bucket inventory:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch bucket inventory',
      details: error.message
    });
  }
});

/**
 * GET /api/spare-requests/check-availability
 * Check if spare is available before creating request
 */
router.get('/check-availability', authenticateToken, async (req, res) => {
  try {
    const { spareId, quantity, locationType, locationId } = req.query;

    if (!spareId || !quantity || !locationType || !locationId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: spareId, quantity, locationType, locationId'
      });
    }

    const validation = await validateBucketOperation(
      parseInt(spareId),
      locationType,
      parseInt(locationId),
      parseInt(quantity)
    );

    res.json({
      success: true,
      data: validation
    });
  } catch (error) {
    console.error('❌ Error validating availability:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check availability',
      details: error.message
    });
  }
});

/**
 * POST /api/spare-requests/create-with-bucket
 * Create a spare request with automatic bucket movements
 * 
 * Body:
 * {
 *   spare_request_type: "CFU" | "TECH_ISSUE" | "TECH_RETURN_DEFECTIVE" | "ASC_RETURN_DEFECTIVE" | "ASC_RETURN_EXCESS" | "BRANCH_PICKUP",
 *   spare_id: number,
 *   quantity: number,
 *   requested_by: number,
 *   source_location_type: "warehouse" | "branch" | "service_center" | "technician",
 *   source_location_id: number,
 *   destination_location_type: "warehouse" | "branch" | "service_center" | "technician",
 *   destination_location_id: number,
 *   reason: string (optional - will auto-determine type),
 *   notes: string (optional)
 * }
 */
router.post('/create-with-bucket', authenticateToken, async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      spare_request_type,
      reason,
      spare_id,
      quantity,
      requested_by,
      source_location_type,
      source_location_id,
      destination_location_type,
      destination_location_id,
      notes
    } = req.body;

    // Validate request type
    let finalRequestType = spare_request_type;
    if (!finalRequestType && reason) {
      finalRequestType = determineRequestType(reason, source_location_type);
    }

    if (!Object.values(SPARE_REQUEST_TYPES).includes(finalRequestType)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: `Invalid spare_request_type: ${finalRequestType}`
      });
    }

    // Validate if spare exists
    const spare = await sequelize.query(
      'SELECT Id, PART, DESCRIPTION FROM spare_parts WHERE Id = ?',
      {
        replacements: [spare_id],
        type: sequelize.QueryTypes.SELECT,
        transaction
      }
    );

    if (!spare || spare.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ 
        success: false,
        error: `Spare ${spare_id} not found` 
      });
    }

    // For DECREASE operations, validate stock availability
    const movementTypes = SPARE_REQUEST_TO_MOVEMENTS[finalRequestType] || [];
    for (const movementType of movementTypes) {
      const isDecrease = movementType.includes('OUT');

      if (isDecrease) {
        const validation = await validateBucketOperation(
          spare_id,
          source_location_type,
          source_location_id,
          quantity
        );

        if (!validation.valid) {
          await transaction.rollback();
          return res.status(400).json({
            success: false,
            error: validation.message,
            available: validation.available,
            requested: quantity
          });
        }
      }
    }

    // Create the spare request
    const request = await SpareRequest.create(
      {
        spare_request_type: finalRequestType,
        spare_id: spare_id,
        quantity: quantity,
        requested_by: requested_by,
        approved_status: 'pending',
        status: 'open',
        notes: notes || null,
        request_reason: reason || finalRequestType,
        requested_source_type: source_location_type,
        requested_source_id: source_location_id,
        requested_to_type: destination_location_type,
        requested_to_id: destination_location_id,
        created_at: new Date()
      },
      { transaction }
    );

    console.log(`✅ Created spare request ${request.request_id} (${finalRequestType})`);

    // Create stock movements
    const movements = [];
    for (const movementType of movementTypes) {
      try {
        const movementData = {
          stock_movement_type: movementType,
          spare_id: spare_id,
          total_qty: quantity,
          reference_type: 'spare_request',
          reference_no: `SR-${request.request_id}`,
          source_location_type: source_location_type,
          source_location_id: source_location_id,
          destination_location_type: destination_location_type,
          destination_location_id: destination_location_id,
          status: 'completed'
        };

        const result = await processMovement(movementData);

        movements.push({
          movement_id: result.movement.movement_id,
          stock_movement_type: movementType,
          bucket: result.bucketUpdate.bucket,
          operation: result.bucketUpdate.operation,
          quantity: quantity
        });

        console.log(`✅ Movement ${movementType}: ${result.bucketUpdate.bucket} (${result.bucketUpdate.operation})`);
      } catch (err) {
        console.error(`❌ Error creating movement ${movementType}:`, err.message);
        await transaction.rollback();
        return res.status(500).json({
          success: false,
          error: `Failed to create movement: ${err.message}`
        });
      }
    }

    // Commit transaction
    await transaction.commit();

    res.status(201).json({
      success: true,
      request: {
        request_id: request.request_id,
        spare_request_type: finalRequestType,
        spare_id: spare_id,
        spare_code: spare[0].PART,
        spare_name: spare[0].DESCRIPTION,
        quantity: quantity,
        status: 'open',
        created_at: request.created_at,
        movements: movements,
        type_description: SPARE_REQUEST_TYPE_DESCRIPTIONS?.[finalRequestType] || finalRequestType
      },
      message: `Spare request created with ${movements.length} movements`
    });
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error creating spare request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create spare request',
      details: error.message
    });
  }
});

/**
 * GET /api/spare-requests/types/all
 * Get all available spare request types with descriptions
 */
router.get('/types/all', (req, res) => {
  const types = Object.entries(SPARE_REQUEST_TYPES || {}).map(([key, value]) => ({
    value: value,
    label: value,
    description: SPARE_REQUEST_TYPE_DESCRIPTIONS?.[value] || value
  }));

  res.json({
    success: true,
    data: types
  });
});

export default router;