import * as spareRequestService from '../services/spareRequestService.js';

// GET /api/spare-requests - List spare requests
export async function list(req, res) {
  try {
    let userServiceCenterId = null;
    if (req.user) {
      userServiceCenterId = req.user.centerId;
      
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
    
    const { type, complaintId } = req.query;
    const result = await spareRequestService.listSpareRequests(userServiceCenterId, complaintId, type);
    res.json(result);
  } catch (error) {
    console.error('Error listing spare requests:', error);
    res.status(500).json({ error: 'Failed to fetch spare requests', details: error.message });
  }
}

// POST /api/spare-requests - Create a new spare request
export async function create(req, res) {
  try {
    const { complaintId, technicianId, items, notes } = req.body;
    const result = await spareRequestService.createSpareRequest(complaintId, technicianId, items, notes);
    res.status(201).json({
      success: true,
      message: 'Spare request created successfully',
      requestId: result.id,
      requestNumber: result.requestNumber
    });
  } catch (error) {
    console.error('Error creating spare request:', error);
    res.status(500).json({ error: 'Failed to create spare request' });
  }
}

// GET /api/spare-requests/replacement-history
export async function getReplacementHistory(req, res) {
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

    const result = await spareRequestService.getReplacementHistory(
      startDate, endDate, callId, status, requestedBy, page, limit
    );
    res.json(result);
  } catch (err) {
    console.error('Error in replacement-history:', err);
    res.status(500).json({ error: 'Failed to fetch replacement history', details: err.message });
  }
}

