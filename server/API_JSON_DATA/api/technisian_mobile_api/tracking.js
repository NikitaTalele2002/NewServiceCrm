import express from 'express';
const router = express.Router();
import { sequelize } from '../../../db.js';
import { QueryTypes } from 'sequelize';
import { recordCallSpareUsage } from '../../../services/callSpareUsageService.js';
import { Technicians } from '../../../models/index.js';

// GET /api/technician-mobile/tracking/summary/:callId
router.get('/summary/:callId', async (req, res) => {
    try {
        const { callId } = req.params;

        const [spareConsumption] = await sequelize.query(`
            SELECT 
                csu.usage_id,
                csu.spare_part_id,
                sp.PART as spare_name,
                sp.BRAND,
                csu.issued_qty,
                csu.used_qty,
                csu.returned_qty,
                csu.usage_status
            FROM call_spare_usage csu (NOLOCK)
            LEFT JOIN spare_parts sp (NOLOCK) ON csu.spare_part_id = sp.Id
            WHERE csu.call_id = :callId
        `, {
            replacements: { callId: parseInt(callId) },
        });

        // Get TAT tracking
        const [tatTracking] = await sequelize.query(`
            SELECT 
                tt.id,
                tt.tat_start_time,
                tt.tat_end_time,
                tt.tat_status,
                tt.total_hold_minutes,
                DATEDIFF(MINUTE, tt.tat_start_time, ISNULL(tt.tat_end_time, GETDATE())) as elapsed_minutes,
                CASE 
                    WHEN tt.tat_status = 'breached' THEN 'TAT Breached'
                    WHEN tt.tat_status = 'within_tat' THEN 'Within TAT'
                    WHEN tt.tat_status = 'resolved' THEN 'Resolved'
                    ELSE 'In Progress'
                END as status_label
            FROM tat_tracking tt (NOLOCK)
            WHERE tt.call_id = :callId
        `, {
            replacements: { callId: parseInt(callId) },
        });

        // Get TAT holds
        const [tatHolds] = await sequelize.query(`
            SELECT 
                th.tat_holds_id,
                th.hold_reason,
                th.hold_start_time,
                th.hold_end_time,
                ISNULL(DATEDIFF(MINUTE, th.hold_start_time, th.hold_end_time), 
                       DATEDIFF(MINUTE, th.hold_start_time, GETDATE())) as hold_duration_minutes,
                CASE WHEN th.hold_end_time IS NULL THEN 'ACTIVE' ELSE 'RESOLVED' END as hold_status
            FROM tat_holds th (NOLOCK)
            WHERE th.call_id = :callId
            ORDER BY th.created_at DESC
        `, {
            replacements: { callId: parseInt(callId) },
        });

        res.json({
            success: true,
            callId: parseInt(callId),
            summary: {
                spares: {
                    count: spareConsumption.length,
                    consumed: spareConsumption.filter(s => s.usage_status === 'USED').length,
                    partial: spareConsumption.filter(s => s.usage_status === 'PARTIAL').length,
                    unused: spareConsumption.filter(s => s.usage_status === 'NOT_USED').length,
                    details: spareConsumption.map(s => ({
                        usage_id: s.usage_id,
                        spare_part_id: s.spare_part_id,
                        spare_name: s.spare_name,
                        brand: s.brand,
                        issued_qty: s.issued_qty,
                        used_qty: s.used_qty,
                        returned_qty: s.returned_qty,
                        usage_status: s.usage_status
                    })),
                },
                tat: tatTracking.length > 0 ? tatTracking[0] : null,
                holds: {
                    count: tatHolds.length,
                    active: tatHolds.filter(h => h.hold_status === 'ACTIVE').length,
                    resolved: tatHolds.filter(h => h.hold_status === 'RESOLVED').length,
                    details: tatHolds,
                },
            },
        });
    } catch (err) {
        console.error('Fetch tracking summary error:', err);
        res.status(500).json({ ok: false, error: err.message });
    }
});

