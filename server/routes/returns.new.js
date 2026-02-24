import express from 'express';
import { authenticateToken, optionalAuthenticate } from '../middleware/auth.js';
import * as returnController from '../controllers/returnController.js';

const router = express.Router();

// Service center inventory hierarchy routes
router.get('/service-centers/:id/inventory/groups', optionalAuthenticate, returnController.getInventoryGroups);
router.get('/service-centers/:id/inventory/products', optionalAuthenticate, returnController.getInventoryProducts);
router.get('/service-centers/:id/inventory/models', optionalAuthenticate, returnController.getInventoryModels);
router.get('/service-centers/:id/inventory/spares', optionalAuthenticate, returnController.getInventorySpares);
router.get('/service-centers/:id/inventory', optionalAuthenticate, returnController.getServiceCenterInventory);

// Return request creation
router.post('/', authenticateToken, returnController.submitReturnRequest);

// Branch return requests
router.get('/branch-requests', authenticateToken, returnController.getBranchReturnRequests);
router.get('/branch-requests/:id/details', authenticateToken, returnController.getBranchReturnRequestDetails);
router.put('/branch-requests/:id/items', authenticateToken, returnController.updateReturnRequestItems);

// Service center return requests
router.get('/service-center-requests', authenticateToken, returnController.getServiceCenterReturnRequests);
router.get('/service-center-requests/:id/details', authenticateToken, returnController.getServiceCenterReturnRequestDetails);

export default router;
