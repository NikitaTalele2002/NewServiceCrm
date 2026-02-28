import express from 'express';
const router = express.Router();
import techSpareService from '../../../services/technicianSpareRequestService.js';

/**
 * GET /api/mobile/spare-requests
 * Fetch requests for the technician
 */
router.get('/', async (req, res) => {
    try {
        const { technicianId } = req.query;
        if (!technicianId) return res.status(400).json({ success: false, error: 'technicianId required' });

        // The service has a method to get requests for a service center, 
        // we might need to filter or find the specific technician one.
        const requests = await techSpareService.getTechnicianRequestsForServiceCenter(null, technicianId);

        res.json({ success: true, count: requests.length, data: requests });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to fetch requests', details: err.message });
    }
});

/**
 * GET /api/mobile/spare-requests/:id
 */
router.get('/:id', async (req, res) => {
    try {
        const detail = await techSpareService.getTechnicianRequestDetails(req.params.id);
        res.json({ success: true, data: detail });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Request not found' });
    }
});

export default router;
