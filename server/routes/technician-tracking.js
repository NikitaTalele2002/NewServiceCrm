import express from 'express';
import {
  Calls,
  CallSpareUsage,
  TATTracking,
  TATHolds,
  SparePart,
  Technicians,
} from '../models/index.js';
import { sequelize } from '../db.js';

const router = express.Router();

/**
 * GET /api/technician-tracking/spare-consumption
 * Get all spare consumption records for calls
 */
router.get('/spare-consumption', async (req, res) => {
  try {
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
        csu.used_by_tech_id,
        u.name as technician_name,
        csu.used_at,
        csu.remarks,
        csu.created_at
      FROM call_spare_usage csu
      LEFT JOIN SparePart sp ON csu.spare_part_id = sp.Id
      LEFT JOIN users u ON csu.used_by_tech_id = u.user_id
      ORDER BY csu.created_at DESC
    `);

    res.json({
      ok: true,
      count: records.length,
      data: records,
    });
  } catch (err) {
    console.error('Error fetching spare consumption:', err);
    res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
});

/**
 * GET /api/technician-tracking/spare-consumption/call/:callId
 * Get spare consumption for a specific call
 */
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
        csu.used_by_tech_id,
        u.name as technician_name,
        csu.used_at,
        csu.remarks,
        csu.created_at
      FROM call_spare_usage csu
      LEFT JOIN SparePart sp ON csu.spare_part_id = sp.Id
      LEFT JOIN users u ON csu.used_by_tech_id = u.user_id
      WHERE csu.call_id = :callId
      ORDER BY csu.created_at DESC
    `, {
      replacements: { callId: parseInt(callId) },
    });

    res.json({
      ok: true,
      callId: parseInt(callId),
      count: records.length,
      data: records,
    });
  } catch (err) {
    console.error('Error fetching spare consumption for call:', err);
    res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
});

/**
 * POST /api/technician-tracking/spare-consumption
 * Create a new spare consumption record
 */
