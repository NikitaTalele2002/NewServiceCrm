import express from 'express';
const router = express.Router();
import spareReturnService from '../../../services/spareReturnRequestService.js';

/**
 * GET /api/mobile/spare-returns
 */
router.get('/', async (req, res) => {
    try {
        const { technicianId } = req.query;
        // Service typically has list methods
        const returns = await spareReturnService.getTechnicianReturnRequests(technicianId);
        res.json({ success: true, data: returns });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to fetch returns' });
    }
});

/**
 * GET /api/mobile/spare-returns/:id
 */
router.get('/:id', async (req, res) => {
    try {
        const detail = await spareReturnService.getReturnRequestDetails(req.params.id);
        res.json({ success: true, data: detail });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Return detail not found' });
    }
});

export default router;
