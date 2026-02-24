// Reject request endpoint
router.post('/:id/reject', authenticateToken, async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const requestId = req.params.id;
    const { reason } = req.body;
    const request = await SpareRequest.findByPk(requestId, { transaction });
    if (!request) throw new Error('Request not found');
    if (request.Status !== 'pending') throw new Error('Request is not pending');
    await request.update({
      Status: 'rejected',
      Notes: (request.Notes || '') + ` [Rejected: ${reason || 'No reason provided'}]`,
      UpdatedAt: new Date()
    }, { transaction });
    await transaction.commit();
    res.json({ ok: true, message: 'Request rejected' });
  } catch (error) {
    await transaction.rollback();
    res.status(500).json({ error: error.message });
  }
});
import express from "express";
const router = express.Router();
import { sequelize } from '../db.js';
import { DataTypes } from 'sequelize';
import { SpareRequest, SpareRequestItem, ServiceCenterInventory, Technician, ComplaintRegistration, ServiceCentre, BranchInventory, TechnicianInventory, SparePart, Product } from '../models/index.js';
import { authenticateToken, optionalAuthenticate, requireRole } from '../middleware/auth.js';

// GET /api/spare-requests - List spare requests with filters
router.get('/', optionalAuthenticate, async (req, res) => {
  try {
    
    // Get user's service center
    let userServiceCenterId = null;
    if (req.user) {
      userServiceCenterId = req.user.centerId;
      
      // If no centerId but have branchId, find service center for this branch
      if (!userServiceCenterId && req.user.branchId) {
        const { ServiceCentre } = await import('../models/index.js');
        const serviceCenter = await ServiceCentre.findOne({
          where: { BranchId: req.user.branchId }
        });
        if (serviceCenter) {
          userServiceCenterId = serviceCenter.Id;
        }
      }
    }
    
    const { type, complaintId, status } = req.query;
    
    console.log('📤 GET /api/spare-requests:', {
      userServiceCenterId,
      type,
      complaintId,
      status,
      userRole: req.user?.role
    });
    
    // Try new spare_requests table first
    console.log('🔍 Querying spare_requests table...');
    
    let whereConditions = [];
    const replacements = [];
    
    // Filter by status ID if provided
    if (status === 'Allocated') {
      // status_id = 3 for Allocated
      whereConditions.push('sr.status_id = ?');
      replacements.push(3);
    } else if (status === 'pending') {
      // status_id = 4 for pending (or find dynamically)
      whereConditions.push('sr.status_id IN (SELECT status_id FROM status WHERE status_name LIKE ?)');
      replacements.push('%pending%');
    } else if (status) {
      // Generic status filter
      whereConditions.push('sr.status_id IN (SELECT status_id FROM status WHERE status_name LIKE ?)');
      replacements.push('%' + status + '%');
    }
    
    // Filter by service center
    if (userServiceCenterId) {
      whereConditions.push('sr.requested_to_id = ?');
      replacements.push(userServiceCenterId);
    }
    
    // Filter by technician source
    whereConditions.push('sr.requested_source_type = ?');
    replacements.push('technician');
    
    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';
    
    console.log('📋 WHERE Conditions:', whereConditions);
    console.log('📋 Replacements:', replacements);
    console.log('📋 Final WHERE clause:', whereClause);
    
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
      OFFSET 0 ROWS FETCH NEXT 50 ROWS ONLY
    `;
    
    console.log('🔍 Running query for spare_requests...');
    console.log('SQL Query:', query);
    const requests = await sequelize.query(query, {
      replacements: replacements,
      type: sequelize.QueryTypes.SELECT
    });
    
    console.log(`✅ Found ${requests.length} requests`);
    
    // Fetch items for each request in parallel
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
        status: req.statusId === 3 ? 'Allocated' : (req.statusId === 4 ? 'pending' : 'Unknown'),
        createdAt: req.createdAt,
        items: items.map(item => ({
          id: item.id,
          spareId: item.spare_id,
          requestedQty: item.requested_qty,
          approvedQty: item.approved_qty
        }))
      };
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching spare requests:', error);
    res.status(500).json({ error: 'Failed to fetch spare requests', details: error.message });
  }
});

// POST /api/spare-requests - Create a new spare request
router.post('/', authenticateToken, async (req, res) => {

  const transaction = await sequelize.transaction();
  try {
    const { complaintId, technicianId, items, notes } = req.body;

    // Validate items exist
    if (!items || items.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ error: 'No items provided in request' });
    }

    // Always determine service center and plant from asc_id (service center)
    let serviceCenterId = null;
    let plantId = null;
    let branchId = null;


    // Always resolve serviceCenterId (asc_id) and plantId from ServiceCenter
    if (technicianId) {
      const technician = await Technician.findByPk(technicianId, { transaction });
      if (technician) {
        serviceCenterId = technician.ServiceCentreId;
      }
    } else if (req.user && req.user.centerId) {
      serviceCenterId = req.user.centerId;
    }

    // Always fetch plant_id from the resolved serviceCenterId (asc_id)
    if (serviceCenterId) {
      const ServiceCenterModel = (await import('../models/index.js')).ServiceCenter;
      const sc = await ServiceCenterModel.findOne({ where: { asc_id: serviceCenterId } });
      if (sc && sc.plant_id) {
        plantId = sc.plant_id;
      }
    }

    // Generate request number
    const requestNumber = `REQ-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Ensure BranchId is set to the plant_id of the ServiceCenter (asc_id), not asc_id itself
    if (!plantId) {
      await transaction.rollback();
      return res.status(400).json({ error: 'No plant_id found for this service center. Cannot submit request.' });
    }
    const request = await SpareRequest.create({
      BranchId: plantId, // This is the plant_id, not asc_id
      ServiceCenterId: serviceCenterId,
      TechnicianId: technicianId,
      ComplaintId: complaintId,
      RequestNumber: requestNumber,
      Status: 'pending',
      RequestType: 'order',
      Notes: notes
    }, { transaction });

    // Create request items
    // Handle both old format (with sku) and new format (with sparePartId)
    const processedItems = [];
    for (const item of items) {
      let sku = item.sku;
      let spareName = item.spareName;
      let requestedQty = item.requestedQty || item.quantity;

      // If sparePartId is provided, fetch the SparePart details
      if (item.sparePartId && !sku) {
        const sparePart = await SparePart.findByPk(item.sparePartId, { transaction });
        if (sparePart) {
          sku = sparePart.PART;
          spareName = sparePart.DESCRIPTION || spareName;
        }
      }

      if (sku && requestedQty) {
        processedItems.push({
          RequestId: request.Id,
          Sku: sku,
          SpareName: spareName || sku,
          RequestedQty: requestedQty
        });
      }
    }

    if (processedItems.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ error: 'No valid items to create request' });
    }

    // Create request items
    if (processedItems && processedItems.length > 0) {
      // Fetch spare names for each sku if not already loaded
      const skus = processedItems.map(item => item.Sku);
      const spares = await SparePart.findAll({
        where: { PART: skus },
        attributes: ['PART', 'DESCRIPTION'],
        transaction
      });
      const spareMap = {};
      spares.forEach(spare => {
        spareMap[spare.PART] = spare.DESCRIPTION;
      });

      const requestItems = items.map(item => ({
        RequestId: request.Id,
        Sku: item.sku,
        SpareName: spareMap[item.sku] || item.spareName || item.sku,
        RequestedQty: item.requestedQty
      }));
      await SpareRequestItem.bulkCreate(requestItems, { transaction });
    }

    await transaction.commit();
    res.status(201).json({
      success: true,
      message: 'Spare request created successfully',
      requestId: request.Id,
      requestNumber: request.RequestNumber
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error creating spare request:', error);
    res.status(500).json({ error: 'Failed to create spare request' });
  }
});