// GET /api/technician-mobile/tracking/spare-consumption/call/:callId
router.get('/spare-consumption/call/:callId', async (req, res) => {
    try {
        const { callId } = req.params;
        const [records] = await sequelize.query(`
            SELECT 
                csu.usage_id,
                csu.call_id,
                csu.spare_part_id,
                sp.PART as spare_name,
                sp.BRAND,
                csu.issued_qty,
                csu.used_qty,
                csu.returned_qty,
                csu.usage_status,
                u.name as technician_name,
                csu.used_at,
                csu.remarks
            FROM call_spare_usage csu (NOLOCK)
            LEFT JOIN spare_parts sp (NOLOCK) ON csu.spare_part_id = sp.Id
            LEFT JOIN users u (NOLOCK) ON csu.used_by_tech_id = u.user_id
            WHERE csu.call_id = :callId
        `, {
            replacements: { callId: parseInt(callId) },
        });

        res.json({
            ok: true,
            callId: parseInt(callId),
            count: records.length,
            data: records
        });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// POST /api/technician-mobile/tracking/spare-consumption
router.post('/spare-consumption', async (req, res) => {
    try {
        const { call_id, spare_id, used_qty, defective_qty, remarks } = req.body;
        const userId = req.user.id;

        const tech = await Technicians.findOne({ where: { user_id: userId } });
        const technicianId = tech?.technician_id;

        if (!technicianId) {
            return res.status(403).json({ error: 'Technician profile not found' });
        }

        const result = await sequelize.transaction(async (t) => {
            return await recordCallSpareUsage(
                call_id,
                technicianId,
                [{ spareId: spare_id, usedQty: used_qty, defectiveQty: defective_qty, remarks }],
                t
            );
        });

        res.json({
            ok: true,
            success: true,
            message: "Spare consumption recorded successfully with inventory updates",
            data: result
        });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// POST /api/technician-mobile/tracking/tat-tracking
router.post('/tat-tracking', async (req, res) => {
    try {
        const { call_id } = req.body;
        const [result] = await sequelize.query(`
            INSERT INTO tat_tracking (call_id, tat_start_time, tat_status, total_hold_minutes, created_at, updated_at)
            VALUES (?, GETDATE(), 'in_progress', 0, GETDATE(), GETDATE())
            SELECT SCOPE_IDENTITY() as id
        `, { replacements: [call_id], type: QueryTypes.SELECT });

        res.json({
            ok: true,
            message: "TAT tracking started",
            id: result?.id || result,
            data: {
                call_id,
                tat_status: 'in_progress',
                tat_start_time: new Date()
            }
        });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// POST /api/technician-mobile/tracking/tat-holds
router.post('/tat-holds', async (req, res) => {
    try {
        const { call_id, hold_reason, created_by } = req.body;
        const [result] = await sequelize.query(`
            INSERT INTO tat_holds (call_id, hold_reason, hold_start_time, created_by, created_at, updated_at)
            VALUES (?, ?, GETDATE(), ?, GETDATE(), GETDATE())
            SELECT SCOPE_IDENTITY() as tat_holds_id
        `, { replacements: [call_id, hold_reason, created_by], type: QueryTypes.SELECT });

        res.json({
            ok: true,
            message: "TAT hold recorded",
            tat_holds_id: result?.tat_holds_id || result,
            data: {
                call_id, hold_reason, hold_start_time: new Date(), hold_status: "ACTIVE"
            }
        });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// PUT /api/technician-mobile/tracking/tat-holds/:holdId/resolve
router.put('/tat-holds/:holdId/resolve', async (req, res) => {
    try {
        const { holdId } = req.params;
        await sequelize.query(`
            UPDATE tat_holds SET hold_end_time = GETDATE(), updated_at = GETDATE() WHERE tat_holds_id = ?
        `, { replacements: [holdId] });

        const [resolved] = await sequelize.query(`
            SELECT tat_holds_id, call_id, hold_reason, hold_start_time, hold_end_time, DATEDIFF(MINUTE, hold_start_time, hold_end_time) as hold_duration_minutes
            FROM tat_holds (NOLOCK) WHERE tat_holds_id = ?
        `, { replacements: [holdId], type: QueryTypes.SELECT });

        res.json({
            ok: true,
            message: "TAT hold resolved",
            data: resolved
        });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

// POST /api/technician-mobile/tracking/call/:callId/close
router.post('/call/:callId/close', async (req, res) => {
    try {
        const { callId } = req.params;
        const { status = 'CLOSED' } = req.body;

        await sequelize.query(`
            UPDATE calls SET status_id = (SELECT status_id FROM status WHERE status_name = ?), updated_at = GETDATE()
            WHERE call_id = ?
        `, { replacements: [status.toLowerCase(), callId] });

        res.json({
            ok: true,
            message: "Call closed successfully",
            data: { callId, status }
        });
    } catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
});

export default router;
