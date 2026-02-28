import express from 'express';
const router = express.Router();
import complaintService from '../../../services/complaintService.js';

/**
 * GET /api/mobile/calls/assigned/:technicianId
 * Lists assigned calls for the mobile app using complaintService
 */
router.get('/assigned/:technicianId', async (req, res) => {
    try {
        const { technicianId } = req.params;

        // Using existing service to fetch data
        const result = await complaintService.listComplaints({ user: { id: technicianId, Role: 'Technician' } });

        // Filter by assigned technician (since service might return more)
        const filtered = result.complaints.filter(c => String(c.AssignedTechnicianId) === String(technicianId));

        res.json({
            success: true,
            technicianId: parseInt(technicianId),
            count: filtered.length,
            data: filtered
        });
    } catch (err) {
        console.error('Mobile Assigned Calls Error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch assigned calls', details: err.message });
    }
});

/**
 * POST /api/mobile/calls/assign
 * Handles technician self-assignment or admin assignment via service
 */
router.post('/assign', async (req, res) => {
    try {
        const { complaintId, technicianId, assignmentReason } = req.body;
        const result = await complaintService.assignTechnician({ complaintId, technicianId, assignmentReason });
        res.json({ success: true, data: result });
    } catch (err) {
        res.status(err.status || 500).json({ success: false, error: err.message });
    }
});

export default router;