// GET /api/spare-requests/replacement-history - replacement requests for service center/admin
router.get('/replacement-history', optionalAuthenticate, async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      callId,
      status,
      requestedBy,
      page = 1,
      limit = 10
    } = req.query;

    const offset = (page - 1) * limit;
    let whereClause = `WHERE sr.RequestType = 'replacement'`;
    const replacements = [];

    // Add date filter
    if (startDate && endDate) {
      whereClause += ` AND sr.CreatedAt BETWEEN ? AND ?`;
      replacements.push(new Date(startDate));
      replacements.push(new Date(endDate));
    }

    // Add status filter
    if (status) {
      whereClause += ` AND sr.Status = ?`;
      replacements.push(status);
    }

    // Add Notes search filters
    if (callId) {
      whereClause += ` AND sr.Notes LIKE ?`;
      replacements.push(`%Call ID: ${callId}%`);
    }

    if (requestedBy) {
      whereClause += ` AND sr.Notes LIKE ?`;
      replacements.push(`%Requested By: ${requestedBy}%`);
    }

    // Get total count
    const countQuery = `SELECT COUNT(*) as total FROM SpareRequests sr ${whereClause}`;
    const [countResult] = await sequelize.query(countQuery, {
      replacements: replacements,
      type: sequelize.QueryTypes.SELECT
    });
    const count = countResult?.total || 0;

    // Get paginated results
    const dataQuery = `
      SELECT sr.Id, sr.RequestNumber, sr.Status, sr.CreatedAt, sr.RequestType, sr.Notes, sr.ComplaintId
      FROM SpareRequests sr
      ${whereClause}
      ORDER BY sr.CreatedAt DESC
      OFFSET ? ROWS FETCH NEXT ? ROWS ONLY
    `;
    
    const rows = await sequelize.query(dataQuery, {
      replacements: [...replacements, parseInt(offset), parseInt(limit)],
      type: sequelize.QueryTypes.SELECT
    });

    const transformed = rows.map(r => {
      const notes = r.Notes || '';
      const callMatch = notes.match(/Call ID: ([^\.]+)/);
      const reqByMatch = notes.match(/Requested By: ([^\.]+)/);
      const serialMatch = notes.match(/Serial No: ([^\.]+)/);
      const reasonMatch = notes.match(/Replacement Reason: ([^\.]+)/);
      const rsmMatch = notes.match(/RSM: ([^\.]+)/);
      const hodMatch = notes.match(/HOD: ([^\.]+)/);

      return {
        id: r.Id,
        callId: callMatch ? callMatch[1] : (r.ComplaintId || ''),
        requestNumber: r.RequestNumber,
        status: r.Status,
        createdAt: r.CreatedAt,
        requestedBy: reqByMatch ? reqByMatch[1] : '',
        orderType: r.RequestType,
        spareStatus: r.Status,
        replacementStatus: r.Status,
        approvedByRSM: rsmMatch ? rsmMatch[1] : '',
        approvedByHOD: hodMatch ? hodMatch[1] : '',
        oldSerialNo: serialMatch ? serialMatch[1] : '',
        newSerialNo: '',
        customer: null,
        product: { serialNo: serialMatch ? serialMatch[1] : '' },
        replacement: { reason: reasonMatch ? reasonMatch[1] : '', items: [] }
      };
    });

    res.json({ 
      data: transformed, 
      pagination: { 
        total: count, 
        page: parseInt(page), 
        limit: parseInt(limit), 
        pages: Math.ceil(count / limit) 
      } 
    });
  } catch (err) {
    console.error('Error in replacement-history:', err);
    res.status(500).json({ error: 'Failed to fetch replacement history', details: err.message });
  }
});