router.post('/spare-consumption', async (req, res) => {
  try {
    const {
      call_id,
      spare_part_id,
      issued_qty,
      used_qty,
      returned_qty,
      used_by_tech_id,
      remarks,
    } = req.body;

    if (!call_id || !spare_part_id || !issued_qty) {
      return res.status(400).json({
        ok: false,
        error: 'Missing required fields: call_id, spare_part_id, issued_qty',
      });
    }

    const usage_status = used_qty === 0 ? 'NOT_USED' : used_qty < issued_qty ? 'PARTIAL' : 'USED';

    const sql = `
      INSERT INTO call_spare_usage 
      (call_id, spare_part_id, issued_qty, used_qty, returned_qty, usage_status, used_by_tech_id, remarks, created_at, updated_at)
      VALUES (
        :call_id,
        :spare_part_id,
        :issued_qty,
        :used_qty,
        :returned_qty,
        :usage_status,
        :used_by_tech_id,
        :remarks,
        GETDATE(),
        GETDATE()
      );
      SELECT SCOPE_IDENTITY() as usage_id;
    `;

    const [result] = await sequelize.query(sql, {
      replacements: {
        call_id,
        spare_part_id,
        issued_qty,
        used_qty: used_qty || 0,
        returned_qty: returned_qty || issued_qty - (used_qty || 0),
        usage_status,
        used_by_tech_id: used_by_tech_id || null,
        remarks: remarks || null,
      },
    });

    res.json({
      ok: true,
      message: 'Spare consumption recorded successfully',
      usage_id: result[0]?.usage_id || result[0],
      data: {
        call_id,
        spare_part_id,
        issued_qty,
        used_qty: used_qty || 0,
        returned_qty: returned_qty || issued_qty - (used_qty || 0),
        usage_status,
      },
    });
  } catch (err) {
    console.error('Error creating spare consumption:', err);
    res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
});

/**
 * GET /api/technician-tracking/tat-tracking
 * Get all TAT tracking records
 */
router.get('/tat-tracking', async (req, res) => {
  try {
    const [records] = await sequelize.query(`
      SELECT 
        tt.id,
        tt.call_id,
        c.ref_call_id,
        tt.tat_start_time,
        tt.tat_end_time,
        tt.tat_status,
        tt.total_hold_minutes,
        DATEDIFF(MINUTE, tt.tat_start_time, ISNULL(tt.tat_end_time, GETDATE())) as elapsed_minutes,
        tt.created_at
      FROM tat_tracking tt
      LEFT JOIN calls c ON tt.call_id = c.call_id
      ORDER BY tt.created_at DESC
    `);

    res.json({
      ok: true,
      count: records.length,
      data: records,
    });
  } catch (err) {
    console.error('Error fetching TAT tracking:', err);
    res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
});

/**
 * GET /api/technician-tracking/tat-tracking/call/:callId
 * Get TAT tracking for a specific call
 */
router.get('/tat-tracking/call/:callId', async (req, res) => {
  try {
    const { callId } = req.params;

    const [records] = await sequelize.query(`
      SELECT 
        tt.id,
        tt.call_id,
        c.ref_call_id,
        tt.tat_start_time,
        tt.tat_end_time,
        tt.tat_status,
        tt.total_hold_minutes,
        DATEDIFF(MINUTE, tt.tat_start_time, ISNULL(tt.tat_end_time, GETDATE())) as elapsed_minutes,
        tt.created_at
      FROM tat_tracking tt
      LEFT JOIN calls c ON tt.call_id = c.call_id
      WHERE tt.call_id = :callId
    `, {
      replacements: { callId: parseInt(callId) },
    });

    if (records.length === 0) {
      return res.json({
        ok: true,
        message: 'No TAT tracking found for this call',
        data: null,
      });
    }

    res.json({
      ok: true,
      data: records[0],
    });
  } catch (err) {
    console.error('Error fetching TAT tracking for call:', err);
    res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
});

/**
 * POST /api/technician-tracking/tat-tracking
 * Start TAT tracking for a call
 */
router.post('/tat-tracking', async (req, res) => {
  try {
    const { call_id } = req.body;

    if (!call_id) {
      return res.status(400).json({
        ok: false,
        error: 'Missing required field: call_id',
      });
    }

    const sql = `
      INSERT INTO tat_tracking 
      (call_id, tat_start_time, tat_status, total_hold_minutes, created_at, updated_at)
      VALUES (
        :call_id,
        GETDATE(),
        'in_progress',
        0,
        GETDATE(),
        GETDATE()
      );
      SELECT SCOPE_IDENTITY() as id;
    `;

    const [result] = await sequelize.query(sql, {
      replacements: { call_id },
    });

    res.json({
      ok: true,
      message: 'TAT tracking started',
      id: result[0]?.id || result[0],
      data: {
        call_id,
        tat_status: 'in_progress',
        tat_start_time: new Date(),
      },
    });
  } catch (err) {
    console.error('Error starting TAT tracking:', err);
    res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
});

/**
 * GET /api/technician-tracking/tat-holds
 * Get all TAT hold records
 */
router.get('/tat-holds', async (req, res) => {
  try {
    const [records] = await sequelize.query(`
      SELECT 
        th.tat_holds_id,
        th.call_id,
        th.hold_reason,
        th.hold_start_time,
        th.hold_end_time,
        ISNULL(DATEDIFF(MINUTE, th.hold_start_time, th.hold_end_time), 
               DATEDIFF(MINUTE, th.hold_start_time, GETDATE())) as hold_duration_minutes,
        CASE WHEN th.hold_end_time IS NULL THEN 'ACTIVE' ELSE 'RESOLVED' END as hold_status,
        u.name as created_by_name,
        th.created_at
      FROM tat_holds th
      LEFT JOIN users u ON th.created_by = u.user_id
      ORDER BY th.created_at DESC
    `);

    res.json({
      ok: true,
      count: records.length,
      data: records,
    });
  } catch (err) {
    console.error('Error fetching TAT holds:', err);
    res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
});

/**
 * GET /api/technician-tracking/tat-holds/call/:callId
 * Get TAT holds for a specific call
 */
router.get('/tat-holds/call/:callId', async (req, res) => {
  try {
    const { callId } = req.params;

    const [records] = await sequelize.query(`
      SELECT 
        th.tat_holds_id,
        th.call_id,
        th.hold_reason,
        th.hold_start_time,
        th.hold_end_time,
        ISNULL(DATEDIFF(MINUTE, th.hold_start_time, th.hold_end_time), 
               DATEDIFF(MINUTE, th.hold_start_time, GETDATE())) as hold_duration_minutes,
        CASE WHEN th.hold_end_time IS NULL THEN 'ACTIVE' ELSE 'RESOLVED' END as hold_status,
        u.name as created_by_name,
        th.created_at
      FROM tat_holds th
      LEFT JOIN users u ON th.created_by = u.user_id
      WHERE th.call_id = :callId
      ORDER BY th.created_at DESC
    `, {
      replacements: { callId: parseInt(callId) },
    });

    res.json({
      ok: true,
      callId: parseInt(callId),
      count: records.length,
      data: records,
    });
  } catch (err) {
    console.error('Error fetching TAT holds for call:', err);
    res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
});

/**
 * POST /api/technician-tracking/tat-holds
 * Create a TAT hold record
 */
router.post('/tat-holds', async (req, res) => {
  try {
    const { call_id, hold_reason, created_by } = req.body;

    if (!call_id || !hold_reason) {
      return res.status(400).json({
        ok: false,
        error: 'Missing required fields: call_id, hold_reason',
      });
    }

    const sql = `
      INSERT INTO tat_holds 
      (call_id, hold_reason, hold_start_time, created_by, created_at, updated_at)
      VALUES (
        :call_id,
        :hold_reason,
        GETDATE(),
        :created_by,
        GETDATE(),
        GETDATE()
      );
      SELECT SCOPE_IDENTITY() as tat_holds_id;
    `;

    const [result] = await sequelize.query(sql, {
      replacements: {
        call_id,
        hold_reason,
        created_by: created_by || null,
      },
    });

    res.json({
      ok: true,
      message: 'TAT hold recorded',
      tat_holds_id: result[0]?.tat_holds_id || result[0],
      data: {
        call_id,
        hold_reason,
        hold_start_time: new Date(),
        hold_status: 'ACTIVE',
      },
    });
  } catch (err) {
    console.error('Error creating TAT hold:', err);
    res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
});

/**
 * PUT /api/technician-tracking/tat-holds/:holdId/resolve
 * Resolve (close) a TAT hold
 */
router.put('/tat-holds/:holdId/resolve', async (req, res) => {
  try {
    const { holdId } = req.params;

    const sql = `
      UPDATE tat_holds
      SET hold_end_time = GETDATE(),
          updated_at = GETDATE()
      WHERE tat_holds_id = :holdId;
      
      SELECT 
        tat_holds_id,
        call_id,
        hold_reason,
        hold_start_time,
        hold_end_time,
        DATEDIFF(MINUTE, hold_start_time, hold_end_time) as hold_duration_minutes
      FROM tat_holds
      WHERE tat_holds_id = :holdId;
    `;

    const [result] = await sequelize.query(sql, {
      replacements: { holdId: parseInt(holdId) },
    });

    if (!result || result.length === 0) {
      return res.status(404).json({
        ok: false,
        error: 'TAT hold not found',
      });
    }

    res.json({
      ok: true,
      message: 'TAT hold resolved',
      data: result[0],
    });
  } catch (err) {
    console.error('Error resolving TAT hold:', err);
    res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
});

/**
 * GET /api/technician-tracking/summary/:callId
 * Get full summary of call including spares consumed, TAT tracking, and holds
 */
router.get('/summary/:callId', async (req, res) => {
  try {
    const { callId } = req.params;

    // Get spare consumption
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
      FROM call_spare_usage csu
      LEFT JOIN SparePart sp ON csu.spare_part_id = sp.Id
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
      FROM tat_tracking tt
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
      FROM tat_holds th
      WHERE th.call_id = :callId
      ORDER BY th.created_at DESC
    `, {
      replacements: { callId: parseInt(callId) },
    });

    res.json({
      ok: true,
      callId: parseInt(callId),
      summary: {
        spares: {
          count: spareConsumption.length,
          consumed: spareConsumption.filter(s => s.usage_status === 'USED').length,
          partial: spareConsumption.filter(s => s.usage_status === 'PARTIAL').length,
          unused: spareConsumption.filter(s => s.usage_status === 'NOT_USED').length,
          details: spareConsumption,
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
    console.error('Error fetching summary:', err);
    res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
});

export default router;
