import express from 'express';
import { sequelize } from '../db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();
const onlyBranch = [authenticateToken, requireRole(['branch', 'rsm'])];
const onlyServiceCenter = [authenticateToken, requireRole('service_center')];

// ========== BRANCH DASHBOARD ==========
router.get('/dashboard', onlyBranch, async (req, res) => {
  try {
    const branchId = req.user?.branchId || req.user?.centerId || req.user?.branch;
    if (!branchId) return res.status(400).json({ error: 'branchId missing in token' });

    const SpareRequest = sequelize.models.SpareRequest;
    const BranchInventory = sequelize.models.BranchInventory;

    // Count pending requests
    const pendingCount = await SpareRequest.count({ where: { BranchId: branchId, Status: 'pending' } });
    
    // Count low stock items
    const lowStockItems = await sequelize.query(
      `SELECT COUNT(*) as cnt FROM BranchInventory 
       WHERE BranchId = ? AND GoodQty <= MinimumStockLevel`,
      { replacements: [branchId], type: sequelize.QueryTypes.SELECT }
    );

    const inv = await BranchInventory.findAll({ where: { BranchId: branchId } });

    res.json({
      ok: true,
      kpis: {
        pendingRequests: pendingCount,
        lowStockItems: lowStockItems[0]?.cnt || 0,
        totalInventoryItems: inv.length,
      },
    });
  } catch (err) {
    console.error('Dashboard error', err);
    res.status(500).json({ error: err.message });
  }
});

// ========== LIST SPARE REQUESTS FOR BRANCH ==========
router.get('/requests', onlyBranch, async (req, res) => {
  try {
    const userRole = (req.user && (req.user.role || req.user.Role || '')).toString().toLowerCase();

    // If RSM user, return modern spare_requests targeted to ASC ids mapped to this RSM
    if (userRole === 'rsm') {
      const rsmUserId = req.user.id;
      // find ASC ids mapped to this RSM via service_centers -> rsm_state_mapping
      const ascRows = await sequelize.query(
        `SELECT DISTINCT sc.asc_id AS asc_id FROM service_centers sc
         JOIN rsm_state_mapping sm ON sm.state_id = sc.state_id AND sm.is_active = 1
         WHERE sm.rsm_user_id = ?`,
        { replacements: [rsmUserId], type: sequelize.QueryTypes.SELECT }
      );

      const ascIds = ascRows.map(r => r.asc_id).filter(Boolean);
      if (ascIds.length === 0) return res.json([]);

      // fetch modern spare_requests where requested_to_type='branch' and requested_to_id in ascIds
      const modernReqs = await sequelize.models.SpareRequest.findAll({
        where: {
          requested_to_type: 'branch',
          requested_to_id: ascIds[0] ? ascIds : ascIds
        },
        include: [{ model: sequelize.models.SpareRequestItem, as: 'SpareRequestItems', required: false }],
        order: [['created_at', 'DESC']],
        limit: 200
      });

      // collect spare ids to fetch names
      const spareIds = [];
      modernReqs.forEach(r => (r.SpareRequestItems || []).forEach(i => spareIds.push(i.spare_id)));
      const uniqueSpareIds = [...new Set(spareIds)].filter(Boolean);
      let spareMap = {};
      if (uniqueSpareIds.length > 0) {
        const spareRows = await sequelize.query(`SELECT Id, PART FROM spare_parts WHERE Id IN (${uniqueSpareIds.map(()=>'?').join(',')})`, { replacements: uniqueSpareIds, type: sequelize.QueryTypes.SELECT });
        spareRows.forEach(s => { spareMap[s.Id] = s.PART || s.PART; });
      }

      const formatted = modernReqs.map(r => ({
        Id: r.request_id,
        RequestNumber: `REQ-${r.request_id}`,
        ServiceCenterId: r.requested_source_id,
        Status: r.request_reason || 'pending',
        CreatedAt: r.created_at,
        ApprovedAt: r.approved_at || null,
        ApprovedBy: r.approved_by || null,
        ForwardedAt: r.forwarded_at || null,
        ForwardedTo: r.forwarded_to || null,
        Items: (r.SpareRequestItems || []).map(i => ({
          Id: i.id,
          Sku: i.spare_id,
          SpareName: spareMap[i.spare_id] || `SP-${i.spare_id}`,
          RequestedQty: i.requested_qty,
          ApprovedQty: i.approved_qty || 0
        }))
      }));

      return res.json(formatted);
    }

    // Branch user flow (legacy table)
    const branchId = req.user?.branchId || req.user?.centerId || req.user?.branch;
    if (!branchId) return res.status(400).json({ error: 'branchId missing' });

    // Use raw SQL to avoid model association issues
    const requests = await sequelize.query(`
      SELECT sr.* FROM SpareRequests sr
      WHERE sr.BranchId = ?
      ORDER BY sr.CreatedAt DESC
    `, {
      replacements: [branchId],
      type: sequelize.QueryTypes.SELECT
    });

    // Get items for each request
    const requestsWithItems = await Promise.all(
      requests.map(async (reqRow) => {
        try {
          const items = await sequelize.query(
            'SELECT * FROM SpareRequestItems WHERE RequestId = ?',
            { replacements: [reqRow.Id], type: sequelize.QueryTypes.SELECT }
          );
          reqRow.Items = items;
        } catch (e) {
          console.warn(`Failed to fetch items for request ${reqRow.Id}:`, e.message);
          reqRow.Items = [];
        }
        return reqRow;
      })
    );

    res.json(requestsWithItems);
  } catch (err) {
    console.error('Get requests error:', err);
    res.status(500).json({ error: err.message, details: err.stack });
  }
});