// GET /api/spare-requests/:id - Get request details
router.get('/:id', optionalAuthenticate, async (req, res) => {
  try {
    const request = await SpareRequest.findByPk(req.params.id);
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    // Check if user is authorized to view this request
    if (req.user) {
      let userServiceCenterId = req.user.centerId;
      
      // If no centerId but have branchId, find service center for this branch
      if (!userServiceCenterId && req.user.branchId) {
        const { ServiceCentre } = await import('../models/index.js');
        const serviceCenter = await ServiceCentre.findOne({
          where: { BranchId: req.user.branchId }
        });
        if (serviceCenter) {
          userServiceCenterId = serviceCenter.Id;
        }
      }
      
      // If user has a service center, check if request belongs to it
      if (userServiceCenterId && request.ServiceCenterId !== userServiceCenterId) {
        return res.status(403).json({ error: 'Not authorized to view this request' });
      }
    }

    // Find plant_id for this service center (ASC)
    let plantId = null;
    if (request.ServiceCenterId) {
      const { ServiceCenter } = await import('../models/index.js');
      const sc = await ServiceCenter.findOne({ where: { asc_id: request.ServiceCenterId } });
      if (sc && sc.plant_id) plantId = sc.plant_id;
    }

    const items = await SpareRequestItem.findAll({
      where: { RequestId: request.Id }
    });

    // For each item, get available from plant inventory
    let itemsWithAvailable = await Promise.all(items.map(async item => {
      let available = 0;
      if (plantId) {
        const { SpareInventory } = await import('../models/index.js');
        const inv = await SpareInventory.findOne({
          where: {
            spare_id: item.Sku,
            location_type: 'branch',
            location_id: plantId
          }
        });
        available = inv ? inv.qty_good : 0;
      }
      return {
        id: item.Id,
        sku: item.Sku,
        partCode: item.Sku,
        description: item.SpareName,
        requestedQty: item.RequestedQty,
        approvedQty: item.ApprovedQty,
        availableQty: available
      };
    }));

    const formatted = {
      id: request.Id,
      requestId: request.RequestNumber,
      technicianName: request.TechnicianId ? `Technician ${request.TechnicianId}` : 'Unknown',
      technicianId: request.TechnicianId,
      callId: request.ComplaintId,
      complaintId: request.ComplaintId,
      status: request.Status,
      createdAt: request.CreatedAt,
      items: itemsWithAvailable
    };

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching request details:', error);
    res.status(500).json({ error: 'Failed to fetch request details' });
  }
});

// GET /api/spare-requests/:id/can-allocate - Check if all items in request can be allocated
router.get('/:id/can-allocate', optionalAuthenticate, async (req, res) => {
  try {
    const requestId = req.params.id;

    const request = await SpareRequest.findByPk(requestId, {
      include: [
        {
          model: SpareRequestItem,
          as: 'Items'
        }
      ]
    });

    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    // Check if user is authorized to allocate this request
    if (req.user) {
      let userServiceCenterId = req.user.centerId;
      
      // If no centerId but have branchId, find service center for this branch
      if (!userServiceCenterId && req.user.branchId) {
        const { ServiceCentre } = await import('../models/index.js');
        const serviceCenter = await ServiceCentre.findOne({
          where: { BranchId: req.user.branchId }
        });
        if (serviceCenter) {
          userServiceCenterId = serviceCenter.Id;
        }
      }
      
      // If user has a service center, check if request belongs to it
      if (userServiceCenterId && request.ServiceCenterId !== userServiceCenterId) {
        return res.status(403).json({ error: 'Not authorized to allocate this request' });
      }
    }

    let canAllocate = true;
    const itemStatuses = [];

    for (const item of request.Items || []) {
      const inventory = await ServiceCenterInventory.findOne({
        where: {
          Sku: item.Sku,
          ServiceCenterId: request.ServiceCenterId
        }
      });

      const available = inventory ? inventory.GoodQty : 0;
      const sufficient = available >= item.RequestedQty;

      itemStatuses.push({
        sku: item.Sku,
        requestedQty: item.RequestedQty,
        availableQty: available,
        sufficient
      });

      if (!sufficient) {
        canAllocate = false;
      }
    }

    res.json({
      canAllocate,
      itemStatuses
    });
  } catch (error) {
    console.error('Error checking allocation possibility:', error);
    res.status(500).json({ error: 'Failed to check allocation possibility' });
  }
});

