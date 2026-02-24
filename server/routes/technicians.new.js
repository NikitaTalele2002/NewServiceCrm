import express from 'express';
import technicianController from '../controllers/technicianController.js';

const router = express.Router();

router.get('/', technicianController.list);
router.get('/by-centre', technicianController.listByCenter);
router.get('/:id', technicianController.getById);

export default router;
