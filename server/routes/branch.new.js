import express from 'express';
import { authenticateToken, requireRole, optionalAuthenticate } from '../middleware/auth.js';
import * as branchController from '../controllers/branchController.js';

const router = express.Router();

// Dashboard
router.get('/dashboard', authenticateToken, branchController.getDashboard);

// Branch Requests
router.get('/requests', authenticateToken, branchController.listRequests);
router.get('/requests/:id', authenticateToken, branchController.getRequest);
router.post('/requests/:id/approve', authenticateToken, requireRole('branch'), branchController.approveRequest);
router.post('/requests/:id/forward', authenticateToken, requireRole('branch'), branchController.forwardRequest);
router.post('/requests/create', authenticateToken, requireRole('service_center'), branchController.createRequest);

// Branch Inventory
router.get('/inventory', authenticateToken, branchController.getInventory);
router.post('/inventory/adjust', authenticateToken, requireRole('branch'), branchController.adjustInventory);
router.get('/inventory/msl-alerts', authenticateToken, branchController.getMSLAlerts);

// Service Center Operations
router.get('/sc/inventory', authenticateToken, requireRole('service_center'), branchController.getSCInventory);
router.get('/sc/requests', authenticateToken, requireRole('service_center'), branchController.getSCRequests);

// Utilities
router.get('/branches', optionalAuthenticate, branchController.getBranches);
router.get('/service-centers', authenticateToken, branchController.getServiceCenters);

// Return Requests
router.get('/branch-requests', authenticateToken, branchController.getBranchReturnRequests);
router.get('/branch-requests/:id/details', authenticateToken, branchController.getBranchReturnRequestDetails);
router.put('/branch-requests/:id/items', authenticateToken, branchController.updateBranchReturnRequestItems);
router.put('/branch-requests/:id/status', authenticateToken, branchController.updateBranchReturnRequestStatus);

export default router;
