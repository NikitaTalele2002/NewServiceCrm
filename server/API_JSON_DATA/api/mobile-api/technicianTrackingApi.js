import express from 'express';
const router = express.Router();
import callSpareUsageService from '../../../services/callSpareUsageService.js';

/**
 * POST /api/mobile/tracking/consumption
 * Records spare usage for a call
 */
router.post('/consumption', async (req, res) => {
    try {
        const result = await callSpareUsageService.recordCallSpareUsage(req.body);
        res.json({ success: true, data: result });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to record consumption', details: err.message });
    }
});

/**
 * GET /api/mobile/tracking/summary/:callId
 */
router.get('/summary/:callId', async (req, res) => {
    try {
        // Logic to aggregate spare usage and TAT for a call
        const usage = await callSpareUsageService.getCallSpareUsage(req.params.callId);
        res.json({ success: true, data: { callId: req.params.callId, spares: usage } });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to fetch summary' });
    }
});

export default router;