// ========== GET SINGLE REQUEST ==========
router.get('/requests/:id', onlyBranch, async (req, res) => {
  try {
    const SpareRequest = sequelize.models.SpareRequest;
    const SpareRequestItem = sequelize.models.SpareRequestItem;

    const request = await SpareRequest.findOne({
      where: { Id: req.params.id },
      include: [{ model: SpareRequestItem, as: 'Items' }],
    });

    if (!request) return res.status(404).json({ error: 'Request not found' });
    res.json({ ok: true, request });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== APPROVE REQUEST (updates inventory & pushes to SC) ==========
router.post('/requests/:id/approve', onlyBranch, async (req, res) => {
  try {
    const userRole = (req.user && (req.user.role || req.user.Role || '')).toString().toLowerCase();
    const branchId = req.user?.branchId || req.user?.centerId || req.user?.branch;
    const branchName = req.user?.branchName || `${branchId}`;
    const { approvedQtys = {} } = req.body; // { itemId: qty, ... }

    const SpareRequest = sequelize.models.SpareRequest;
    const SpareRequestItem = sequelize.models.SpareRequestItem;
    const BranchInventory = sequelize.models.BranchInventory;
    const ServiceCenterInventory = sequelize.models.ServiceCenterInventory;

    // If RSM is approving: simple approve flow for modern spare_requests (no branch inventory ops)
    if (userRole === 'rsm') {
      const rsmUserId = req.user.id;
      // find ASC ids mapped to this RSM
      const ascRows = await sequelize.query(
        `SELECT DISTINCT sc.asc_id AS asc_id FROM service_centers sc
         JOIN rsm_state_mapping sm ON sm.state_id = sc.state_id AND sm.is_active = 1
         WHERE sm.rsm_user_id = ?`,
        { replacements: [rsmUserId], type: sequelize.QueryTypes.SELECT }
      );
      const ascIds = ascRows.map(r => r.asc_id).filter(Boolean);
      if (ascIds.length === 0) return res.status(403).json({ error: 'No ASCs mapped to this RSM' });

      // Try modern SpareRequest by request_id
      let request = await SpareRequest.findOne({
        where: { request_id: req.params.id, requested_to_type: 'branch', requested_to_id: ascIds[0] ? ascIds : ascIds },
        include: [{ model: SpareRequestItem, as: 'SpareRequestItems' }],
      });

      if (!request) return res.status(404).json({ error: 'Request not found or not accessible' });
      if (request.Status && request.Status !== 'pending') return res.status(400).json({ error: 'Request is not pending' });

      // Approve all items (set ApprovedQty = RequestedQty)
      for (const item of request.SpareRequestItems || []) {
        await item.update({ approved_qty: item.requested_qty, ApprovedQty: item.requested_qty }).catch(()=>{});
      }

      await request.update({ Status: 'approved', ApprovedAt: new Date(), ApprovedBy: `RSM-${rsmUserId}` }).catch(()=>{});
      return res.json({ ok: true, request });
    }

    // Branch user flow unchanged (existing inventory operations)
    const request = await SpareRequest.findOne({
      where: { Id: req.params.id, BranchId: branchId },
      include: [{ model: SpareRequestItem, as: 'Items' }],
    });

    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.Status !== 'pending') return res.status(400).json({ error: 'Request is not pending' });

    // Check if all items can be fully approved
    let canApprove = true;
    for (const item of request.Items) {
      const approvedQty = approvedQtys[item.Id] || item.RequestedQty;
      const inv = await BranchInventory.findOne({
        where: { BranchId: branchId, Sku: item.Sku },
      });
      if (!inv || inv.GoodQty < approvedQty) {
        canApprove = false;
        break;
      }
    }

    if (!canApprove) {
      // Forward to depot
      await request.update({
        Status: 'forwarded',
        ForwardedAt: new Date(),
        ForwardedTo: 'depot',
        Notes: (request.Notes || '') + ' [Forwarded due to insufficient inventory]',
      });
      return res.json({ ok: true, message: 'Request forwarded to depot due to insufficient inventory' });
    }

    // Proceed to approve since all items are available
    // Update each item, reduce branch inventory, and push to SC inventory
    for (const item of request.Items) {
      const approvedQty = approvedQtys[item.Id] || item.RequestedQty;
      
      // Update item
      await item.update({ ApprovedQty: approvedQty });

      // Reduce inventory from branch
      const inv = await BranchInventory.findOne({
        where: { BranchId: branchId, Sku: item.Sku },
      });

      if (inv) {
        const toTake = approvedQty; // Since we checked it's available
        await inv.update({ GoodQty: inv.GoodQty - toTake });

        // Push approved items to ServiceCenterInventory
        if (toTake > 0 && request.ServiceCenterId) {
          const existing = await ServiceCenterInventory.findOne({
            where: { ServiceCenterId: request.ServiceCenterId, Sku: item.Sku },
          });

          if (existing) {
            await existing.update({
              GoodQty: existing.GoodQty + toTake,
              ReceivedAt: new Date(),
              ReceivedFrom: branchName,
              UpdatedAt: new Date(),
            });
          } else {
            await ServiceCenterInventory.create({
              ServiceCenterId: request.ServiceCenterId,
              Sku: item.Sku,
              SpareName: item.SpareName,
              GoodQty: toTake,
              DefectiveQty: 0,
              ReceivedFrom: branchName,
              ReceivedAt: new Date(),
              CreatedAt: new Date(),
              UpdatedAt: new Date(),
            });
          }
        }
      }
    }

    // Update request status
    await request.update({
      Status: 'approved',
      ApprovedAt: new Date(),
      ApprovedBy: branchName || 'branch_user',
    });

    res.json({ ok: true, request });
  } catch (err) {
    console.error('Approve request error', err);
    res.status(500).json({ error: err.message });
  }
});

// ========== FORWARD REQUEST TO DEPOT ==========
router.post('/requests/:id/forward', onlyBranch, async (req, res) => {
  try {
    const branchId = req.user?.branchId || req.user?.centerId || req.user?.branch;
    const { depotLocation } = req.body;

    const SpareRequest = sequelize.models.SpareRequest;

    const request = await SpareRequest.findOne({
      where: { Id: req.params.id, BranchId: branchId },
    });

    if (!request) return res.status(404).json({ error: 'Request not found' });

    await request.update({
      Status: 'forwarded',
      ForwardedAt: new Date(),
      ForwardedTo: depotLocation || 'Roorkee Depot',
    });

    res.json({ ok: true, request });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== BRANCH INVENTORY ==========
router.get('/inventory', onlyBranch, async (req, res) => {
  try {
    // ...existing code...
    let branchId = req.user?.branchId || req.user?.centerId || req.user?.branch;
    // Use SpareInventory model (not BranchInventory)
    const SpareInventory = sequelize.models.SpareInventory;
    // If RSM, fetch inventory for all mapped branches
    const userRole = (req.user?.role || req.user?.Role || '').toString().toLowerCase();
    if (!branchId && userRole === 'rsm') {
      const rsmUserId = req.user.id;
      // Find all mapped branch IDs for this RSM (asc_id is the PK)
      const branchRows = await sequelize.query(
        `SELECT DISTINCT sc.asc_id AS branch_id FROM service_centers sc
         JOIN rsm_state_mapping sm ON sm.state_id = sc.state_id AND sm.is_active = 1
         WHERE sm.rsm_user_id = ?`,
        { replacements: [rsmUserId], type: sequelize.QueryTypes.SELECT }
      );
      const branchIds = branchRows.map(r => r.branch_id).filter(Boolean);
      if (!branchIds.length) {
        console.error('[RSM inventory] No mapped branches found for user:', req.user);
        return res.status(400).json({ error: 'RSM user: no mapped branches found.', user: req.user });
      }
      try {
        // Debug: log branchIds
        console.log('[RSM inventory] branchIds:', branchIds);
        // Fetch inventory for all mapped branches and join with SparePart for SKU and name
        const inventory = await SpareInventory.findAll({
          where: {
            location_type: 'branch',
            location_id: branchIds
          },
          include: [
            {
              model: sequelize.models.SparePart,
              attributes: ['Id', 'PART'],
              required: false,
            }
          ],
          order: [['spare_id', 'ASC']],
        });
        // Debug: log raw inventory result
        console.log('[RSM inventory] raw inventory:', inventory.map(i => i.toJSON ? i.toJSON() : i));
        // Map inventory to include normalized fields for frontend
        const mapped = inventory.map(item => {
          const raw = item.toJSON();
          return {
            ...raw,
            sku: raw.spare_id,
            spareName: raw.SparePart?.PART || '',
            goodQty: raw.qty_good ?? 0,
            defectiveQty: raw.qty_defective ?? 0,
            minStock: raw.min_stock ?? raw.MinimumStockLevel ?? '',
          };
        });
        // Debug: log mapped inventory
        console.log('[RSM inventory] mapped inventory:', mapped);
        return res.json({ ok: true, inventory: mapped });
      } catch (err) {
        console.error('[RSM inventory] Error fetching inventory:', err);
        return res.status(500).json({ error: err.message, details: err });
      }
    }
    if (!branchId) {
      console.error('[Branch inventory] branchId missing for user:', req.user);
      return res.status(400).json({ error: 'branchId missing', user: req.user });
    }
    try {
      // Fetch inventory for a single branch using SpareInventory
      const inventory = await SpareInventory.findAll({
        where: {
          location_type: 'branch',
          location_id: branchId
        },
        include: [
          {
            model: sequelize.models.SparePart,
            attributes: ['Id', 'PART'],
            required: false,
          }
        ],
        order: [['spare_id', 'ASC']],
      });
      // Normalize fields for frontend
      const mapped = inventory.map(item => {
        const raw = item.toJSON();
        return {
          ...raw,
          sku: raw.spare_id,
          spareName: raw.SparePart?.PART || '',
          goodQty: raw.qty_good ?? 0,
          defectiveQty: raw.qty_defective ?? 0,
          minStock: raw.min_stock ?? raw.MinimumStockLevel ?? '',
        };
      });
      res.json({ ok: true, inventory: mapped });
    } catch (err) {
      console.error('[Branch inventory] Error fetching inventory:', err);
      res.status(500).json({ error: err.message, details: err });
    }
  } catch (err) {
    console.error('[INVENTORY ROUTE] Unexpected error:', err);
    res.status(500).json({ error: err.message, details: err });
  }
});

// ========== ADJUST STOCK ==========
router.post('/inventory/adjust', onlyBranch, async (req, res) => {
  try {
    const branchId = req.user?.branchId || req.user?.centerId || req.user?.branch;
    const { sku, deltaGood = 0, deltaDefective = 0, notes } = req.body;

    if (!sku) return res.status(400).json({ error: 'sku required' });

    const BranchInventory = sequelize.models.BranchInventory;

    const item = await BranchInventory.findOne({
      where: { BranchId: branchId, Sku: sku },
    });

    if (!item) return res.status(404).json({ error: 'Item not found' });

    await item.update({
      GoodQty: Math.max(0, item.GoodQty + Number(deltaGood)),
      DefectiveQty: Math.max(0, item.DefectiveQty + Number(deltaDefective)),
    });

    res.json({ ok: true, item });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== MSL ALERTS ==========
router.get('/inventory/msl-alerts', onlyBranch, async (req, res) => {
  try {
    const branchId = req.user?.branchId || req.user?.centerId || req.user?.branch;
    if (!branchId) return res.status(400).json({ error: 'branchId missing' });

    const alerts = await sequelize.query(
      `SELECT * FROM BranchInventory 
       WHERE BranchId = ? AND GoodQty <= MinimumStockLevel
       ORDER BY GoodQty ASC`,
      { replacements: [branchId], type: sequelize.QueryTypes.SELECT }
    );

    res.json({ ok: true, alerts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== SERVICE CENTER: CREATE SPARE REQUEST ==========
// Called by service center when they request spares (from SparePartReturn or OrderRequest)
router.post('/requests/create', authenticateToken, requireRole('service_center'), async (req, res) => {
  try {
    const { branchId, items } = req.body; // items: [{sku, spareName, qty}, ...]
    const scId = req.user?.centerId || req.user?.id;

    console.log('Create request - Body:', req.body);
    console.log('Create request - SC ID:', scId);

    if (!branchId || !items || items.length === 0) {
      return res.status(400).json({ error: 'branchId and items required' });
    }

    const SpareRequest = sequelize.models.SpareRequest;
    const SpareRequestItem = sequelize.models.SpareRequestItem;
    const newSpareRequestItem=sequelize.models.newSpareRequestItem;
    // const requestItemDetails=sequelize.models.requestItemDetails;

    if (!SpareRequest || !SpareRequestItem) {
      console.error('Models not loaded: SpareRequest=', !!SpareRequest, 'SpareRequestItem=', !!SpareRequestItem);
      return res.status(500).json({ error: 'Required models not available' });
    }

    // Generate request number
    const requestNum = `REQ-${Date.now()}`;

    console.log('Creating request with:', { BranchId: branchId, ServiceCenterId: scId, RequestNumber: requestNum });

    // Create request
    const request = await SpareRequest.create({
      BranchId: branchId,
      ServiceCenterId: scId,
      RequestNumber: requestNum,
      Status: 'pending',
    });


    console.log('Request created:', request.Id);
// create items (with error handling for each item_)

    // Create items (with error handling for each item)
    const createdItems = [];
    for (const item of items) {
      try {
        console.log('Creating item:', { RequestId: request.Id, Sku: item.sku, Qty: item.qty });
        const createdItem = await SpareRequestItem.create({
          RequestId: request.Id,
          Sku: item.sku,
          SpareName: item.spareName || item.name,
          RequestedQty: item.qty || item.quantity,
          ApprovedQty: 0,
          // ReceivedQty: 0, // Commented out until migration is run
          // RejectedQty: 0,
        });
        createdItems.push(createdItem);
        console.log('Item created successfully:', createdItem.Id);
      } catch (itemErr) {
        console.error('Failed to create item:', itemErr.message);
        // Log but don't fail the entire request creation
      }
    }

    console.log(`Request creation successful: ${request.Id} with ${createdItems.length} items`);
    res.json({ ok: true, request, itemsCreated: createdItems.length });
  } catch (err) {
    console.error('Create request error:', err.message);
    console.error('Stack:', err.stack);
    res.status(500).json({ error: err.message });
  }
});

// ========== SERVICE CENTER: VIEW OWN INVENTORY ==========
// SC can view inventory that was approved and sent to them by branch
router.get('/sc/inventory', authenticateToken, async (req, res) => {
  try {
    const scId = req.user?.centerId || req.user?.id;
    if (!scId) return res.status(400).json({ error: 'SC ID missing in token' });

    const ServiceCenterInventory = sequelize.models.ServiceCenterInventory;
    
    if (!ServiceCenterInventory) {
      console.warn('ServiceCenterInventory model not loaded yet, returning empty inventory');
      return res.json({ ok: true, inventory: [] });
    }

    try {
      const inventory = await ServiceCenterInventory.findAll({
        where: { ServiceCenterId: scId },
        order: [['Sku', 'ASC']],
      });
      res.json({ ok: true, inventory });
    } catch (queryErr) {
      // Table might not exist yet
      console.warn('SC inventory query failed (table may not exist):', queryErr.message);
      res.json({ ok: true, inventory: [] });
    }
  } catch (err) {
    console.error('SC inventory error', err);
    res.json({ ok: true, inventory: [] });
  }
});

// ========== SERVICE CENTER: VIEW THEIR REQUESTS ==========
router.get('/sc/requests', authenticateToken, async (req, res) => {
  try {
    const scId = req.user?.centerId || req.user?.id;
    if (!scId) return res.status(400).json({ error: 'SC ID missing in token' });

    // Use raw SQL query to avoid model association issues
    const requests = await sequelize.query(`
      SELECT sr.* FROM SpareRequests sr
      WHERE sr.ServiceCenterId = ?
      ORDER BY sr.CreatedAt DESC
    `, {
      replacements: [scId],
      type: sequelize.QueryTypes.SELECT
    });

    // Get items for each request
    const requestsWithItems = await Promise.all(
      requests.map(async (req) => {
        try {
          const items = await sequelize.query(
            'SELECT * FROM SpareRequestItems WHERE RequestId = ?',
            { replacements: [req.Id], type: sequelize.QueryTypes.SELECT }
          );
          return { ...req, Items: items };
        } catch (e) {
          console.warn(`Failed to fetch items for request ${req.Id}:`, e.message);
          return { ...req, Items: [] };
        }
      })
    );

    res.json({ ok: true, requests: requestsWithItems });
  } catch (err) {
    console.error('SC requests error:', err);
    res.status(500).json({ error: err.message, details: err.stack });
  }
});

// ========== LIST BRANCH RETURN REQUESTS ==========
router.get('/branch-requests', onlyBranch, async (req, res) => {
  try {
    const branchId = req.user?.branchId || req.user?.centerId || req.user?.branch;
    if (!branchId) return res.status(400).json({ error: 'branchId missing' });

    // Fetch requests
    const requests = await sequelize.query(`
      SELECT sr.Id, sr.RequestNumber, sr.Status, sr.CreatedAt, b.BranchName as branchName, sc.CenterName as serviceCenterName
      FROM SpareRequests sr
      LEFT JOIN Branches b ON sr.BranchId = b.Id
      LEFT JOIN ServiceCenters sc ON sr.ServiceCenterId = sc.Id
      WHERE sr.BranchId = ? AND sr.Status = 'Return Requested'
      ORDER BY sr.CreatedAt DESC
    `, {
      replacements: [branchId],
      type: sequelize.QueryTypes.SELECT
    });

    // For each request, fetch items
    for (const req of requests) {
      const items = await sequelize.query(`
        SELECT sri.Sku, sri.SpareName, sri.RequestedQty
        FROM SpareRequestItems sri
        WHERE sri.RequestId = ?
      `, {
        replacements: [req.Id],
        type: sequelize.QueryTypes.SELECT
      });
      req.Items = items;
    }

    res.json(requests);
  } catch (error) {
    console.error('Error fetching branch requests:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========== GET DETAILS OF A RETURN REQUEST ==========
router.get('/branch-requests/:id/details', onlyBranch, async (req, res) => {
  try {
    const { id } = req.params;
    const branchId = req.user?.branchId || req.user?.centerId || req.user?.branch;

    // First, verify the request belongs to the branch
    const requestCheck = await sequelize.query(`
      SELECT sr.RequestNumber, sr.Id,
             ISNULL(sr.CfApprovalDate, NULL) as CfApprovalDate,
             ISNULL(sr.CfRejectionDate, NULL) as CfRejectionDate
      FROM SpareRequests sr 
      WHERE sr.Id = ? AND sr.BranchId = ?
    `, {
      replacements: [id, branchId],
      type: sequelize.QueryTypes.SELECT,
      raw: true
    }).catch(err => {
      // Fallback if columns don't exist yet
      return sequelize.query(`
        SELECT sr.RequestNumber, sr.Id FROM SpareRequests sr WHERE sr.Id = ? AND sr.BranchId = ?
      `, {
        replacements: [id, branchId],
        type: sequelize.QueryTypes.SELECT,
        raw: true
      });
    });
    
    if (requestCheck.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }
    const requestNumber = requestCheck[0].RequestNumber;
    const cfApprovalDate = requestCheck[0].CfApprovalDate || null;
    const cfRejectionDate = requestCheck[0].CfRejectionDate || null;

    // Get the items
    const items = await sequelize.query(`
      SELECT sri.Sku, sri.SpareName, sri.RequestedQty, sri.ReceivedQty, sri.ApprovedQty, sri.RejectedQty
      FROM SpareRequestItems sri
      WHERE sri.RequestId = ?
    `, {
      replacements: [id],
      type: sequelize.QueryTypes.SELECT
    });

    console.log(`[GET DETAILS] Request ${id} items:`, JSON.stringify(items, null, 2));

    // Calculate total qty
    const totalQty = items.reduce((sum, item) => sum + item.RequestedQty, 0);

    res.json({
      id: requestCheck[0].Id,
      requestNumber,
      cfApprovalDate,
      cfRejectionDate,
      items: items.map(item => ({
        partCode: item.Sku,
        partDescription: item.SpareName,
        qtyDcf: item.RequestedQty,
        cfReceivedQty: item.ReceivedQty,
        cfApprovedQty: item.ApprovedQty,
        cfRejectedQty: item.RejectedQty,
      })),
      totalQty
    });
  } catch (error) {
    console.error('Error fetching request details:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========== UPDATE APPROVED, REJECTED AND RECEIVED QTYS ==========
router.put('/branch-requests/:id/items', onlyBranch, async (req, res) => {
  const { id } = req.params;
  const { items } = req.body; // array of { partCode, receivedQty, approvedQty, rejectedQty }
  const branchId = req.user?.branchId || req.user?.centerId || req.user?.branch;

  console.log(`[UPDATE ITEMS] Request ID: ${id}, Items to update:`, JSON.stringify(items, null, 2));

  const transaction = await sequelize.transaction();
  try {
    // Verify the request belongs to the branch
    const requestCheck = await sequelize.query(`
      SELECT 1 FROM SpareRequests WHERE Id = ? AND BranchId = ?
    `, {
      replacements: [id, branchId],
      type: sequelize.QueryTypes.SELECT,
      transaction
    });
    if (requestCheck.length === 0) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Request not found' });
    }

    let hasApprovals = false;
    let hasRejections = false;
    const currentDate = new Date();

    for (const item of items) {
      console.log(`[UPDATE ITEMS] Processing item:`, item);
      // Get the item to validate quantities
      const itemData = await sequelize.query(`
        SELECT Id, RequestedQty, ReceivedQty FROM SpareRequestItems WHERE RequestId = ? AND Sku = ?
      `, {
        replacements: [id, item.partCode || item.sku],
        type: sequelize.QueryTypes.SELECT,
        transaction
      });
      
      console.log(`[UPDATE ITEMS] Found items for ${item.partCode || item.sku}:`, itemData);

      if (itemData.length === 0) {
        await transaction.rollback();
        return res.status(400).json({ error: `Item ${item.partCode || item.sku} not found in request` });
      }
      
      // Get quantities
      const requestedQty = parseInt(itemData[0].RequestedQty) || 0;
      const receivedQty = parseInt(item.receivedQty) || 0;
      const approvedQty = parseInt(item.approvedQty) || 0;
      const rejectedQty = parseInt(item.rejectedQty) || 0;
      
      console.log(`[UPDATE ITEMS] Quantities - Requested: ${requestedQty}, Received: ${receivedQty}, Approved: ${approvedQty}, Rejected: ${rejectedQty}`);

      // Validate: Received qty should not exceed requested qty
      if (receivedQty > requestedQty) {
        await transaction.rollback();
        return res.status(400).json({ error: `C&F Received QTY for ${item.partCode || item.sku} cannot exceed QTY DCF (${requestedQty})` });
      }
      
      // Validate: Approved qty should not exceed received qty
      if (approvedQty > receivedQty) {
        await transaction.rollback();
        return res.status(400).json({ error: `C&F Approved QTY for ${item.partCode || item.sku} cannot exceed Received QTY (${receivedQty})` });
      }
      
      // Track if there are approvals or rejections
      if (approvedQty > 0) {
        hasApprovals = true;
      }
      if (rejectedQty > 0) {
        hasRejections = true;
      }
      
      // Update the quantities
      const updateResult = await sequelize.query(`
        UPDATE SpareRequestItems SET ReceivedQty = ?, ApprovedQty = ?, RejectedQty = ? WHERE RequestId = ? AND Sku = ?
      `, {
        replacements: [receivedQty, approvedQty, rejectedQty, id, item.partCode || item.sku],
        type: sequelize.QueryTypes.UPDATE,
        transaction
      });
      console.log(`[UPDATE ITEMS] Updated rows for ${item.partCode || item.sku}:`, updateResult);
    }

    // Try to update the SpareRequest with C&F approval/rejection date
    // This is optional - if column doesn't exist, skip this part
    if (hasApprovals || hasRejections) {
      try {
        // Format date to SQL Server format (YYYY-MM-DD HH:mm:ss)
        const formattedDate = currentDate.toISOString().slice(0, 19).replace('T', ' ');
        // Set the date whenever there are approvals or rejections
        await sequelize.query(`
          UPDATE SpareRequests SET CfApprovalDate = ? WHERE Id = ?
        `, {
          replacements: [formattedDate, id],
          type: sequelize.QueryTypes.UPDATE,
          transaction
        });
      } catch (dateUpdateError) {
        // Log but don't fail if date column doesn't exist yet
        console.warn('Could not update approval/rejection date (column may not exist yet):', dateUpdateError.message);
      }
    }

    await transaction.commit();
    
    // Verify the update was successful
    const verifyItems = await sequelize.query(`
      SELECT Sku, ReceivedQty, ApprovedQty, RejectedQty FROM SpareRequestItems WHERE RequestId = ?
    `, {
      replacements: [id],
      type: sequelize.QueryTypes.SELECT
    });
    console.log(`[UPDATE ITEMS] Verification after commit - Updated items:`, JSON.stringify(verifyItems, null, 2));
    
    res.json({ message: 'Items updated successfully' });
  } catch (error) {
    try {
      await transaction.rollback();
    } catch (rollbackError) {
      console.error('Error rolling back transaction:', rollbackError.message);
    }
    console.error('Error updating items:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// ========== UPDATE REQUEST STATUS ==========
router.put('/branch-requests/:id/status', onlyBranch, async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'Approved' or 'Rejected'
  const branchId = req.user?.branchId || req.user?.centerId || req.user?.branch;

  try {
    // Verify the request belongs to the branch
    const requestCheck = await sequelize.query(`
      SELECT 1 FROM SpareRequests WHERE Id = ? AND BranchId = ?
    `, {
      replacements: [id, branchId],
      type: sequelize.QueryTypes.SELECT
    });
    if (requestCheck.length === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const [updated] = await sequelize.query(`
      UPDATE SpareRequests SET Status = ? WHERE Id = ?
    `, {
      replacements: [status, id],
      type: sequelize.QueryTypes.UPDATE
    });
    if (updated === 0) {
      return res.status(404).json({ error: 'Request not found' });
    }
    res.json({ message: 'Status updated successfully' });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========== GET ALL BRANCHES ==========
router.get('/branches', authenticateToken, async (req, res) => {
  try {
    const branches = await sequelize.query(`
      SELECT Id, BranchName FROM Branches WHERE Active = 1 ORDER BY BranchName
    `, {
      type: sequelize.QueryTypes.SELECT
    });
    res.json(branches);
  } catch (error) {
    console.error('Error fetching branches:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========== GET SERVICE CENTERS BY BRANCH ==========
router.get('/service-centers', authenticateToken, async (req, res) => {
  const { branchId } = req.query;
  if (!branchId) {
    return res.status(400).json({ error: 'branchId required' });
  }
  try {
    const serviceCenters = await sequelize.query(`
      SELECT Id, CenterName FROM ServiceCenters WHERE BranchId = ? ORDER BY CenterName
    `, {
      replacements: [branchId],
      type: sequelize.QueryTypes.SELECT
    });
    res.json(serviceCenters);
  } catch (error) {
    console.error('Error fetching service centers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ========== GET BRANCHES ASSIGNED TO RSM ==========
router.get('/rsm-branches', authenticateToken, async (req, res) => {
  try {
    // For RSM role, get branches assigned to their state
    const userId = req.user?.id;
    const role = req.user?.role;
    
    if (role !== 'rsm') {
      // If not RSM, return all branches
      const branches = await sequelize.query(`
        SELECT Id, BranchName FROM Branches WHERE Active = 1 ORDER BY BranchName
      `, {
        type: sequelize.QueryTypes.SELECT
      });
      return res.json(branches.map(b => ({
        id: b.Id,
        label: b.BranchName,
        ...b
      })));
    }

    // For RSM, get branches from their assigned states
    const rsmBranches = await sequelize.query(`
      SELECT DISTINCT b.Id, b.BranchName 
      FROM Branches b
      INNER JOIN States s ON b.StateId = s.StateId
      INNER JOIN rsm_state_mapping rsm ON s.StateId = rsm.state_id
      WHERE rsm.rsm_user_id = ? AND rsm.is_active = 1 AND b.Active = 1
      ORDER BY b.BranchName
    `, {
      replacements: [userId],
      type: sequelize.QueryTypes.SELECT
    });

    res.json(rsmBranches.map(b => ({
      id: b.Id,
      label: b.BranchName,
      ...b
    })));
  } catch (error) {
    console.error('Error fetching RSM branches:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Function to send to SAP HANA and get CN
async function sendToSapHana(requestNumber, dcfNo) {
  try {
    const response = await fetch('https://your-sap-hana-api-endpoint/send', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer your-token',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        requestNumber,
        dcfNo
      })
    });
    if (!response.ok) {
      throw new Error(`SAP HANA API error: ${response.status}`);
    }
    const data = await response.json();
    return data.cn; // Assuming the response has { cn: 'challan-number' }
  } catch (error) {
    console.error('SAP HANA API error:', error);
    throw error;
  }
}

export default router;
