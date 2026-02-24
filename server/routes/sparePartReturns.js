import express from 'express';
import { sequelize } from '../db.js';
import { Op } from 'sequelize';
import { 
  SpareRequest, 
  SpareRequestItem, 
  Status, 
  Users, 
  StockMovement,
  GoodsMovementItems,
  LogisticsDocuments,
  LogisticsDocumentItems,
  SparePart,
  ServiceCenter,
  Plant,
  SpareInventory
} from '../models/index.js';
import { authenticateToken } from '../middleware/auth.js';
import { QueryTypes } from 'sequelize';

const router = express.Router();

/**
 * GET /api/spare-returns/inventory
 * Fetch service center's spare inventory with product hierarchy details
 * Used to filter dropdowns to show only items actually in inventory
 */
router.get('/inventory', authenticateToken, async (req, res) => {
  let startTime = Date.now();
  try {
    const centerId = req.user?.centerId;
    console.log(`\n🔍 [INVENTORY API] Fetching inventory for centerId: ${centerId}`);

    if (!centerId) {
      console.log('❌ [INVENTORY API] No centerId provided');
      return res.status(400).json({ error: 'Service center ID required' });
    }

    console.log(`⏳ [INVENTORY API] Starting database query...`);
    startTime = Date.now();

    // Query spare inventory - simple approach to avoid timeout
    const inventory = await sequelize.query(`
      SELECT
        si.spare_inventory_id,
        si.spare_id,
        si.qty_good,
        si.qty_defective,
        sp.Id,
        sp.PART,
        sp.DESCRIPTION,
        sp.ModelID,
        sp.BRAND,
        sp.MODEL_DESCRIPTION
      FROM spare_inventory si
      INNER JOIN spare_parts sp ON si.spare_id = sp.Id
      WHERE si.location_type = 'service_center' 
        AND si.location_id = ?
        AND si.qty_good > 0
    `, { 
      replacements: [centerId],
      type: QueryTypes.SELECT,
      timeout: 30000
    });

    const queryTime = Date.now() - startTime;
    console.log(`✅ [INVENTORY API] Basic query completed in ${queryTime}ms, got ${inventory?.length || 0} items`);

    // Now fetch hierarchy separately if we have items
    let hierarchyData = {};
    if (Array.isArray(inventory) && inventory.length > 0) {
      console.log(`⏳ [INVENTORY API] Fetching hierarchy for ${inventory.length} items...`);
      const hierarchyStart = Date.now();
      
      const uniqueModelIds = [...new Set(inventory.map(i => i.ModelID).filter(Boolean))];
      if (uniqueModelIds.length > 0) {
        const hierarchyQuery = await sequelize.query(`
          SELECT DISTINCT
            pm.Id as modelId,
            pm.MODEL_CODE,
            pm.MODEL_DESCRIPTION,
            prod.ID as productId,
            prod.VALUE as productName,
            pg.Id as groupId,
            pg.VALUE as groupName
          FROM ProductModels pm
          LEFT JOIN ProductMaster prod ON pm.ProductID = prod.ID
          LEFT JOIN ProductGroups pg ON prod.Product_group_ID = pg.Id
          WHERE pm.Id IN (${uniqueModelIds.map(() => '?').join(',')})
        `, { 
          replacements: uniqueModelIds,
          type: QueryTypes.SELECT,
          timeout: 30000
        });

        hierarchyQuery.forEach(h => {
          hierarchyData[h.modelId] = h;
        });
        console.log(`✅ [INVENTORY API] Hierarchy fetched in ${Date.now() - hierarchyStart}ms`);
      }
    }

    // Organize inventory by group, product, model hierarchy
    const inventoryMap = {};
    
    if (Array.isArray(inventory) && inventory.length > 0) {
      inventory.forEach(item => {
        const hierarchy = hierarchyData[item.ModelID] || {};
        const groupId = hierarchy.groupId || 'unknown';
        const prodId = hierarchy.productId || 'unknown';
        const modelId = item.ModelID || 'unknown';
        const spareId = item.spare_id;

        if (!inventoryMap[groupId]) {
          inventoryMap[groupId] = {
            groupId,
            groupName: hierarchy.groupName || 'Unknown Group',
            products: {}
          };
        }

        if (!inventoryMap[groupId].products[prodId]) {
          inventoryMap[groupId].products[prodId] = {
            productId: prodId,
            productName: hierarchy.productName || 'Unknown Product',
            models: {}
          };
        }

        if (!inventoryMap[groupId].products[prodId].models[modelId]) {
          inventoryMap[groupId].products[prodId].models[modelId] = {
            modelId,
            modelCode: hierarchy.MODEL_CODE,
            modelDescription: hierarchy.MODEL_DESCRIPTION,
            spares: {}
          };
        }

        inventoryMap[groupId].products[prodId].models[modelId].spares[spareId] = {
          spareId,
          partCode: item.PART,
          partDescription: item.DESCRIPTION,
          totalQty: (item.qty_good || 0) + (item.qty_defective || 0),
          goodQty: item.qty_good || 0,
          defectiveQty: item.qty_defective || 0
        };
      });
    }

    console.log(`✅ [INVENTORY API] Organized ${Object.keys(inventoryMap).length} groups`);

    res.json({
      success: true,
      inventoryMap,
      items: inventory || [],
      totalItems: inventory?.length || 0
    });

  } catch (err) {
    const elapsed = Date.now() - startTime;
    console.error(`❌ [INVENTORY API] Error after ${elapsed}ms:`, err.message);
    res.status(500).json({ 
      error: 'Failed to fetch service center inventory', 
      message: err.message 
    });
  }
});

