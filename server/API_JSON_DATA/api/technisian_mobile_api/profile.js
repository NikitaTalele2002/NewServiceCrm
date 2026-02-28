import express from 'express';
const router = express.Router();
import technicianService from '../../../services/technicianService.js';

// GET /api/technician-mobile/profile
router.get('/', async (req, res) => {
    try {
        const userId = req.user.id; // user_id is in token

        if (!userId) {
            return res.status(401).json({ error: 'User ID missing in token' });
        }

        // We need to find the technician by user_id first
        const { Technicians, ServiceCenter } = await import('../../../models/index.js');
        const technician = await Technicians.findOne({
            where: { user_id: userId },
            include: [{ model: ServiceCenter, attributes: ['asc_name'] }]
        });

        if (!technician) {
            return res.status(404).json({ error: 'Technician not found' });
        }

        const data = technician.toJSON();
        const formattedData = {
            id: data.technician_id,
            name: data.name,
            mobile: data.mobile_no,
            email: data.email,
            status: data.status === 'active' ? 'Active' : 'Inactive',
            createdAt: data.created_at,
            serviceCenter: data.ServiceCenter?.asc_name || 'N/A',
            city: data.city || 'N/A',
            area: data.area || 'N/A',
            expertise: data.expertise || 'Certified Technician',
            profileImage: data.profile_image || null
        };

        res.json({
            success: true,
            data: formattedData
        });

    } catch (err) {
        console.error('Fetch technician profile error:', err);
        res.status(500).json({ error: 'Failed to fetch technician profile', details: err.message });
    }
});

export default router;