// POST /api/spare-requests/:id/allocate - Allocate spares
router.post('/:id/allocate', authenticateToken, async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { allocations } = req.body; // { itemId: qty }
    const requestId = req.params.id;

    const request = await SpareRequest.findByPk(requestId, { transaction });
    if (!request) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Request not found' });
    }

    // Check if user is authorized to allocate this request
    let userServiceCenterId = req.user.centerId;
    
    // If no centerId but have branchId, find service center for this branch
    if (!userServiceCenterId && req.user.branchId) {
      const { ServiceCentre } = await import('../models/index.js');
      const serviceCenter = await ServiceCentre.findOne({
        where: { BranchId: req.user.branchId }
      });
      if (serviceCenter) {
        userServiceCenterId = serviceCenter.Id;
      }
    }
    
    // If user has a service center, check if request belongs to it
    if (userServiceCenterId && request.ServiceCenterId !== userServiceCenterId) {
      await transaction.rollback();
      return res.status(403).json({ error: 'Not authorized to allocate this request' });
    }

    // Check availability for each allocation
    for (const [itemId, qty] of Object.entries(allocations)) {
      const item = await SpareRequestItem.findByPk(itemId, { transaction });
      if (!item) continue;

      const inventory = await ServiceCenterInventory.findOne({
        where: {
          Sku: item.Sku,
          ServiceCenterId: request.ServiceCenterId
        },
        transaction
      });

      if (!inventory || inventory.GoodQty < qty) {
        await transaction.rollback();
        return res.status(400).json({ error: `Insufficient stock for ${item.Sku}` });
      }

      // Update inventory
      inventory.GoodQty -= qty;
      
      // If both quantities become 0, remove the inventory item
      if (inventory.GoodQty === 0 && inventory.DefectiveQty === 0) {
        await inventory.destroy({ transaction });
      } else {
        await inventory.save({ transaction });
      }

      // Update approved qty
      await item.update({
        ApprovedQty: qty
      }, { transaction });

      // Add to technician inventory
      let techInventory = await TechnicianInventory.findOne({
        where: {
          TechnicianId: request.TechnicianId,
          Sku: item.Sku
        },
        transaction
      });

      if (techInventory) {
        await techInventory.update({
          GoodQty: techInventory.GoodQty + qty
        }, { transaction });
      } else {
        await TechnicianInventory.create({
          TechnicianId: request.TechnicianId,
          Sku: item.Sku,
          SpareName: item.SpareName,
          GoodQty: qty
        }, { transaction });
      }
    }

    // Update request status
    await request.update({
      Status: 'Allocated'
    }, { transaction });

    await transaction.commit();
    res.json({ success: true, message: 'Allocated successfully' });
  } catch (error) {
    await transaction.rollback();
    console.error('Error allocating spares:', error);
    res.status(500).json({ error: 'Allocation failed' });
  }
});

// POST /api/spare-requests/:id/order-from-branch - Order unavailable items from branch
router.post('/:id/order-from-branch', authenticateToken, async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { cartItems } = req.body; // [{ sku, spareName, orderQty }]
    const requestId = req.params.id;

    const request = await SpareRequest.findByPk(requestId, { transaction });
    if (!request) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Request not found' });
    }

    // Get the service center's assigned branch (assuming service center has a branch)
    const serviceCenter = await ServiceCentre.findByPk(request.ServiceCenterId, { transaction });
    if (!serviceCenter) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Service center not found' });
    }

    // For now, assume branch ID is stored or we need to determine it
    // Let's assume the service center has an AssignedBranchId or similar
    // For simplicity, let's use BranchId = 1 (from sample data)
    const branchId = 1; // TODO: Get proper branch ID

    for (const item of cartItems) {
      // Check if branch has the item
      const branchInventory = await BranchInventory.findOne({
        where: {
          BranchId: branchId,
          Sku: item.sku
        },
        transaction
      });

      if (!branchInventory || branchInventory.GoodQty < item.orderQty) {
        await transaction.rollback();
        return res.status(400).json({ error: `Insufficient stock in branch for ${item.spareName}` });
      }

      // Deduct from branch inventory
      await branchInventory.update({
        GoodQty: branchInventory.GoodQty - item.orderQty
      }, { transaction });

      // Add to service center inventory
      let scInventory = await ServiceCenterInventory.findOne({
        where: {
          ServiceCenterId: request.ServiceCenterId,
          Sku: item.sku
        },
        transaction
      });

      if (scInventory) {
        await scInventory.update({
          GoodQty: scInventory.GoodQty + item.orderQty
        }, { transaction });
      } else {
        await ServiceCenterInventory.create({
          ServiceCenterId: request.ServiceCenterId,
          Sku: item.sku,
          SpareName: item.spareName,
          GoodQty: item.orderQty
        }, { transaction });
      }
    }

    await transaction.commit();
    res.json({ success: true, message: 'Ordered from branch successfully' });
  } catch (error) {
    await transaction.rollback();
    console.error('Error ordering from branch:', error);
    res.status(500).json({ error: 'Order from branch failed' });
  }
});

