import express from 'express';
const router = express.Router();
import { authenticateToken } from '../../../middleware/auth.js';

import myCallsRouter from './my_calls.js';
import inventoryRouter from './inventory.js';
import spareRequestsRouter from './spare_requests.js';
import sparePartsRouter from './spare_parts.js';
import profileRouter from './profile.js';
import dashboardRouter from './dashboard.js';
import trackingRouter from './tracking.js';
import spareReturnsRouter from './spare_returns.js';
// import { uploadCallAttachment } from '../../../controllers/callAttachmentController.js';
// import { imageUpload } from '../../../controllers/uploadController.js';

// Base route for technician mobile API
router.get('/test', authenticateToken, (req, res) => {
    console.log('GET /api/technician-mobile/test hit');
    res.json({
        success: true,
        message: 'Technician Mobile API is active',
        user: req.user
    });
});

router.use('/spare-requests', authenticateToken, spareRequestsRouter);
router.use('/spare-parts', sparePartsRouter);
router.use('/profile', authenticateToken, profileRouter);
router.use('/dashboard', authenticateToken, dashboardRouter);
router.use('/my-calls', authenticateToken, myCallsRouter);
router.use('/inventory', authenticateToken, inventoryRouter);
router.use('/tracking', authenticateToken, trackingRouter);
router.use('/spare-returns', authenticateToken, spareReturnsRouter);

// // Call Attachment Upload
// router.post('/call-attachment', authenticateToken, imageUpload.single('file'), uploadCallAttachment);

export default router;