// GET /api/spare-requests/:id - Get request details
export async function getById(req, res) {
  try {
    let userServiceCenterId = null;
    if (req.user) {
      userServiceCenterId = req.user.centerId;
      
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

    const result = await spareRequestService.getRequestDetails(req.params.id, userServiceCenterId);
    res.json(result);
  } catch (error) {
    console.error('Error fetching request details:', error);
    res.status(error.message === 'Request not found' ? 404 : 403).json({ error: error.message });
  }
}

// GET /api/spare-requests/:id/can-allocate
export async function canAllocate(req, res) {
  try {
    let userServiceCenterId = null;
    if (req.user) {
      userServiceCenterId = req.user.centerId;
      
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

    const result = await spareRequestService.canAllocateRequest(req.params.id, userServiceCenterId);
    res.json(result);
  } catch (error) {
    console.error('Error checking allocation possibility:', error);
    res.status(error.message === 'Request not found' ? 404 : 403).json({ error: error.message });
  }
}

// POST /api/spare-requests/:id/allocate
export async function allocate(req, res) {
  try {
    const { allocations } = req.body;
    const requestId = req.params.id;

    let userServiceCenterId = null;
    if (req.user) {
      userServiceCenterId = req.user.centerId;
      
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

    await spareRequestService.allocateSpares(requestId, allocations, userServiceCenterId);
    res.json({ success: true, message: 'Allocated successfully' });
  } catch (error) {
    console.error('Error allocating spares:', error);
    res.status(error.message === 'Request not found' ? 404 : 400).json({ error: error.message });
  }
}

// POST /api/spare-requests/:id/order-from-branch
export async function orderFromBranch(req, res) {
  try {
    const { cartItems } = req.body;
    const requestId = req.params.id;
    
    await spareRequestService.orderFromBranch(requestId, cartItems);
    res.json({ success: true, message: 'Ordered from branch successfully' });
  } catch (error) {
    console.error('Error ordering from branch:', error);
    res.status(error.message === 'Request not found' ? 404 : 400).json({ error: error.message });
  }
}

// POST /api/spare-requests/:id/return
export async function returnParts(req, res) {
  try {
    const { returns } = req.body;
    const requestId = req.params.id;
    
    await spareRequestService.returnParts(requestId, returns);
    res.json({ success: true, message: 'Parts returned successfully' });
  } catch (error) {
    console.error('Error returning parts:', error);
    res.status(error.message === 'Request not found' ? 404 : 400).json({ error: error.message });
  }
}

// GET /api/spare-requests/technicians - Get all technicians
export async function getTechnicians(req, res) {
  try {
    const result = await spareRequestService.getAllTechnicians();
    res.json(result);
  } catch (error) {
    console.error('Error fetching technicians:', error);
    res.status(500).json({ error: 'Failed to fetch technicians' });
  }
}

// GET /api/spare-requests/:id/availability
export async function checkAvailability(req, res) {
  try {
    const itemId = req.params.id;
    
    const { SpareRequestItem } = await import('../models/index.js');
    const item = await SpareRequestItem.findByPk(itemId);
    if (!item) {
      return res.status(404).json({ error: 'Spare request item not found' });
    }

    const { SpareRequest } = await import('../models/index.js');
    const request = await SpareRequest.findByPk(item.RequestId);
    if (!request) {
      return res.status(404).json({ error: 'Spare request not found' });
    }

    const { ServiceCenterInventory } = await import('../models/index.js');
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
}

// GET /api/spare-requests/rental-returns
export async function getRentalReturns(req, res) {
  try {
    const { fromDate, toDate, technicianId, inventoryType } = req.query;
    const result = await spareRequestService.getRentalReturns(fromDate, toDate, technicianId, inventoryType);
    res.json(result);
  } catch (error) {
    console.error('Error fetching rental returns:', error);
    res.status(500).json({ error: 'Failed to fetch rental returns' });
  }
}

// POST /api/spare-requests/return
export async function bulkReturn(req, res) {
  try {
    const { returns } = req.body;
    await spareRequestService.bulkReturnParts(returns);
    res.json({ success: true, message: 'Parts returned successfully' });
  } catch (error) {
    console.error('Error returning parts:', error);
    res.status(400).json({ error: error.message });
  }
}

// GET /api/technicians/:id/inventory
export async function getTechnicianInventory(req, res) {
  try {
    const result = await spareRequestService.getTechnicianInventory(req.params.id);
    res.json(result);
  } catch (error) {
    console.error('Error fetching technician inventory:', error);
    res.status(500).json({ error: 'Failed to fetch technician inventory' });
  }
}

// GET /api/spare-requests/technicians/inventory
export async function getAllTechnicianInventories(req, res) {
  try {
    const { technician, product, model, sparePart } = req.query;
    const result = await spareRequestService.getAllTechnicianInventories(technician, product, model, sparePart);
    res.json(result);
  } catch (error) {
    console.error('Error fetching technician inventories:', error);
    res.status(500).json({ error: 'Failed to fetch technician inventories' });
  }
}

// GET /api/spare-requests/spare-parts/:sku/availability
export async function checkSparePartAvailability(req, res) {
  try {
    const sku = req.params.sku;
    const serviceCenterId = req.user?.centerId;
    
    if (!serviceCenterId) {
      const { ServiceCentre } = await import('../models/index.js');
      const serviceCenter = await ServiceCentre.findOne({
        where: { BranchId: req.user.branchId }
      });
      if (!serviceCenter) {
        return res.status(400).json({ error: 'Service center not found for user' });
      }
      const resolvedCenterId = serviceCenter.Id;
      const result = await spareRequestService.checkSparePartAvailability(sku, resolvedCenterId);
      return res.json({ sku, ...result, serviceCenterId: resolvedCenterId });
    }

    const result = await spareRequestService.checkSparePartAvailability(sku, serviceCenterId);
    res.json({ sku, ...result, serviceCenterId });
  } catch (error) {
    console.error('Error checking spare part availability:', error);
    res.status(500).json({ error: 'Failed to check availability' });
  }
}

// POST /api/spare-requests/replacement
export async function createReplacement(req, res) {
  try {
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
      return res.status(400).json({ error: 'All required fields must be provided' });
    }

    const result = await spareRequestService.createReplacementRequest(
      callId, productGroup, product, model, serialNo, rsm, hod, technician, asc, requestedBy, spareOrderRequestNo, replacementReason,
      req.user?.branchId, req.user?.centerId
    );

    res.status(201).json({
      message: 'Replacement request created successfully',
      requestId: result.id,
      requestNumber: result.requestNumber
    });
  } catch (error) {
    console.error('Error creating replacement request:', error);
    res.status(500).json({ error: 'Failed to create replacement request' });
  }
}