// POST /api/spare-requests/:id/return - Return spare parts from technician
router.post('/:id/return', authenticateToken, async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { returns } = req.body; // [{ sku, goodQty, defectiveQty }]
    const requestId = req.params.id;

    const request = await SpareRequest.findByPk(requestId, { transaction });
    if (!request) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Request not found' });
    }

    for (const returnItem of returns) {
      const { sku, goodQty, defectiveQty } = returnItem;

      // Check technician inventory
      const techInventory = await TechnicianInventory.findOne({
        where: {
          TechnicianId: request.TechnicianId,
          Sku: sku
        },
        transaction
      });

      if (!techInventory || (techInventory.GoodQty < goodQty) || (techInventory.DefectiveQty < defectiveQty)) {
        await transaction.rollback();
        return res.status(400).json({ error: `Insufficient technician inventory for ${sku}` });
      }

      // Update technician inventory
      await techInventory.update({
        GoodQty: techInventory.GoodQty - goodQty,
        DefectiveQty: techInventory.DefectiveQty - defectiveQty
      }, { transaction });

      // Add to service center inventory (only good parts)
      let scInventory = await ServiceCenterInventory.findOne({
        where: {
          ServiceCenterId: request.ServiceCenterId,
          Sku: sku
        },
        transaction
      });

      if (scInventory) {
        await scInventory.update({
          GoodQty: scInventory.GoodQty + goodQty,
          DefectiveQty: (scInventory.DefectiveQty || 0) + defectiveQty
        }, { transaction });
      } else {
        await ServiceCenterInventory.create({
          ServiceCenterId: request.ServiceCenterId,
          Sku: sku,
          SpareName: techInventory.SpareName,
          GoodQty: goodQty,
          DefectiveQty: defectiveQty
        }, { transaction });
      }
    }

    await transaction.commit();
    res.json({ success: true, message: 'Parts returned successfully' });
  } catch (error) {
    await transaction.rollback();
    console.error('Error returning parts:', error);
    res.status(500).json({ error: 'Return failed' });
  }
});

// GET /api/technicians - Get all technicians
router.get('/technicians', optionalAuthenticate, async (req, res) => {
  try {
    const technicians = await Technician.findAll({
      attributes: ['Id', 'TechnicianName']
    });
    res.json(technicians.map(t => ({ id: t.Id, name: t.TechnicianName })));
  } catch (error) {
    console.error('Error fetching technicians:', error);
    res.status(500).json({ error: 'Failed to fetch technicians' });
  }
});

// GET /api/spare-requests/:id/availability - Check availability of a spare request item
router.get('/:id/availability', optionalAuthenticate, async (req, res) => {
  try {
    // id is SpareRequestItem ID
    const itemId = req.params.id;
    
    const item = await SpareRequestItem.findByPk(itemId);
    if (!item) {
      return res.status(404).json({ error: 'Spare request item not found' });
    }

    const request = await SpareRequest.findByPk(item.RequestId);
    if (!request) {
      return res.status(404).json({ error: 'Spare request not found' });
    }

    const inventory = await ServiceCenterInventory.findOne({
      where: {
        Sku: item.Sku,
        ServiceCenterId: request.ServiceCenterId
      }
    });

    const available = inventory ? inventory.GoodQty : 0;
    res.json({ available });
  } catch (error) {
    console.error('Error checking availability:', error);
    res.status(500).json({ error: 'Failed to check availability' });
  }
});

// GET /api/spare-requests/rental-returns - Get rental returns data for the UI
router.get('/rental-returns', authenticateToken, async (req, res) => {
  try {
    const { fromDate, toDate, technicianId, inventoryType } = req.query;

    let whereClause = {
      TechnicianId: { [sequelize.Sequelize.Op.ne]: null } // Only technician requests
    };

    if (technicianId) {
      whereClause.TechnicianId = technicianId;
    }

    if (fromDate || toDate) {
      whereClause.CreatedAt = {};
      if (fromDate) whereClause.CreatedAt[sequelize.Sequelize.Op.gte] = new Date(fromDate);
      if (toDate) whereClause.CreatedAt[sequelize.Sequelize.Op.lte] = new Date(toDate);
    }

    const requests = await SpareRequest.findAll({
      where: whereClause,
      include: [
        {
          model: Technician,
          attributes: ['Id', 'Name']
        },
        {
          model: ComplaintRegistration,
          attributes: ['Id']
        }
      ],
      order: [['CreatedAt', 'DESC']]
    });

    // Get technician inventory for each technician
    const formatted = [];
    for (const request of requests) {
      const technicianInventory = await TechnicianInventory.findAll({
        where: { TechnicianId: request.TechnicianId },
        attributes: ['Id', 'Sku', 'SpareName', 'GoodQty', 'DefectiveQty']
      });

      for (const item of technicianInventory) {
        // Filter by inventory type if specified
        if (inventoryType === 'Good' && item.DefectiveQty > 0 && item.GoodQty === 0) continue;
        if (inventoryType === 'Defective' && item.GoodQty > 0 && item.DefectiveQty === 0) continue;

        formatted.push({
          id: item.Id,
          technicianId: request.TechnicianId,
          technicianName: request.Technician?.Name || `Technician ${request.TechnicianId}`,
          callId: request.ComplaintId,
          sku: item.Sku,
          spareName: item.SpareName,
          allocatedQty: item.GoodQty + item.DefectiveQty, // Total allocated
          goodQty: item.GoodQty,
          defectiveQty: item.DefectiveQty,
          inventoryType: item.GoodQty > 0 && item.DefectiveQty > 0 ? 'Both' : (item.GoodQty > 0 ? 'Good' : 'Defective')
        });
      }
    }

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching rental returns:', error);
    res.status(500).json({ error: 'Failed to fetch rental returns' });
  }
});