/**
 * GET /api/spare-returns/list
 * Get all spare return requests for the current service center
 */
router.get('/list', authenticateToken, async (req, res) => {
  try {
    const centerId = req.user?.centerId;

    console.log(`📋 Fetching return requests for service center: ${centerId}`);

    if (!centerId) {
      return res.status(400).json({ error: 'Service center ID required' });
    }

    // Get all return requests for this service center
    // Return requests have reason: 'defect', 'bulk', 'replacement', or 'msl'
    const requests = await SpareRequest.findAll({
      where: {
        requested_source_type: 'service_center',
        requested_source_id: centerId,
        request_reason: {
          [Op.in]: ['defect', 'bulk', 'replacement', 'msl']
        }
      },
      include: [
        {
          model: Status,
          as: 'status',
          attributes: ['status_id', 'status_name']
        },
        {
          model: SpareRequestItem,
          as: 'SpareRequestItems',
          attributes: ['id', 'spare_id', 'requested_qty', 'approved_qty'],
          required: false
        }
      ],
      order: [['created_at', 'DESC']],
      attributes: ['request_id', 'spare_request_type', 'created_at', 'updated_at', 'status_id', 'created_by']
    });

    // Format response
    const formattedRequests = await Promise.all(
      requests.map(async (req) => {
        let statusName = 'Pending';
        if (req.status && req.status.status_name) {
          statusName = req.status.status_name.charAt(0).toUpperCase() + req.status.status_name.slice(1);
        }

        return {
          requestId: req.request_id,
          requestNumber: `SPR-${req.request_id}`,
          spareRequestType: req.spare_request_type,
          status: statusName,
          createdAt: req.created_at,
          updatedAt: req.updated_at,
          itemCount: req.SpareRequestItems?.length || 0,
          totalQty: (req.SpareRequestItems || []).reduce((sum, item) => sum + (item.requested_qty || 0), 0)
        };
      })
    );

    console.log(`✅ Found ${formattedRequests.length} return requests`);

    res.json({
      success: true,
      requests: formattedRequests,
      totalCount: formattedRequests.length
    });
  } catch (err) {
    console.error('❌ Error fetching return requests:', err);
    res.status(500).json({
      error: 'Failed to fetch return requests',
      message: err.message
    });
  }
});

/**
 * GET /api/spare-returns/dcf-requests
 * Fetch service center's spare return requests for DCF status page
 * Returns data in DCF-compatible format
 */
router.get('/dcf-requests', authenticateToken, async (req, res) => {
  try {
    const centerId = req.user?.centerId;

    if (!centerId) {
      return res.status(400).json({ error: 'Service center ID required' });
    }

    console.log(`📊 Fetching DCF format spare return requests for centerId: ${centerId}`);

    // Get all spare return requests for this service center with items
    const requests = await SpareRequest.findAll({
      where: { requested_source_id: centerId, requested_source_type: 'service_center' },
      include: [
        {
          association: 'status',
          model: Status,
          attributes: ['status_id', 'status_name']
        },
        {
          association: 'SpareRequestItems',
          model: SpareRequestItem,
          attributes: ['id', 'spare_id', 'requested_qty', 'approved_qty'],
          required: false
        }
      ],
      order: [['created_at', 'DESC']],
      raw: false
    });

    // Format response for DCF page
    const dcfRequests = requests.map((req) => {
      const items = req.SpareRequestItems || [];
      const totalQty = items.reduce((sum, item) => sum + (item.requested_qty || 0), 0);
      const approvedQty = items.reduce((sum, item) => sum + (item.approved_qty || 0), 0);
      
      return {
        id: req.request_id,
        dcfNo: `SPR-${req.request_id}`,
        totalDcfQty: totalQty,
        rsmApprovedQty: approvedQty,  // This is RSM approved qty
        dcfSubmitDate: req.created_at,
        cfReceiptDate: null,  // Will be set when received
        cfApprovalDate: req.updated_at,  // Updated when approved/rejected
        cnDate: null,
        cnValue: null,
        cnCount: 0,
        status: req.status?.status_name || 'pending',
        items: items
      };
    });

    console.log(`✅ Found ${dcfRequests.length} DCF format spare return requests`);

    res.json(dcfRequests);
  } catch (err) {
    console.error('❌ Error fetching DCF spare return requests:', err);
    res.status(500).json({
      error: 'Failed to fetch DCF spare return requests',
      message: err.message
    });
  }
});

