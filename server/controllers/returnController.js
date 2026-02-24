import * as returnService from '../services/returnService.js';

// GET /api/returns/service-centers/:id/inventory/groups
export async function getInventoryGroups(req, res) {
  try {
    const scId = req.params.id;
    const results = await returnService.getInventoryGroups(scId);
    res.json(results);
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
}

// GET /api/returns/service-centers/:id/inventory/products
export async function getInventoryProducts(req, res) {
  try {
    const scId = req.params.id;
    const { group } = req.query;
    const results = await returnService.getInventoryProducts(scId, group);
    res.json(results);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
}

// GET /api/returns/service-centers/:id/inventory/models
export async function getInventoryModels(req, res) {
  try {
    const scId = req.params.id;
    const { product } = req.query;
    const results = await returnService.getInventoryModels(scId, product);
    res.json(results);
  } catch (error) {
    console.error('Error fetching models:', error);
    res.status(500).json({ error: 'Failed to fetch models' });
  }
}

// GET /api/returns/service-centers/:id/inventory/spares
export async function getInventorySpares(req, res) {
  try {
    const scId = req.params.id;
    const { model } = req.query;
    const results = await returnService.getInventorySpares(scId, model);
    res.json(results);
  } catch (error) {
    console.error('Error fetching spares:', error);
    res.status(500).json({ error: 'Failed to fetch spares' });
  }
}

// GET /api/returns/service-centers/:id/inventory
export async function getServiceCenterInventory(req, res) {
  try {
    const scId = req.params.id;
    const { group, product, model, spare } = req.query;
    const results = await returnService.getServiceCenterInventory(scId, group, product, model, spare);
    res.json(results);
  } catch (error) {
    console.error('Error fetching inventory:', error);
    res.status(500).json({ error: 'Failed to fetch inventory' });
  }
}

// POST /api/returns - Submit spare return request
export async function submitReturnRequest(req, res) {
  try {
    const { returnType, items } = req.body;
    const userId = req.user.id;
    const centerId = req.user.centerId;

    const result = await returnService.submitReturnRequest(returnType, items, userId, centerId);
    res.json({ success: true, message: 'Return request submitted successfully', requestId: result.id });
  } catch (error) {
    console.error('Error submitting return request:', error);
    res.status(400).json({ error: error.message });
  }
}

// GET /api/returns/branch-requests
export async function getBranchReturnRequests(req, res) {
  try {
    const branchId = req.user.branchId;
    if (!branchId) {
      return res.status(400).json({ error: 'User not associated with a branch' });
    }

    const requests = await returnService.getBranchReturnRequests(branchId);
    res.json(requests);
  } catch (error) {
    console.error('Error fetching branch requests:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// GET /api/returns/branch-requests/:id/details
export async function getBranchReturnRequestDetails(req, res) {
  try {
    const { id } = req.params;
    const branchId = req.user.branchId;

    const result = await returnService.getBranchReturnRequestDetails(id, branchId);
    res.json(result);
  } catch (error) {
    console.error('Error fetching request details:', error);
    res.status(error.message === 'Request not found' ? 404 : 500).json({ error: 'Internal server error' });
  }
}

// PUT /api/returns/branch-requests/:id/items
export async function updateReturnRequestItems(req, res) {
  try {
    const { id } = req.params;
    const { items } = req.body;
    const branchId = req.user.branchId;

    await returnService.updateReturnRequestItems(id, branchId, items);
    res.json({ message: 'Items updated successfully' });
  } catch (error) {
    console.error('Error updating items:', error);
    res.status(error.message === 'Request not found' ? 404 : 400).json({ error: error.message });
  }
}

// GET /api/returns/service-center-requests
export async function getServiceCenterReturnRequests(req, res) {
  try {
    const serviceCenterId = req.user.centerId;
    if (!serviceCenterId) {
      return res.status(400).json({ error: 'User not associated with a service center' });
    }

    const requests = await returnService.getServiceCenterReturnRequests(serviceCenterId);
    res.json(requests);
  } catch (error) {
    console.error('Error fetching service center return requests:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// GET /api/returns/service-center-requests/:id/details
export async function getServiceCenterReturnRequestDetails(req, res) {
  try {
    const { id } = req.params;
    const serviceCenterId = req.user.centerId;

    const result = await returnService.getServiceCenterReturnRequestDetails(id, serviceCenterId);
    res.json(result);
  } catch (error) {
    console.error('Error fetching request details:', error);
    res.status(error.message === 'Request not found' ? 404 : 500).json({ error: 'Internal server error' });
  }
}
