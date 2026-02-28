import express from 'express';
const router = express.Router();
import { Technicians } from '../../../models/index.js';

/**
 * GET /api/mobile/profile/:id
 * Standardized profile response for mobile app
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const technician = await Technicians.findByPk(id);

        if (!technician) {
            return res.status(404).json({ success: false, error: 'Technician not found' });
        }

        const data = technician.toJSON();

        res.json({
            success: true,
            data: {
                Id: data.technician_id,
                Name: data.name,
                Mobile: data.mobile_no,
                Email: data.email,
                Status: data.status === 'active',
                CreatedAt: data.created_at,
                City: 'N/A',
                Area: 'N/A',
                Expertise: 'Professional Technician'
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to fetch profile' });
    }
});

export default router;