/**
 * POST /api/spare-returns/create
 * Create a new spare part return request from ASC to Plant
 */
router.post('/create', authenticateToken, async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { items, returnType, productGroup, product, model } = req.body;
    const userId = req.user?.id;
    const centerId = req.user?.centerId;
    const userRole = req.user?.role;

    console.log('📤 Creating spare return request:', { centerId, returnType, itemCount: items?.length });

    if (!items || !Array.isArray(items) || items.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Items array is required' });
    }

    if (!centerId) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Service center ID required' });
    }

    // Get service center details
    const sc = await ServiceCenter.findByPk(centerId, { transaction });
    if (!sc || !sc.plant_id) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Plant routing not configured for this service center' });
    }

    // Get 'Pending' status
    let statusRow = await Status.findOne({ where: { status_name: 'pending' }, transaction });
    if (!statusRow) {
      statusRow = await Status.create({ status_name: 'pending' }, { transaction });
    }

    // Map return type to valid request_type and request_reason
    const typeMapping = {
      'defect': { request_type: 'normal', request_reason: 'defect' },
      'bulk': { request_type: 'bulk', request_reason: 'bulk' },
      'replacement': { request_type: 'replacement', request_reason: 'replacement' }
    };
    const typeMap = typeMapping[returnType] || { request_type: 'normal', request_reason: 'defect' };

    // Create the spare return request
    const returnRequest = await SpareRequest.create({
      request_type: typeMap.request_type,
      requested_source_type: 'service_center',
      requested_source_id: centerId,
      requested_to_type: 'warehouse',  // Plant is treated as warehouse in the system
      requested_to_id: sc.plant_id,
      request_reason: typeMap.request_reason,
      status_id: statusRow.status_id,
      created_by: userId
    }, { transaction });

    // Create line items
    const requestItems = [];
    let totalQty = 0;
    let totalAmount = 0;

    console.log('📋 Processing items:', JSON.stringify(items, null, 2));

    for (const item of items) {
      const { spareId, returnQty, remainingQty } = item;

      console.log(`  Item: spareId=${spareId}, returnQty=${returnQty}`);

      // Check for null/undefined and ensure returnQty is a valid number
      if (spareId === null || spareId === undefined || returnQty === null || returnQty === undefined || parseInt(returnQty) <= 0) {
        console.log(`  ❌ Skipping: invalid spareId or returnQty`);
        continue;
      }

      const requestItem = await SpareRequestItem.create({
        request_id: returnRequest.request_id,
        spare_id: parseInt(spareId),
        requested_qty: parseInt(returnQty),
        approved_qty: 0
      }, { transaction });

      // Calculate item amount for stock movement
      const sparePart = await SparePart.findByPk(parseInt(spareId), { transaction });
      const itemAmount = (sparePart?.SAP_PRICE || 0) * parseInt(returnQty);
      totalAmount += itemAmount;

      requestItems.push({
        ...requestItem.toJSON(),
        remainingQty
      });

      totalQty += parseInt(returnQty);
    }

    console.log(`✅ Processed ${requestItems.length} valid items out of ${items.length}`);

    if (requestItems.length === 0) {
      await transaction.rollback();
      console.error('❌ No valid items could be created. Input items:', JSON.stringify(items, null, 2));
      return res.status(400).json({ error: 'No valid items in request', details: 'All items were rejected during processing' });
    }

    // Create stock movement record for the return request
    console.log(`📊 Creating stock movement for return request ${returnRequest.request_id}`);
    
    const stockMovement = await StockMovement.create({
      stock_movement_type: 'ASC_RETURN_DEFECTIVE_OUT',
      reference_type: 'return_request',
      reference_no: `SPR-${returnRequest.request_id}`,
      source_location_type: 'service_center',
      source_location_id: centerId,
      destination_location_type: 'warehouse',
      destination_location_id: 1000 + sc.plant_id,  // Apply 1000+ offset for warehouse location
      total_qty: totalQty,
      total_amount: totalAmount,
      movement_date: new Date(),
      created_by: userId,
      status: 'pending'
    }, { transaction });

    console.log(`✅ Stock movement ${stockMovement.movement_id} created for return request`);

    // Update inventory for both source and destination
    console.log(`📦 Updating inventory for source and destination locations`);
    
    for (const item of items) {
      const { spareId, returnQty } = item;
      const qty = parseInt(returnQty);

      if (qty <= 0) continue;

      // Update source inventory (service center) - reduce qty_good
      const sourceInventory = await SpareInventory.findOne({
        where: {
          spare_id: parseInt(spareId),
          location_type: 'service_center',
          location_id: centerId
        },
        transaction
      });

      if (sourceInventory) {
        const newQtyGood = Math.max(0, (sourceInventory.qty_good || 0) - qty);
        await sourceInventory.update(
          { qty_good: newQtyGood },
          { transaction }
        );
        console.log(`  📉 Source (SC ${centerId}): Spare ${spareId} qty_good reduced by ${qty} (new qty: ${newQtyGood})`);
      } else {
        console.warn(`  ⚠️  Source inventory not found for spare ${spareId} at service center ${centerId}`);
      }

      // Update destination inventory (warehouse/plant) - increase qty_good
      // Note: Warehouse location_id uses 1000+ offset (plant_id=1 → warehouse location_id=1001)
      const warehouseLocationId = 1000 + sc.plant_id;
      let destInventory = await SpareInventory.findOne({
        where: {
          spare_id: parseInt(spareId),
          location_type: 'warehouse',
          location_id: warehouseLocationId
        },
        transaction
      });

      if (destInventory) {
        const newQtyGood = (destInventory.qty_good || 0) + qty;
        await destInventory.update(
          { qty_good: newQtyGood },
          { transaction }
        );
        console.log(`  📈 Destination (Warehouse location ${warehouseLocationId}): Spare ${spareId} qty_good increased by ${qty} (new qty: ${newQtyGood})`);
      } else {
        // Create new inventory record if it doesn't exist
        destInventory = await SpareInventory.create({
          spare_id: parseInt(spareId),
          location_type: 'warehouse',
          location_id: warehouseLocationId,  // Use 1000+ offset
          qty_good: qty,
          qty_defective: 0
        }, { transaction });
        console.log(`  ➕ Destination inventory created for spare ${spareId} at warehouse location ${warehouseLocationId} with qty: ${qty}`);
      }
    }

    console.log(`✅ Inventory updated for all items`);

    await transaction.commit();

    // Return response with request ID
    console.log(`✅ Created return request ID: ${returnRequest.request_id}`);

    res.status(201).json({
      success: true,
      message: 'Spare return request created successfully with inventory updates',
      returnRequest: {
        requestId: returnRequest.request_id,
        requestNumber: `SPR-${returnRequest.request_id}`,
        status: 'pending',
        createdAt: returnRequest.created_at,
        itemCount: requestItems.length,
        totalQty: totalQty,
        totalAmount: totalAmount,
        items: requestItems,
        stockMovementId: stockMovement.movement_id
      }
    });
  } catch (err) {
    await transaction.rollback();
    console.error('❌ Error creating spare return request:', err);
    res.status(500).json({
      error: 'Failed to create return request',
      message: err.message
    });
  }
});