// GET /api/spare-requests/rental-returns - Get rental returns data for the UI
router.get('/rental-returns', authenticateToken, async (req, res) => {
  try {
    const { fromDate, toDate, technicianId, inventoryType } = req.query;

    let whereClause = {
      TechnicianId: { [sequelize.Sequelize.Op.ne]: null } // Only technician requests
    };

    if (technicianId) {
      whereClause.TechnicianId = technicianId;
    }

    if (fromDate || toDate) {
      whereClause.CreatedAt = {};
      if (fromDate) whereClause.CreatedAt[sequelize.Sequelize.Op.gte] = new Date(fromDate);
      if (toDate) whereClause.CreatedAt[sequelize.Sequelize.Op.lte] = new Date(toDate);
    }

    const requests = await SpareRequest.findAll({
      where: whereClause,
      include: [
        {
          model: Technician,
          attributes: ['Id', 'TechnicianName']
        },
        {
          model: ComplaintRegistration,
          attributes: ['Id']
        }
      ],
      order: [['CreatedAt', 'DESC']]
    });

    // Get technician inventory for each technician
    const formatted = [];
    for (const request of requests) {
      const technicianInventory = await TechnicianInventory.findAll({
        where: { TechnicianId: request.TechnicianId },
        attributes: ['Id', 'Sku', 'SpareName', 'GoodQty', 'DefectiveQty']
      });

      for (const item of technicianInventory) {
        // Only include items that have inventory (good or defective > 0)
        if (item.GoodQty === 0 && item.DefectiveQty === 0) continue;

        // Filter by inventory type if specified
        if (inventoryType === 'Good' && item.DefectiveQty > 0 && item.GoodQty === 0) continue;
        if (inventoryType === 'Defective' && item.GoodQty > 0 && item.DefectiveQty === 0) continue;

        formatted.push({
          id: item.Id,
          technicianId: request.TechnicianId,
          technicianName: request.Technician?.TechnicianName || `Technician ${request.TechnicianId}`,
          callId: request.ComplaintId,
          sku: item.Sku,
          spareName: item.SpareName,
          allocatedQty: item.GoodQty + item.DefectiveQty, // Total allocated
          goodQty: item.GoodQty,
          defectiveQty: item.DefectiveQty,
          inventoryType: item.GoodQty > 0 && item.DefectiveQty > 0 ? 'Both' : (item.GoodQty > 0 ? 'Good' : 'Defective')
        });
      }
    }

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching rental returns:', error);
    res.status(500).json({ error: 'Failed to fetch rental returns' });
  }
});

// POST /api/spare-requests/return - Return spare parts (updated to handle removal when qty becomes 0)
router.post('/return', authenticateToken, async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { returns } = req.body; // [{ sku, goodQty, defectiveQty, technicianId }]

    for (const returnItem of returns) {
      const { sku, goodQty, defectiveQty, technicianId } = returnItem;

      // Find technician inventory
      const techInventory = await TechnicianInventory.findOne({
        where: { Sku: sku, TechnicianId: technicianId },
        transaction
      });

      if (!techInventory) {
        await transaction.rollback();
        return res.status(400).json({ error: `Technician inventory not found for ${sku}` });
      }

      // Check if technician has enough inventory
      if (techInventory.GoodQty < goodQty || techInventory.DefectiveQty < defectiveQty) {
        await transaction.rollback();
        return res.status(400).json({ error: `Insufficient technician inventory for ${sku}` });
      }

      // Update technician inventory
      techInventory.GoodQty -= goodQty;
      techInventory.DefectiveQty -= defectiveQty;

      // If both quantities become 0, remove the inventory item
      if (techInventory.GoodQty === 0 && techInventory.DefectiveQty === 0) {
        await techInventory.destroy({ transaction });
      } else {
        await techInventory.save({ transaction });
      }

      // Find service center inventory for the technician's service center
      const technician = await Technician.findOne({
        where: { Id: technicianId },
        include: [{ model: ServiceCentre }],
        transaction
      });

      if (technician && technician.ServiceCentre) {
        const scId = technician.ServiceCentre.Id;

        // Update service center inventory
        let scInventory = await ServiceCenterInventory.findOne({
          where: { Sku: sku, ServiceCentreId: scId },
          transaction
        });

        if (scInventory) {
          scInventory.GoodQty += goodQty;
          scInventory.DefectiveQty += defectiveQty;
          
          // If both quantities become 0, remove the inventory item
          if (scInventory.GoodQty === 0 && scInventory.DefectiveQty === 0) {
            await scInventory.destroy({ transaction });
          } else {
            await scInventory.save({ transaction });
          }
        } else {
          // Only create new inventory if quantities are greater than 0
          if (goodQty > 0 || defectiveQty > 0) {
            await ServiceCenterInventory.create({
              Sku: sku,
              SpareName: techInventory.SpareName,
              GoodQty: goodQty,
              DefectiveQty: defectiveQty,
              ServiceCentreId: scId
            }, { transaction });
          }
        }
      }
    }

    await transaction.commit();
    res.json({ success: true, message: 'Parts returned successfully' });
  } catch (error) {
    await transaction.rollback();
    console.error('Error returning parts:', error);
    res.status(500).json({ error: 'Return failed' });
  }
});

