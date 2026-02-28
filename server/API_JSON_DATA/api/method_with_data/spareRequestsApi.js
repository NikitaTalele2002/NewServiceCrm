import express from 'express';
const router = express.Router();
import { SparePart, SpareRequest, SpareRequestItem, Technicians } from '../../../models/index.js';

/**
 * GET /api/mobile/spare-requests
 * List my spare requests
 */
router.get('/', async (req, res) => {
    try {
        const technicianId = req.query.technician_id || req.user?.id;

        if (!technicianId) {
            return res.status(400).json({ success: false, error: 'Technician ID required' });
        }

        const requests = await SpareRequest.findAll({
            where: {
                requested_source_id: technicianId,
                requested_source_type: 'technician'
            },
            include: [{ model: SpareRequestItem, as: 'Items' }],
            order: [['created_at', 'DESC']]
        });

        res.json({
            success: true,
            count: requests.length,
            data: requests
        });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to fetch requests', details: err.message });
    }
});

/**
 * POST /api/mobile/spare-requests/create
 */
router.post('/create', async (req, res) => {
    try {
        const { technician_id, items, call_id, reason } = req.body;

        // Logic to create SpareRequest and SpareRequestItems
        // returns finalized JSON

        res.json({
            success: true,
            message: 'Spare request created successfully',
            data: {
                requestId: `REQ-${Date.now()}`,
                status: 'pending'
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to create request' });
    }
});

export default router;
