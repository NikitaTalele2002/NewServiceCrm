import express from 'express';
import { authenticateToken, optionalAuthenticate } from '../middleware/auth.js';
import * as spareRequestController from '../controllers/spareRequestController.js';

const router = express.Router();

// List and create routes
router.get('/', optionalAuthenticate, spareRequestController.list);
router.post('/', authenticateToken, spareRequestController.create);

// Replacement history
router.get('/replacement-history', optionalAuthenticate, spareRequestController.getReplacementHistory);

// Get single request details
router.get('/:id', optionalAuthenticate, spareRequestController.getById);

// Check and allocate
router.get('/:id/can-allocate', optionalAuthenticate, spareRequestController.canAllocate);
router.post('/:id/allocate', authenticateToken, spareRequestController.allocate);

// Order from branch
router.post('/:id/order-from-branch', authenticateToken, spareRequestController.orderFromBranch);

// Return parts
router.post('/:id/return', authenticateToken, spareRequestController.returnParts);

// Availability check
router.get('/:id/availability', optionalAuthenticate, spareRequestController.checkAvailability);

// Rental returns
router.get('/rental-returns', authenticateToken, spareRequestController.getRentalReturns);

// Bulk returns
router.post('/return', authenticateToken, spareRequestController.bulkReturn);

// Technician routes
router.get('/technicians', optionalAuthenticate, spareRequestController.getTechnicians);
router.get('/technicians/:id/inventory', optionalAuthenticate, spareRequestController.getTechnicianInventory);
router.get('/technicians/inventory', optionalAuthenticate, spareRequestController.getAllTechnicianInventories);

// Spare parts availability
router.get('/spare-parts/:sku/availability', authenticateToken, spareRequestController.checkSparePartAvailability);

// Replacement request
router.post('/replacement', authenticateToken, spareRequestController.createReplacement);

export default router;