// GET /api/spare-requests/technicians/:id/inventory - Get technician inventory
router.get('/technicians/:id/inventory', optionalAuthenticate, async (req, res) => {
  try {
    const technicianId = req.params.id;
    
    console.log(`📦 Fetching inventory for technician ${technicianId}`);
    
    // Query from spare_inventory table where location_type='technician'
    const inventory = await sequelize.query(`
      SELECT 
        si.spare_inventory_id as id,
        si.spare_id,
        sp.PART as sku,
        sp.DESCRIPTION as spareName,
        si.qty_good as goodQty,
        si.qty_defective as defectiveQty
      FROM spare_inventory si
      LEFT JOIN spare_parts sp ON si.spare_id = sp.Id
      WHERE si.location_type = 'technician'
      AND si.location_id = ?
      AND (si.qty_good > 0 OR si.qty_defective > 0)
    `, {
      replacements: [technicianId],
      type: sequelize.QueryTypes.SELECT
    });
    
    console.log(`✅ Found ${inventory.length} inventory items for technician ${technicianId}`);
    
    res.json(inventory.map(i => ({
      id: i.id,
      spareId: i.spare_id,
      sku: i.sku || 'Unknown',
      spareName: i.spareName || 'Unknown Spare',
      goodQty: i.goodQty || 0,
      defectiveQty: i.defectiveQty || 0
    })));
  } catch (error) {
    console.error('Error fetching technician inventory:', error);
    res.status(500).json({ error: 'Failed to fetch technician inventory' });
  }
});

// GET /api/spare-requests/technicians/inventory - Get all technician inventories with filters
router.get('/technicians/inventory', optionalAuthenticate, async (req, res) => {
  try {
    const { technician, product, model, sparePart } = req.query;
    
    let whereClause = {};
    
    if (technician) {
      whereClause.TechnicianId = technician;
    }
    
    // For now, we'll get all technician inventories
    // Additional filtering can be added based on product/model/sparePart relationships
    const inventories = await TechnicianInventory.findAll({
      where: whereClause,
      include: [
        {
          model: Technician,
          as: 'Technician',
          attributes: ['Id', 'TechnicianName']
        }
      ],
      attributes: ['Id', 'Sku', 'SpareName', 'GoodQty', 'DefectiveQty', 'TechnicianId']
    });
    
    const formatted = inventories.map(inv => ({
      id: inv.Id,
      technicianId: inv.TechnicianId,
      technicianName: inv.Technician?.TechnicianName || `Technician ${inv.TechnicianId}`,
      partCode: inv.Sku,
      partDescription: inv.SpareName,
      goodQty: inv.GoodQty,
      defectiveQty: inv.DefectiveQty,
      totalQty: inv.GoodQty + inv.DefectiveQty
    }));
    
    res.json(formatted);
  } catch (error) {
    console.error('Error fetching technician inventories:', error);
    res.status(500).json({ error: 'Failed to fetch technician inventories' });
  }
});