/**
 * GET /api/spare-returns/view/:requestId
 * View cart - get return request details
 */
router.get('/view/:requestId', authenticateToken, async (req, res) => {
  try {
    const { requestId } = req.params;
    const centerId = req.user?.centerId;

    console.log(`📋 Fetching return request: ${requestId}`);

    const request = await SpareRequest.findByPk(parseInt(requestId), {
      include: [
        {
          model: SpareRequestItem,
          as: 'SpareRequestItems',
          required: false
        }
      ]
    });

    if (!request) {
      return res.status(404).json({ error: 'Return request not found' });
    }

    // Get status name
    const status = await Status.findByPk(request.status_id);
    const statusName = status?.status_name || 'pending';

    // Get details for each item
    const itemsWithDetails = await Promise.all(
      (request.SpareRequestItems || []).map(async (item) => {
        const sparePart = await SparePart.findByPk(item.spare_id);
        return {
          id: item.id,
          spareId: item.spare_id,
          partCode: sparePart?.PART || 'N/A',
          partDescription: sparePart?.DESCRIPTION || 'Unknown',
          returnQty: item.requested_qty,
          approvedQty: item.approved_qty || 0
        };
      })
    );

    res.json({
      success: true,
      request: {
        requestId: request.request_id,
        requestNumber: `SPR-${request.request_id}`,
        status: statusName,
        createdAt: request.created_at,
        createdBy: request.created_by,
        items: itemsWithDetails,
        totalQty: itemsWithDetails.reduce((sum, item) => sum + item.returnQty, 0)
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
 * GET /api/spare-returns/challan/:requestId
 * Get challan details for a return request
 */
router.get('/challan/:requestId', authenticateToken, async (req, res) => {
  try {
    const { requestId } = req.params;
    const centerId = req.user?.centerId;

    console.log(`📄 Fetching challan for request: ${requestId}, centerId: ${centerId}`);

    const request = await SpareRequest.findByPk(parseInt(requestId), {
      include: [
        {
          model: Status,
          as: 'status',
          attributes: ['status_id', 'status_name']
        },
        {
          model: SpareRequestItem,
          as: 'SpareRequestItems',
          required: false
        }
      ]
    });

    if (!request) {
      return res.status(404).json({ error: 'Return request not found' });
    }

    // Verify ownership
    if (request.requested_source_id !== centerId) {
      return res.status(403).json({ error: 'Unauthorized to view this request' });
    }

    console.log(`  Fetching service center details for centerId: ${centerId}`);

    // Get service center details using raw SQL to avoid model issues
    let scName = 'Unknown';
    let scEmail = '';
    let scPhone = '';

    try {
      const scData = await sequelize.query(
        'SELECT asc_name, email, mobile_no FROM service_centers WHERE asc_id = ?',
        { replacements: [centerId], type: QueryTypes.SELECT }
      );
      
      if (scData && scData.length > 0) {
        scName = scData[0].asc_name || 'Unknown';
        scEmail = scData[0].email || '';
        scPhone = scData[0].mobile_no || '';
        console.log(`  ✅ Got SC details: ${scName}`);
      } else {
        console.log(`  ⚠️ No service center found for centerId: ${centerId}`);
      }
    } catch (scErr) {
      console.warn(`  ⚠️ Couldn't fetch service center:`, scErr.message);
    }

    // Get details for each item
    const items = await Promise.all(
      (request.SpareRequestItems || []).map(async (item, idx) => {
        try {
          const sparePart = await SparePart.findByPk(item.spare_id);
          let modelCode = 'N/A';
          let modelDescription = 'N/A';

          // Try to fetch ProductModels if available
          if (sparePart?.ModelID) {
            try {
              const model = await sequelize.query(
                'SELECT MODEL_CODE, MODEL_DESCRIPTION FROM ProductModels WHERE Id = ?',
                { replacements: [sparePart.ModelID], type: QueryTypes.SELECT }
              );
              if (model && model.length > 0) {
                modelCode = model[0].MODEL_CODE || 'N/A';
                modelDescription = model[0].MODEL_DESCRIPTION || 'N/A';
              }
            } catch (modelErr) {
              console.warn(`⚠️ Could not fetch model details for product model ${sparePart.ModelID}:`, modelErr.message);
            }
          }

          return {
            srNo: idx + 1,
            partCode: sparePart?.PART || 'N/A',
            partDescription: sparePart?.DESCRIPTION || 'Unknown',
            modelCode: modelCode,
            modelDescription: modelDescription,
            quantity: item.requested_qty || 0
          };
        } catch (itemErr) {
          console.error(`❌ Error processing item ${item.spare_id}:`, itemErr);
          return {
            srNo: idx + 1,
            partCode: 'N/A',
            partDescription: 'Error loading',
            modelCode: 'N/A',
            modelDescription: 'N/A',
            quantity: item.requested_qty || 0
          };
        }
      })
    );

    const statusName = request.status?.status_name || 'pending';

    res.json({
      success: true,
      challan: {
        requestNumber: `SPR-${request.request_id}`,
        status: statusName,
        serviceCenterName: scName,
        serviceCenterEmail: scEmail,
        serviceCenterPhone: scPhone,
        createdDate: request.created_at,
        items: items,
        totalItems: items.length,
        totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0)
      }
    });
  } catch (err) {
    console.error('❌ Error fetching challan:', err.message);
    console.error('Stack:', err.stack);
    res.status(500).json({
      error: 'Failed to fetch challan',
      message: err.message,
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
});

/**
 * GET /api/spare-returns/pending-approval
 * Get pending return requests requiring RSM approval at plant
 */
router.get('/pending-approval', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    const userRole = (req.user?.role || '').toLowerCase();
    let plantId = req.query?.plant_id || req.user?.plantId || req.user?.plant_id;

    console.log(`📋 Fetching pending returns for approval - Role: ${userRole}, PlantId from token: ${plantId}`);

    // For RSM users, get plants from rsm_state_mapping
    if (userRole === 'rsm' && !plantId) {
      const rsmId = req.user?.rsmId;
      console.log(`[DEBUG] RSM User - rsmId: ${rsmId}`);
      
      if (!rsmId) {
        return res.status(403).json({ error: 'RSM ID not found in token' });
      }

      // Get assigned plant_ids for this RSM
      const stateRows = await sequelize.query(
        `SELECT DISTINCT state_id FROM rsm_state_mapping WHERE rsm_user_id = ? AND is_active = 1`,
        { replacements: [rsmId], type: QueryTypes.SELECT }
      );
      const stateIds = stateRows.map(r => Number(r.state_id)).filter(Boolean);
      
      if (!stateIds.length) {
        return res.json({ success: true, count: 0, requests: [] });
      }

      // Get first plant from assigned states
      const placeholders = stateIds.map(() => '?').join(',');
      const plantRows = await sequelize.query(
        `SELECT TOP 1 plant_id FROM plants WHERE state_id IN (${placeholders})`,
        { replacements: stateIds, type: QueryTypes.SELECT }
      );
      
      if (plantRows.length > 0) {
        plantId = plantRows[0].plant_id;
        console.log(`[DEBUG] Found plant_id ${plantId} for RSM ${rsmId}`);
      }
    }

    // Only RSM or branch users can approve returns
    if ((userRole !== 'rsm' && userRole !== 'branch') || !plantId) {
      return res.status(403).json({ error: 'Only RSM or Branch can approve return requests' });
    }

    // Get return requests pending at this plant
    const requests = await sequelize.query(`
      SELECT 
        sr.request_id,
        sr.request_type,
        sr.requested_source_id as serviceCenterId,
        sr.requested_to_id as plantId,
        sr.created_at,
        sr.status_id,
        s.status_name,
        sc.asc_name as serviceCenterName,
        (SELECT COUNT(*) FROM spare_request_items WHERE request_id = sr.request_id) as itemCount
      FROM spare_requests sr
      LEFT JOIN status s ON sr.status_id = s.status_id
      LEFT JOIN service_centers sc ON sr.requested_source_id = sc.asc_id
      WHERE sr.requested_to_id = ?
        AND sr.request_type = 'consignment_return'
        AND UPPER(s.status_name) = 'PENDING'
      ORDER BY sr.created_at DESC
    `, {
      replacements: [plantId],
      type: QueryTypes.SELECT
    });

    console.log(`✅ Found ${requests.length} pending return requests`);

    // Fetch detailed items for each request
    const formattedRequests = await Promise.all(
      requests.map(async (req) => {
        const items = await sequelize.query(`
          SELECT 
            sri.id,
            sri.spare_id,
            sp.PART as partCode,
            sp.DESCRIPTION as partDescription,
            sri.requested_qty as returnQty,
            sri.approved_qty
          FROM spare_request_items sri
          LEFT JOIN spare_parts sp ON sri.spare_id = sp.Id
          WHERE sri.request_id = ?
        `, {
          replacements: [req.request_id],
          type: QueryTypes.SELECT
        });

        return {
          requestId: req.request_id,
          requestNumber: `SPR-${req.request_id}`,
          serviceCenterId: req.serviceCenterId,
          serviceCenterName: req.serviceCenterName || 'Unknown SC',
          status: req.status_name,
          createdAt: req.created_at,
          itemCount: req.itemCount,
          items: items.map(item => ({
            id: item.id,
            spareId: item.spare_id,
            partCode: item.partCode,
            partDescription: item.partDescription,
            returnQty: item.returnQty,
            approvedQty: item.approvedQty || 0
          }))
        };
      })
    );

    res.json({
      success: true,
      count: formattedRequests.length,
      requests: formattedRequests
    });
  } catch (err) {
    console.error('❌ Error fetching pending returns:', err);
    res.status(500).json({
      error: 'Failed to fetch pending returns',
      message: err.message
    });
  }
});

/**
 * POST /api/spare-returns/approve
 * RSM approves return request and updates status
 */
router.post('/approve', authenticateToken, async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { requestId, approvalData } = req.body;
    const userId = req.user?.id;
    const userRole = (req.user?.role || '').toLowerCase();
    let plantId = req.user?.plantId || req.user?.plant_id;

    console.log(`🔍 Approving return request ${requestId} - Role: ${userRole}`);

    // For RSM users, get plant from rsmId if not in token
    if (userRole === 'rsm' && !plantId) {
      const rsmId = req.user?.rsmId;
      if (rsmId) {
        const stateRows = await sequelize.query(
          `SELECT DISTINCT state_id FROM rsm_state_mapping WHERE rsm_user_id = ? AND is_active = 1`,
          { replacements: [rsmId], type: QueryTypes.SELECT }
        );
        const stateIds = stateRows.map(r => Number(r.state_id)).filter(Boolean);
        if (stateIds.length > 0) {
          const placeholders = stateIds.map(() => '?').join(',');
          const plantRows = await sequelize.query(
            `SELECT TOP 1 plant_id FROM plants WHERE state_id IN (${placeholders})`,
            { replacements: stateIds, type: QueryTypes.SELECT }
          );
          if (plantRows.length > 0) {
            plantId = plantRows[0].plant_id;
          }
        }
      }
    }

    if ((userRole !== 'rsm' && userRole !== 'branch') || !plantId) {
      await transaction.rollback();
      return res.status(403).json({ error: 'Only RSM or Branch can approve returns' });
    }

    // Get the return request
    const returnRequest = await SpareRequest.findByPk(parseInt(requestId), {
      include: [
        {
          model: SpareRequestItem,
          as: 'SpareRequestItems',
          required: false
        }
      ],
      transaction
    });

    if (!returnRequest) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Return request not found' });
    }

    // Update return request status to approved
    const approvedStatus = await Status.findOne({
      where: { status_name: 'approved' },
      transaction
    });

    await returnRequest.update(
      { status_id: approvedStatus.status_id },
      { transaction }
    );

    // Update approval data for items (send qty, receive qty)
    const items = returnRequest.SpareRequestItems || [];
    for (const item of items) {
      const itemApproval = approvalData?.items?.find(i => i.itemId === item.id);
      if (itemApproval) {
        await item.update(
          { approved_qty: itemApproval.receiveQty || item.requested_qty },
          { transaction }
        );
      }
    }

    // Create Stock Movement record
    const movement = await StockMovement.create({
      stock_movement_type: 'ASC_RETURN_DEFECTIVE_OUT',
      reference_type: 'return_request',
      reference_no: `SPR-${requestId}`,
      source_location_type: 'service_center',
      source_location_id: returnRequest.requested_source_id,
      destination_location_type: 'plant',
      destination_location_id: plantId,
      total_qty: items.reduce((sum, item) => sum + (item.approved_qty || item.requested_qty), 0),
      movement_date: new Date(),
      assigned_to: userId,
      created_by: userId,
      verified_by: userId,
      verified_at: new Date(),
      status: 'completed'
    }, { transaction });

    // Create Stock Movement Items
    for (const item of items) {
      const approvedQty = item.approved_qty || item.requested_qty;

      await GoodsMovementItems.create({
        movement_id: movement.movement_id,
        spare_part_id: item.spare_id,
        qty: approvedQty,
        condition: 'good'
      }, { transaction });
    }

    await transaction.commit();

    console.log(`✅ Return request ${requestId} approved and stock movement created`);

    res.json({
      success: true,
      message: 'Return request approved successfully',
      movement: {
        movementId: movement.movement_id,
        movementType: 'return',
        referenceNo: `SPR-${requestId}`,
        status: 'completed'
      }
    });
  } catch (err) {
    await transaction.rollback();
    console.error('❌ Error approving return request:', err);
    res.status(500).json({
      error: 'Failed to approve return request',
      message: err.message
    });
  }
});

/**
 * POST /api/spare-returns/reject
 * RSM rejects return request
 */
router.post('/reject', authenticateToken, async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { requestId, rejectReason } = req.body;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    console.log(`🔍 Rejecting return request ${requestId}`);

    if (userRole !== 'RSM') {
      return res.status(403).json({ error: 'Only RSM can reject returns' });
    }

    if (!requestId) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Request ID is required' });
    }

    // Get the return request
    const returnRequest = await SpareRequest.findByPk(parseInt(requestId), {
      include: [
        {
          model: SpareRequestItem,
          as: 'SpareRequestItems',
          required: false
        }
      ],
      transaction
    });

    if (!returnRequest) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Return request not found' });
    }

    // Update return request status to rejected
    const rejectedStatus = await Status.findOne({
      where: { status_name: 'rejected' },
      transaction
    });

    if (!rejectedStatus) {
      await transaction.rollback();
      return res.status(500).json({ error: 'Rejected status not found in system' });
    }

    await returnRequest.update(
      { 
        status_id: rejectedStatus.status_id,
        rejection_reason: rejectReason || 'Rejected by RSM'
      },
      { transaction }
    );

    // Revert inventory changes (restore items back to service center)
    console.log(`📦 Reverting inventory for rejected return request`);
    
    for (const item of (returnRequest.SpareRequestItems || [])) {
      const qty = item.requested_qty;

      // Restore to service center (increase qty_good)
      const sourceInventory = await SpareInventory.findOne({
        where: {
          spare_id: item.spare_id,
          location_type: 'service_center',
          location_id: returnRequest.requested_source_id
        },
        transaction
      });

      if (sourceInventory) {
        const newQtyGood = (sourceInventory.qty_good || 0) + qty;
        await sourceInventory.update(
          { qty_good: newQtyGood },
          { transaction }
        );
        console.log(`  📈 Restored to SC: Spare ${item.spare_id} qty increased by ${qty}`);
      }

      // Reduce from destination (plant/warehouse)
      // Note: Warehouse location_id uses 1000+ offset
      const warehouseLocId = 1000 + returnRequest.requested_to_id;
      const destInventory = await SpareInventory.findOne({
        where: {
          spare_id: item.spare_id,
          location_type: 'warehouse',
          location_id: warehouseLocId
        },
        transaction
      });

      if (destInventory) {
        const newQtyGood = Math.max(0, (destInventory.qty_good || 0) - qty);
        await destInventory.update(
          { qty_good: newQtyGood },
          { transaction }
        );
        console.log(`  📉 Reduced from Warehouse: Spare ${item.spare_id} qty reduced by ${qty}`);
      }
    }

    await transaction.commit();

    console.log(`✅ Return request ${requestId} rejected`);

    res.json({
      success: true,
      message: 'Return request rejected successfully',
      request: {
        requestId: returnRequest.request_id,
        requestNumber: `SPR-${returnRequest.request_id}`,
        status: 'rejected',
        rejectionReason: rejectReason || 'Rejected by RSM'
      }
    });
  } catch (err) {
    await transaction.rollback();
    console.error('❌ Error rejecting return request:', err);
    res.status(500).json({
      error: 'Failed to reject return request',
      message: err.message
    });
  }
});

