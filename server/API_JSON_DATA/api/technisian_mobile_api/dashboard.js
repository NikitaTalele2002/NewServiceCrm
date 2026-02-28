import express from 'express';
const router = express.Router();
import { Calls, SpareInventory, SpareRequest, Technicians } from '../../../models/index.js';
import { Op } from 'sequelize';

// GET /api/technician-mobile/dashboard
router.get('/', async (req, res) => {
    try {
        const technicianId = req.user.id;

        if (!technicianId) {
            return res.status(403).json({ error: 'Technician ID missing in token' });
        }

        console.log(`Aggregating dashboard metrics for technician ID: ${technicianId}`);

        // 1. Fetch Calls
        const allCalls = await Calls.findAll({
            where: { assigned_tech_id: technicianId },
            attributes: ['status_id']
        });

        const totalCalls = allCalls.length;
        // status_id 8: closed, 9: cancelled, 13: ready for closure
        const completedCalls = allCalls.filter(c => c.status_id === 8 || c.status_id === 13).length;
        const pendingCalls = totalCalls - completedCalls - allCalls.filter(c => c.status_id === 9).length;

        // 2. Fetch Inventory Stats (Sum of Good Items)
        const inventoryItems = await SpareInventory.findAll({
            where: {
                location_type: 'technician',
                location_id: technicianId
            },
            attributes: ['qty_good']
        });
        const totalSpares = inventoryItems.reduce((acc, item) => acc + (item.qty_good || 0), 0);

        // 3. Fetch Spare Requests Stats (Pending Count)
        const spareRequestsCount = await SpareRequest.count({
            where: {
                requested_source_id: technicianId,
                requested_source_type: 'technician',
                status_id: 1 // Pending
            }
        });

        // 3.5 Fetch Technician Name
        const tech = await Technicians.findByPk(technicianId, { attributes: ['name'] });

        // 4. Return formatted payload
        res.json({
            success: true,
            data: {
                technicianName: tech ? tech.name : '',
                totalCalls,
                pendingCalls,
                completedCalls,
                totalSparesAvailable: totalSpares,
                pendingSpareRequests: spareRequestsCount
            }
        });

    } catch (err) {
        console.error('Fetch dashboard metrics error:', err);
        res.status(500).json({ error: 'Failed to fetch dashboard metrics', details: err.message });
    }
});

export default router;
