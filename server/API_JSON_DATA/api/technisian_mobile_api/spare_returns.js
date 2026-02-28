import express from 'express';
const router = express.Router();
import { sequelize } from '../../../db.js';
import { QueryTypes } from 'sequelize';

// GET /api/technician-mobile/spare-returns
router.get('/', async (req, res) => {
    try {
        const userId = req.user.id;
        const { status, limit = 50, offset = 0 } = req.query;

        console.log('📋 Fetching spare return requests for technician...');

        let query = `
            SELECT 
                tsr.return_id,
                tsr.return_number,
                tsr.call_id,
                tsr.technician_id,
                tsr.service_center_id,
                tsr.return_status,
                tsr.return_date,
                tsr.received_date,
                tsr.verified_date,
                tsr.remarks,
                tsr.created_at,
                t.name as technician_name,
                sc.asc_name as service_center_name,
                (SELECT COUNT(*) FROM technician_spare_return_items (NOLOCK)
                 WHERE return_id = tsr.return_id) as item_count
            FROM technician_spare_returns tsr (NOLOCK)
            LEFT JOIN technicians t (NOLOCK) ON tsr.technician_id = t.technician_id
            LEFT JOIN service_centers sc (NOLOCK) ON tsr.service_center_id = sc.asc_id
            WHERE t.user_id = ?
        `;

        const replacements = [userId];

        if (status) {
            query += ' AND tsr.return_status = ?';
            replacements.push(status);
        }

        query += ' ORDER BY tsr.created_at DESC';

        const requests = await sequelize.query(query, {
            replacements,
            type: QueryTypes.SELECT
        });

        res.json({
            success: true,
            data: requests,
            count: requests.length,
            limit: String(limit),
            offset: String(offset)
        });

    } catch (error) {
        console.error('❌ Error fetching spare return requests:', error);
        res.status(500).json({ error: 'Failed to fetch spare return requests', details: error.message });
    }
});

// GET /api/technician-mobile/spare-returns/:returnId
router.get('/:returnId', async (req, res) => {
    try {
        const { returnId } = req.params;
        const userId = req.user.id;

        // Fetch return details
        const returnDetails = await sequelize.query(`
            SELECT 
                tsr.return_id,
                tsr.return_number,
                tsr.call_id,
                tsr.technician_id,
                tsr.service_center_id,
                tsr.return_status,
                tsr.return_date,
                tsr.received_date,
                tsr.verified_date,
                tsr.remarks,
                tsr.received_remarks,
                tsr.verified_remarks,
                tsr.created_at,
                tsr.updated_at,
                t.name as technician_name,
                sc.asc_name as service_center_name
            FROM technician_spare_returns tsr (NOLOCK)
            LEFT JOIN technicians t (NOLOCK) ON tsr.technician_id = t.technician_id
            LEFT JOIN service_centers sc (NOLOCK) ON tsr.service_center_id = sc.asc_id
            WHERE tsr.return_id = ?
        `, { replacements: [returnId], type: QueryTypes.SELECT });

        if (!returnDetails || returnDetails.length === 0) {
            return res.status(404).json({ error: 'Return request not found' });
        }

        // Fetch return items
        const items = await sequelize.query(`
            SELECT 
                tsri.return_item_id,
                tsri.return_id,
                tsri.spare_id,
                tsri.item_type,
                tsri.requested_qty,
                tsri.received_qty,
                tsri.verified_qty,
                tsri.defect_reason,
                tsri.condition_on_receipt,
                tsri.remarks,
                sp.PART as spare_part_code,
                sp.DESCRIPTION as spare_description,
                sp.BRAND as spare_brand
            FROM technician_spare_return_items tsri (NOLOCK)
            LEFT JOIN spare_parts sp (NOLOCK) ON tsri.spare_id = sp.Id
            WHERE tsri.return_id = ?
            ORDER BY tsri.return_item_id
        `, { replacements: [returnId], type: QueryTypes.SELECT });

        res.json({
            success: true,
            return: returnDetails[0],
            items: items,
            itemCount: items.length
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch return details', details: error.message });
    }
});

// POST /api/technician-mobile/spare-returns/create
router.post('/create', async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const userId = req.user.id;
        const { callId, items, remarks } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'At least one spare must be included in the return' });
        }

        const techDetails = await sequelize.query(`
            SELECT technician_id, service_center_id FROM technicians WHERE user_id = ?
        `, { replacements: [userId], type: QueryTypes.SELECT, transaction });

        if (!techDetails || !techDetails.length) {
            await transaction.rollback();
            return res.status(403).json({ error: 'Technician profile not found' });
        }

        const technicianId = techDetails[0].technician_id;
        const serviceCenterId = techDetails[0].service_center_id;

        const returnNumber = `TSR-${new Date().getTime()}`;

        const [returnReq] = await sequelize.query(`
            INSERT INTO technician_spare_returns (
                call_id, technician_id, service_center_id, return_number, return_status, remarks, created_by, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, GETDATE(), GETDATE())
            SELECT SCOPE_IDENTITY() as return_id
        `, {
            replacements: [callId || null, technicianId, serviceCenterId, returnNumber, 'submitted', remarks || null, userId],
            type: QueryTypes.SELECT,
            transaction
        });

        const returnId = returnReq?.return_id;

        let defectiveCount = 0;
        let unusedCount = 0;

        for (const item of items) {
            await sequelize.query(`
                INSERT INTO technician_spare_return_items (
                    return_id, spare_id, item_type, requested_qty, received_qty, verified_qty, defect_reason, created_at, updated_at
                ) VALUES (?, ?, ?, ?, 0, 0, ?, GETDATE(), GETDATE())
            `, {
                replacements: [returnId, item.spareId, item.itemType, item.requestedQty, item.defectReason || null],
                transaction
            });

            if (item.itemType === 'defective') defectiveCount += item.requestedQty;
            else unusedCount += item.requestedQty;
        }

        await transaction.commit();

        res.json({
            success: true,
            returnId: parseInt(returnId),
            returnNumber,
            status: 'submitted',
            message: 'Spare return request submitted successfully',
            summary: {
                defectiveCount,
                unusedCount,
                totalItems: items.length
            }
        });
    } catch (error) {
        await transaction.rollback();
        res.status(500).json({ error: 'Failed to create return request', details: error.message });
    }
});

export default router;