/**
 * GET /api/spare-returns/return-cart/:requestId
 * Get return cart details for delivery challan creation
 */
router.get('/return-cart/:requestId', authenticateToken, async (req, res) => {
  try {
    const { requestId } = req.params;
    const centerId = req.user?.centerId;

    console.log(`📦 Fetching return cart for challan: ${requestId}`);

    const returnRequest = await SpareRequest.findByPk(parseInt(requestId), {
      include: [
        {
          model: SpareRequestItem,
          as: 'SpareRequestItems',
          required: false
        }
      ]
    });

    if (!returnRequest) {
      return res.status(404).json({ error: 'Return request not found' });
    }

    // Get service center details
    const sc = await ServiceCenter.findByPk(returnRequest.requested_source_id);

    // Get items with full details
    const itemsWithDetails = await Promise.all(
      (returnRequest.SpareRequestItems || []).map(async (item) => {
        const sparePart = await SparePart.findByPk(item.spare_id);
        const unitPrice = sparePart?.SAP_PRICE || 0;
        const totalAmount = (item.approved_qty || item.requested_qty) * unitPrice;

        return {
          id: item.id,
          spareId: item.spare_id,
          partCode: sparePart?.PART || 'N/A',
          partDescription: sparePart?.DESCRIPTION || 'Unknown',
          returnQty: item.requested_qty,
          receivedQty: item.approved_qty || item.requested_qty,
          unitPrice: unitPrice,
          totalAmount: totalAmount
        };
      })
    );

    const totalAmount = itemsWithDetails.reduce((sum, item) => sum + item.totalAmount, 0);
    const totalQty = itemsWithDetails.reduce((sum, item) => sum + item.receivedQty, 0);

    // Get status
    const status = await Status.findByPk(returnRequest.status_id);

    res.json({
      success: true,
      returnCart: {
        requestId: returnRequest.request_id,
        requestNumber: `SPR-${returnRequest.request_id}`,
        serviceCenterName: sc?.asc_name || 'Unknown',
        serviceCenterCode: sc?.asc_code || 'N/A',
        status: status?.status_name || 'pending',
        createdAt: returnRequest.created_at,
        items: itemsWithDetails,
        totals: {
          quantity: totalQty,
          amount: totalAmount
        }
      }
    });
  } catch (err) {
    console.error('❌ Error fetching return cart:', err);
    res.status(500).json({
      error: 'Failed to fetch return cart',
      message: err.message
    });
  }
});

