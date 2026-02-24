import express from 'express';
import technicianController from '../controllers/technicianController.js';
import servicecenterController from '../controllers/servicecenterController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const techRouter = express.Router();
const scRouter = express.Router();

// Technicians routes
techRouter.get('/', technicianController.list);
techRouter.get('/by-centre', technicianController.listByCenter);
techRouter.get('/:id', technicianController.getById);

// Service center routes (protected)
scRouter.use(authenticateToken, requireRole('service_center'));
scRouter.post('/add', servicecenterController.addCenter);
scRouter.get('/all', servicecenterController.listAll);
scRouter.post('/assign-technician', servicecenterController.assignTechnician);

export { techRouter as techniciansRoute, scRouter as servicecenterRoute };
