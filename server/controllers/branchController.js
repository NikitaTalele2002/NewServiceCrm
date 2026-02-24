import * as branchService from '../services/branchService.js';

// GET /api/branch/dashboard
export async function getDashboard(req, res) {
  try {
    const branchId = req.user?.branchId || req.user?.centerId || req.user?.branch;
    if (!branchId) return res.status(400).json({ error: 'branchId missing in token' });

    const result = await branchService.getBranchDashboard(branchId);
    res.json(result);
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: err.message });
  }
}

// GET /api/branch/requests
export async function listRequests(req, res) {
  try {
    const branchId = req.user?.branchId || req.user?.centerId || req.user?.branch;
    if (!branchId) return res.status(400).json({ error: 'branchId missing' });

    const result = await branchService.listBranchRequests(branchId);
    res.json(result);
  } catch (err) {
    console.error('Get requests error:', err);
    res.status(500).json({ error: err.message, details: err.stack });
  }
}

// GET /api/branch/requests/:id
export async function getRequest(req, res) {
  try {
    const result = await branchService.getBranchRequest(req.params.id);
    res.json(result);
  } catch (err) {
    res.status(err.message === 'Request not found' ? 404 : 500).json({ error: err.message });
  }
}

// POST /api/branch/requests/:id/approve
export async function approveRequest(req, res) {
  try {
    const branchId = req.user?.branchId || req.user?.centerId || req.user?.branch;
    const { approvedQtys = {} } = req.body;

    const result = await branchService.approveBranchRequest(req.params.id, branchId, approvedQtys);
    res.json(result);
  } catch (err) {
    console.error('Approve request error:', err);
    res.status(400).json({ error: err.message });
  }
}

// POST /api/branch/requests/:id/forward
export async function forwardRequest(req, res) {
  try {
    const branchId = req.user?.branchId || req.user?.centerId || req.user?.branch;
    const { depotLocation } = req.body;

    const result = await branchService.forwardBranchRequest(req.params.id, branchId, depotLocation);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

// GET /api/branch/inventory
export async function getInventory(req, res) {
  try {
    const branchId = req.user?.branchId || req.user?.centerId || req.user?.branch;
    if (!branchId) return res.status(400).json({ error: 'branchId missing' });

    const result = await branchService.getBranchInventory(branchId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /api/branch/inventory/adjust
export async function adjustInventory(req, res) {
  try {
    const branchId = req.user?.branchId || req.user?.centerId || req.user?.branch;
    const { sku, deltaGood = 0, deltaDefective = 0, notes } = req.body;

    const result = await branchService.adjustBranchStock(branchId, sku, deltaGood, deltaDefective, notes);
    res.json(result);
  } catch (err) {
    res.status(err.message === 'Item not found' ? 404 : 400).json({ error: err.message });
  }
}

// GET /api/branch/inventory/msl-alerts
export async function getMSLAlerts(req, res) {
  try {
    const branchId = req.user?.branchId || req.user?.centerId || req.user?.branch;
    if (!branchId) return res.status(400).json({ error: 'branchId missing' });

    const result = await branchService.getBranchMSLAlerts(branchId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// POST /api/branch/requests/create
export async function createRequest(req, res) {
  try {
    const { branchId, items } = req.body;
    const scId = req.user?.centerId || req.user?.id;

    const result = await branchService.createSpareRequest(branchId, items, scId);
    res.json(result);
  } catch (err) {
    console.error('Create request error:', err.message);
    res.status(400).json({ error: err.message });
  }
}

// GET /api/branch/sc/inventory
export async function getSCInventory(req, res) {
  try {
    const scId = req.user?.centerId || req.user?.id;
    if (!scId) return res.status(400).json({ error: 'SC ID missing in token' });

    const result = await branchService.getServiceCenterInventory(scId);
    res.json(result);
  } catch (err) {
    console.error('SC inventory error:', err);
    res.json({ ok: true, inventory: [] });
  }
}

// GET /api/branch/sc/requests
export async function getSCRequests(req, res) {
  try {
    const scId = req.user?.centerId || req.user?.id;
    if (!scId) return res.status(400).json({ error: 'SC ID missing in token' });

    const result = await branchService.getServiceCenterRequests(scId);
    res.json(result);
  } catch (err) {
    console.error('SC requests error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch SC requests', details: err.stack });
  }
}

// GET /api/branch/branches
export async function getBranches(req, res) {
  try {
    const branches = await branchService.getBranches();
    res.json(branches);
  } catch (error) {
    console.error('Error fetching branches:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// GET /api/branch/service-centers
export async function getServiceCenters(req, res) {
  const { branchId } = req.query;
  if (!branchId) {
    return res.status(400).json({ error: 'branchId required' });
  }
  try {
    const serviceCenters = await branchService.getServiceCentersByBranch(branchId);
    res.json(serviceCenters);
  } catch (error) {
    console.error('Error fetching service centers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// GET /api/branch/branch-requests
export async function getBranchReturnRequests(req, res) {
  try {
    const branchId = req.user?.branchId || req.user?.centerId || req.user?.branch;
    if (!branchId) return res.status(400).json({ error: 'branchId missing' });

    const requests = await branchService.getBranchReturnRequests(branchId);
    res.json(requests);
  } catch (error) {
    console.error('Error fetching branch requests:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// GET /api/branch/branch-requests/:id/details
export async function getBranchReturnRequestDetails(req, res) {
  try {
    const { id } = req.params;
    const branchId = req.user?.branchId || req.user?.centerId || req.user?.branch;

    const result = await branchService.getBranchReturnRequestDetails(id, branchId);
    res.json(result);
  } catch (error) {
    console.error('Error fetching request details:', error);
    res.status(error.message === 'Request not found' ? 404 : 500).json({ error: 'Internal server error' });
  }
}

// PUT /api/branch/branch-requests/:id/items
export async function updateBranchReturnRequestItems(req, res) {
  try {
    const { id } = req.params;
    const { items } = req.body;
    const branchId = req.user?.branchId || req.user?.centerId || req.user?.branch;

    await branchService.updateBranchReturnRequestItems(id, branchId, items);
    res.json({ message: 'Items updated successfully' });
  } catch (error) {
    console.error('Error updating items:', error);
    res.status(error.message === 'Request not found' ? 404 : 400).json({ error: error.message });
  }
}

// PUT /api/branch/branch-requests/:id/status
export async function updateBranchReturnRequestStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const branchId = req.user?.branchId || req.user?.centerId || req.user?.branch;

    await branchService.updateBranchRequestStatus(id, branchId, status);
    res.json({ message: 'Status updated successfully' });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(error.message === 'Request not found' ? 404 : 500).json({ error: 'Internal server error' });
  }
}
