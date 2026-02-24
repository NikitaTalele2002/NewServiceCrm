import express from 'express';
import complaintController from '../controllers/complaintController.js';
import { optionalAuthenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/', complaintController.register);
router.get('/', optionalAuthenticate, complaintController.list);
router.post('/assign-technician', complaintController.assignTechnician);

export default router;
