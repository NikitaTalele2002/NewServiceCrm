import express from 'express';
import servicecenterController from '../controllers/servicecenterController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken, requireRole('service_center'));

router.post('/add', servicecenterController.addCenter);
router.get('/all', servicecenterController.listAll);
router.post('/assign-technician', servicecenterController.assignTechnician);

export default router;
