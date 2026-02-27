import express from 'express';
import complaintController from '../controllers/complaintController.js';
import { optionalAuthenticate } from '../middleware/auth.js';
import { poolPromise } from '../db.js';
import sql from 'mssql';

const router = express.Router();

router.post('/', complaintController.register);
router.get('/', optionalAuthenticate, complaintController.list);
router.post('/assign-technician', complaintController.assignTechnician);

// GET /api/complaints/:id/action-log
// Fetch action log for a complaint from action_logs table
router.get('/:id/action-log', optionalAuthenticate, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📋 Fetching action logs for call ID: ${id}`);
    
    const pool = await poolPromise;

    // First, try to fetch action logs with simplified query (no joins)
    const logs = await pool.request()
      .input("EntityId", sql.Int, Number(id))
      .query(`
        SELECT 
          al.log_id AS LogID,
          al.entity_type AS EntityType,
          al.entity_id AS EntityID,
          al.action_at AS ActionDate,
          al.user_id AS UserId,
          al.old_status_id AS OldStatusId,
          al.new_status_id AS NewStatusId,
          al.old_substatus_id AS OldSubStatusId,
          al.new_substatus_id AS NewSubStatusId,
          al.remarks AS Remarks
        FROM action_logs al
        WHERE al.entity_type = 'Call' AND al.entity_id = @EntityId
        ORDER BY al.action_at ASC
      `);

    console.log(`✅ Found ${logs.recordset ? logs.recordset.length : 0} action logs for call ${id}`);

    // If we have logs, we can optionally enrich them with user data here
    // For now, just return the raw logs
    res.json(logs.recordset || []);

  } catch (err) {
    console.error(`❌ Error fetching action logs for call ${req.params.id}:`, err);
    console.error('Error details:', {
      message: err.message,
      code: err.code,
      number: err.number,
      state: err.state,
      class: err.class
    });
    
    // Return empty array instead of 500 error
    res.json([]);
  }
});

export default router;