/**
 * POST /api/spare-returns/create-challan
 * Create delivery challan and logistics document
 */
router.post('/create-challan', authenticateToken, async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { requestId, challanData } = req.body;
    const userId = req.user?.id;
    const centerId = req.user?.centerId;

    console.log(`🧾 Creating delivery challan for return: ${requestId}`);

    if (!centerId) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Service center not identified' });
    }

    // Get return request
    const returnRequest = await SpareRequest.findByPk(parseInt(requestId), {
      include: [
        {
          model: SpareRequestItem,
          as: 'SpareRequestItems',
          required: false
        }
      ],
      transaction
    });

    if (!returnRequest) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Return request not found' });
    }

    // Generate challan number
    const challanNumber = `CHAL-${Date.now()}-${requestId}`;

    // Create Logistics Document
    const logDoc = await LogisticsDocuments.create({
      external_system: 'CRM',
      document_type: 'CHALLAN',
      document_number: challanNumber,
      reference_doc_number: `SPR-${requestId}`,
      reference_type: 'SPARE_REQUEST',
      reference_id: parseInt(requestId),
      from_entity_type: 'service_center',
      from_entity_id: returnRequest.requested_source_id,
      to_entity_type: 'plant',
      to_entity_id: returnRequest.requested_to_id,
      status: 'Created',
      document_date: challanData?.challanDate || new Date()
    }, { transaction });

    // Create Logistics Document Items
    let totalAmount = 0;
    for (const item of (returnRequest.SpareRequestItems || [])) {
      const sparePart = await SparePart.findByPk(item.spare_id, { transaction });
      const unitPrice = sparePart?.SAP_PRICE || 0;
      const itemAmount = (item.approved_qty || item.requested_qty) * unitPrice;
      totalAmount += itemAmount;

      await LogisticsDocumentItems.create({
        logistics_document_id: logDoc.id,
        spare_id: item.spare_id,
        quantity: item.approved_qty || item.requested_qty,
        unit_price: unitPrice,
        total_amount: itemAmount
      }, { transaction });
    }

    // Update logistics document with total amount
    await logDoc.update(
      { amount: totalAmount },
      { transaction }
    );

    // Update the spare return request status to indicate challan has been printed
    // This makes it appear in the DCF status page
    const sentStatus = await Status.findOne(
      { where: { status_name: 'sent' } },
      { transaction }
    );
    
    if (sentStatus) {
      await returnRequest.update(
        { status_id: sentStatus.status_id },
        { transaction }
      );
      console.log(`✅ Updated return request status to 'sent' after challan creation`);
    }

    await transaction.commit();

    console.log(`✅ Delivery challan ${challanNumber} created`);

    res.status(201).json({
      success: true,
      message: 'Delivery challan created successfully',
      challan: {
        logisticsDocId: logDoc.id,
        challanNumber: challanNumber,
        referenceNo: `SPR-${requestId}`,
        status: 'Created',
        totalAmount: totalAmount,
        documentDate: logDoc.document_date
      }
    });
  } catch (err) {
    await transaction.rollback();
    console.error('❌ Error creating delivery challan:', err);
    res.status(500).json({
      error: 'Failed to create delivery challan',
      message: err.message
    });
  }
});

export default router;
