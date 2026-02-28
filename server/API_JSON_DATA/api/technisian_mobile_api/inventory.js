import express from 'express';
const router = express.Router();
import { sequelize } from '../../../db.js';
import { QueryTypes } from 'sequelize';
import { SpareInventory, SparePart, SpareRequest, SpareRequestItem } from '../../../models/index.js';

// GET /api/technician-mobile/inventory
router.get('/', async (req, res) => {
    try {
        const userId = req.user.id;

        if (!userId) {
            return res.status(403).json({ error: 'User ID missing in token' });
        }

        // Find technician record to get technician_id
        const tech = await sequelize.query(
            'SELECT technician_id FROM technicians WHERE user_id = :userId',
            { replacements: { userId }, type: QueryTypes.SELECT }
        );
        const technicianId = tech[0]?.technician_id;

        console.log(`Fetching inventory for User ID: ${userId}, Technician ID: ${technicianId}`);

        // Fetch from both IDs
        const inventory = await SpareInventory.findAll({
            where: {
                location_type: 'technician',
                location_id: technicianId ? [userId, technicianId] : [userId]
            },
            include: [{
                model: SparePart,
                as: 'SparePart',
                attributes: ['Id', 'PART', 'DESCRIPTION', 'BRAND']
            }],
            order: [[{ model: SparePart, as: 'SparePart' }, 'DESCRIPTION', 'ASC']]
        });

        // Aggregate by SparePartId if items exist in both buckets
        const aggregated = {};
        inventory.forEach(item => {
            const data = item.toJSON();
            const partId = data.spare_id;
            if (!aggregated[partId]) {
                aggregated[partId] = {
                    Id: data.spare_inventory_id,
                    SparePartId: data.SparePart ? data.SparePart.Id : null,
                    Sku: data.SparePart ? data.SparePart.PART : 'UNKNOWN',
                    SpareName: data.SparePart ? (data.SparePart.DESCRIPTION || data.SparePart.PART) : 'Unknown',
                    GoodQty: 0,
                    DefectiveQty: 0,
                };
            }
            aggregated[partId].GoodQty += data.qty_good || 0;
            aggregated[partId].DefectiveQty += data.qty_defective || 0;
        });

        const formattedInventory = Object.values(aggregated);

        res.json({
            success: true,
            count: formattedInventory.length,
            data: formattedInventory
        });
    } catch (err) {
        console.error('Fetch technician inventory error:', err);
        res.status(500).json({ error: 'Failed to fetch technician inventory', details: err.message });
    }
});

// GET /api/technician-mobile/inventory/call/:callId
// Returns only spares that were requested for this specific call
router.get('/call/:callId', async (req, res) => {
    try {
        const { callId } = req.params;
        const userId = req.user.id;

        // Find technician record to get technician_id
        const tech = await sequelize.query(
            'SELECT technician_id FROM technicians WHERE user_id = :userId',
            { replacements: { userId }, type: QueryTypes.SELECT }
        );
        const technicianId = tech[0]?.technician_id;

        console.log(`Fetching call-specific inventory. callId: ${callId}, userId: ${userId}, technicianId: ${technicianId}`);

        const requests = await SpareRequest.findAll({
            where: {
                call_id: parseInt(callId),
                requested_source_id: technicianId ? [userId, technicianId] : [userId],
                requested_source_type: 'technician'
            },
            include: [{
                model: SpareRequestItem,
                as: 'SpareRequestItems',
                include: [{
                    model: SparePart,
                    as: 'SparePart',
                    attributes: ['Id', 'PART', 'DESCRIPTION', 'BRAND']
                }]
            }]
        });

        console.log(`Found ${requests.length} requests for call ${callId}`);

        const items = [];
        for (const spareReq of requests) {
            if (spareReq.SpareRequestItems) {
                console.log(`Processing request ${spareReq.request_id} with ${spareReq.SpareRequestItems.length} items`);
                for (const item of spareReq.SpareRequestItems) {
                    // Check if this spare has already been issued for this call
                    const usage = await sequelize.query(`
                        SELECT SUM(issued_qty) as total_issued 
                        FROM call_spare_usage (NOLOCK)
                        WHERE call_id = :callId AND spare_part_id = :spareId
                    `, {
                        replacements: { callId: parseInt(callId), spareId: item.spare_id },
                        type: QueryTypes.SELECT
                    });

                    const totalIssued = usage[0]?.total_issued || 0;
                    const remainingQty = (item.approved_qty || 0) - totalIssued;

                    console.log(`Item spare_id ${item.spare_id}: approved=${item.approved_qty}, issued=${totalIssued}, remaining=${remainingQty}`);

                    if (remainingQty > 0) {
                        items.push({
                            Id: item.id,
                            SparePartId: item.spare_id,
                            Sku: item.SparePart ? item.SparePart.PART : 'UNKNOWN',
                            SpareName: item.SparePart ? (item.SparePart.DESCRIPTION || item.SparePart.PART) : 'Unknown',
                            GoodQty: remainingQty,
                            DefectiveQty: 0,
                        });
                    }
                }
            }
        }

        console.log(`Returning ${items.length} available items for call ${callId}`);

        res.json({
            success: true,
            count: items.length,
            data: items
        });
    } catch (err) {
        console.error('Fetch call-specific inventory error:', err);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch call inventory',
            details: err.message
        });
    }
});

export default router;
