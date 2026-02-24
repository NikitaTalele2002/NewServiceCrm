import express from 'express';
import customerController from '../controllers/customerController.js';

const router = express.Router();

// Public routes
router.post('/', customerController.createCustomer);
router.post('/search', customerController.searchCustomer);

export default router;


