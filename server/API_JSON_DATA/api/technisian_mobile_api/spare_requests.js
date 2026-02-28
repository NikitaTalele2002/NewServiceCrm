import express from 'express';
const router = express.Router();
import { SpareRequest, SpareRequestItem, SparePart, Technicians } from '../../../models/index.js';
import technicianSpareRequestService from '../../../services/technicianSpareRequestService.js';

// GET /api/technician/spare-requests
router.get('/', async (req, res) => {
    try {
        const userId = req.user.id;

        if (!userId) {
            return res.status(403).json({ error: 'User ID missing in token' });
        }

        // Find technician record to get technician_id
        const tech = await Technicians.findOne({ where: { user_id: userId } });
        const technicianId = tech?.technician_id;

        console.log(`Fetching spare requests for User ID: ${userId}, Technician ID: ${technicianId}`);

        // Fetch all spare requests where this technician is the source (either by user_id or technician_id)
        const requests = await SpareRequest.findAll({
            where: {
                requested_source_id: technicianId ? [userId, technicianId] : [userId],
                requested_source_type: 'technician'
            },
            order: [['created_at', 'DESC']]
        });

        const requestIds = requests.map(r => r.request_id);
        const items = await SpareRequestItem.findAll({
            where: { request_id: requestIds },
            include: [{ model: SparePart, as: 'SparePart', attributes: ['PART', 'DESCRIPTION'] }]
        });

        const itemsByRequestId = items.reduce((acc, item) => {
            if (!acc[item.request_id]) {
                acc[item.request_id] = [];
            }
            acc[item.request_id].push(item);
            return acc;
        }, {});

        const formattedRequests = requests.map(reqData => {
            const req = reqData.toJSON();
            const reqItems = itemsByRequestId[req.request_id] || [];

            // status_id mapping: 1 is Pending
            let status = 'Pending';
            if (req.status_id === 2 || req.status_id === 4) status = 'Approved';
            else if (req.status_id === 3 || req.status_id === 5) status = 'Rejected';

            return {
                id: String(req.request_id),
                type: req.spare_request_type === 'TECH_ISSUE' ? 'Call Based' : 'Stock Based',
                callId: req.call_id ? String(req.call_id) : undefined,
                totalItems: reqItems.length,
                status: status,
                createdDate: req.created_at ? new Date(req.created_at).toLocaleDateString() : 'Unknown',
                items: reqItems.map(item => ({
                    id: String(item.id),
                    name: item.SparePart ? (item.SparePart.DESCRIPTION || item.SparePart.PART) : 'Unknown',
                    requestedQty: item.requested_qty || 0,
                    approvedQty: item.approved_qty || 0,
                    status: item.approved_qty > 0 ? 'Approved' : 'Pending',
                }))
            };
        });

        res.json({
            success: true,
            count: formattedRequests.length,
            data: formattedRequests
        });
    } catch (err) {
        console.error('Fetch technician spare requests error:', err);
        res.status(500).json({ error: 'Failed to fetch spare requests', details: err.message });
    }
});

// GET /api/technician-mobile/spare-requests/:id
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const centerId = req.user.centerId;

        const request = await technicianSpareRequestService.getTechnicianRequestDetails(parseInt(id), centerId);

        // status mapping
        let statusLabel = 'pending';
        if (request.status_id === 2 || request.status_id === 4) statusLabel = 'approved';
        else if (request.status_id === 3 || request.status_id === 5) statusLabel = 'rejected';

        const formattedRequest = {
            id: request.id,
            requestId: request.requestId,
            request_type: 'spare_request',
            request_reason: request.request_reason || '',
            technicianName: request.technicianName || '',
            call_id: request.call_id,
            status: statusLabel,
            createdAt: request.createdAt,
            items: (request.items || []).map(item => ({
                spare_request_item_id: item.id,
                spare_id: item.spare_id,
                spare_part_code: item.spare_code || '',
                spare_part_name: item.spare_desc || '',
                quantity_requested: item.requestedQty || 0,
                approved_qty: item.approvedQty || 0,
                available_qty: 0, // Placeholder or fetch if needed
                availability_status: 'unknown'
            }))
        };

        res.json({
            success: true,
            data: formattedRequest
        });
    } catch (err) {
        console.error('Fetch technician spare request detail error:', err);
        res.status(500).json({ error: 'Failed to fetch spare request details', details: err.message });
    }
});

// POST /api/technician/spare-requests
router.post('/', async (req, res) => {
    try {
        const userId = req.user.id;
        const centerId = req.user.centerId;
        const { type, callId, items } = req.body;

        if (!userId) {
            return res.status(403).json({ error: 'User ID missing in token' });
        }

        const tech = await Technicians.findOne({ where: { user_id: userId } });
        const technicianId = tech?.technician_id;

        if (!technicianId) {
            return res.status(403).json({ error: 'Technician profile not found' });
        }

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'Items array is required and must not be empty' });
        }

        const newRequest = await SpareRequest.sequelize.transaction(async (t) => {
            // 1. Create the main request record
            const request = await SpareRequest.create({
                spare_request_type: callId ? 'TECH_ISSUE' : 'CFU',
                requested_source_type: 'technician',
                requested_source_id: technicianId,
                requested_to_type: 'service_center',
                requested_to_id: centerId,
                request_reason: callId ? 'defect' : 'msl',
                status_id: 1, // Pending
                call_id: callId ? parseInt(callId) : null,
                created_by: userId
            }, { transaction: t });

            // 2. Map items
            const requestItemsData = items.map(item => ({
                request_id: request.request_id,
                spare_id: parseInt(item.id), // Frontend sends 'id' as spare string
                requested_qty: item.requestedQty,
                unit_price: 0,
                line_price: 0
            }));

            await SpareRequestItem.bulkCreate(requestItemsData, { transaction: t });

            return {
                id: String(request.request_id),
                type: request.spare_request_type,
                callId: request.call_id,
                status: 'Pending',
                totalItems: requestItemsData.length,
                createdDate: new Date().toLocaleDateString(),
            };
        });

        res.status(201).json({
            success: true,
            message: 'Spare request submitted successfully',
            data: newRequest
        });

    } catch (err) {
        console.error('Create spare request error:', err);
        res.status(500).json({ error: 'Failed to create spare request', details: err.message });
    }
});

export default router;