// POST /api/spare-requests/:id/return - Return allocated parts back to service center as defective
router.post('/:id/return', authenticateToken, async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const requestId = req.params.id;
    const { returns } = req.body; // { partId: qty }

    const request = await SpareRequest.findByPk(requestId, { transaction });
    if (!request) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Request not found' });
    }

    const technicianId = request.TechnicianId;
    const serviceCenterId = request.ServiceCenterId;

    if (!technicianId || !serviceCenterId) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Invalid request data' });
    }

    for (const [partId, qty] of Object.entries(returns)) {
      if (qty <= 0) continue;

      // Get the spare request item
      const item = await SpareRequestItem.findByPk(partId, { transaction });
      if (!item) continue;

      const sku = item.Sku;

      // Reduce from technician inventory (good qty)
      const techInv = await TechnicianInventory.findOne({
        where: { TechnicianId: technicianId, Sku: sku },
        transaction
      });

      if (techInv && techInv.GoodQty >= qty) {
        techInv.GoodQty -= qty;
        await techInv.save({ transaction });
      } else {
        await transaction.rollback();
        return res.status(400).json({ error: `Insufficient quantity in technician inventory for ${sku}` });
      }

      // Add to service center inventory as defective
      let scInv = await ServiceCenterInventory.findOne({
        where: { ServiceCenterId: serviceCenterId, Sku: sku },
        transaction
      });

      if (scInv) {
        scInv.DefectiveQty += qty;
        await scInv.save({ transaction });
      } else {
        // Create new entry
        await ServiceCenterInventory.create({
          ServiceCenterId: serviceCenterId,
          Sku: sku,
          SpareName: item.SpareName,
          GoodQty: 0,
          DefectiveQty: qty,
          ReceivedFrom: `Technician Return - ${technicianId}`,
          ReceivedAt: new Date()
        }, { transaction });
      }
    }

    await transaction.commit();
    res.json({ message: 'Parts returned successfully' });
  } catch (error) {
    await transaction.rollback();
    console.error('Error returning parts:', error);
    res.status(500).json({ error: 'Failed to return parts' });
  }
});
router.get('/spare-parts/:sku/availability', authenticateToken, async (req, res) => {
  try {
    const sku = req.params.sku;
    const user = req.user;

    console.log('Checking availability for SKU:', sku, 'User:', user.id, 'centerId:', user.centerId, 'branchId:', user.branchId);

    // Get service center ID from user
    let serviceCenterId = user.centerId;
    
    // If no centerId but have branchId, find service center for this branch
    if (!serviceCenterId && user.branchId) {
      const { ServiceCentre } = await import('../models/index.js');
      const serviceCenter = await ServiceCentre.findOne({
        where: { BranchId: user.branchId }
      });
      if (serviceCenter) {
        serviceCenterId = serviceCenter.Id;
        console.log('Found service center for branch:', serviceCenterId);
      }
    }
    
    if (!serviceCenterId) {
      console.log('No service center found for user');
      return res.status(400).json({ error: 'Service center not found for user' });
    }

    console.log('Querying inventory for SKU:', sku, 'ServiceCenterId:', serviceCenterId);

    const inventory = await ServiceCenterInventory.findOne({
      where: {
        Sku: sku,
        ServiceCenterId: serviceCenterId
      }
    });

    const available = inventory ? inventory.GoodQty : 0;

    console.log('Inventory result:', inventory, 'Available:', available);

    res.json({
      sku,
      available,
      serviceCenterId
    });
  } catch (error) {
    console.error('Error checking spare part availability:', error);
    res.status(500).json({ error: 'Failed to check availability' });
  }
});

// POST /api/spare-requests/replacement - Create a product replacement request
router.post('/replacement', authenticateToken, async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    console.log('POST /api/spare-requests/replacement called by user:', req.user && { id: req.user.id, centerId: req.user.centerId, branchId: req.user.branchId });
    console.log('Request body:', req.body);
    const {
      callId,
      productGroup,
      product,
      model,
      serialNo,
      rsm,
      hod,
      technician,
      asc,
      requestedBy,
      spareOrderRequestNo,
      replacementReason
    } = req.body;

    // Validate required fields
    if (!callId || !productGroup || !product || !model || !serialNo || !technician || !asc || !requestedBy || !replacementReason) {
      await transaction.rollback();
      return res.status(400).json({ error: 'All required fields must be provided' });
    }

    // Determine user's service center (fallback to branch lookup)
    let serviceCenterId = req.user?.centerId || null;
    if (!serviceCenterId && req.user?.branchId) {
      const { ServiceCentre } = await import('../models/index.js');
      const serviceCenter = await ServiceCentre.findOne({
        where: { BranchId: req.user.branchId },
        transaction
      });
      if (serviceCenter) serviceCenterId = serviceCenter.Id;
    }

    // Generate request number (ensure uniqueness if spareOrderRequestNo provided)
    let requestNumber = spareOrderRequestNo || `REP-${Date.now()}`;
    if (spareOrderRequestNo) {
      const existing = await SpareRequest.findOne({ where: { RequestNumber: spareOrderRequestNo }, transaction });
      if (existing) {
        // append timestamp to make it unique
        requestNumber = `${spareOrderRequestNo}-${Date.now()}`;
      }
    }

    // Choose ServiceCenterId: prefer explicit ASC from form, else user's center
    const ascId = (asc || '').toString().trim();
    const finalServiceCenterId = ascId !== '' && !isNaN(Number(ascId)) ? Number(ascId) : serviceCenterId;

    // BranchId: prefer user's branch if available
    const finalBranchId = req.user?.branchId || null;

    // Convert technician to number if it's a string
    const finalTechnicianId = technician ? Number(technician) : null;

    // Create the spare request
    const spareRequest = await SpareRequest.create({
      BranchId: finalBranchId,
      ServiceCenterId: finalServiceCenterId,
      TechnicianId: finalTechnicianId,
      RequestNumber: requestNumber,
      Status: 'Pending',
      RequestType: 'replacement',
      Notes: `Replacement Reason: ${replacementReason}. Call ID: ${callId}. Serial No: ${serialNo}. Requested By: ${requestedBy}. RSM: ${rsm}. HOD: ${hod}`,
      CreatedAt: new Date(),
      UpdatedAt: new Date()
    }, { transaction });

    // For replacement, we might need to add items based on the product/model
    // For now, create a placeholder item or handle based on requirements
    // Since it's replacement, perhaps no specific items needed, or we can add logic later

    await transaction.commit();

    res.status(201).json({
      message: 'Replacement request created successfully',
      requestId: spareRequest.Id,
      requestNumber: spareRequest.RequestNumber
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Error creating replacement request:', error);
    res.status(500).json({ error: 'Failed to create replacement request' });
  }
});

export default router;

