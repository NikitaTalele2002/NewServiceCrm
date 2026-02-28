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
import { safeRollback, safeCommit, isTransactionActive } from '../utils/transactionHelper.js';
import { recordCallSpareUsage } from '../services/callSpareUsageService.js';
import { authenticateToken } from '../middleware/auth.js';

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
 * GET /api/technician-tracking/spare-consumption/call/:call_id
 * Get spare consumption for a specific call
 */
router.get('/spare-consumption/call/:call_id', async (req, res) => {
  try {
    const { call_id } = req.params;

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
      WHERE csu.call_id = :call_id
      ORDER BY csu.created_at DESC
    `, {
      replacements: { call_id: parseInt(call_id) },
    });

    res.json({
      ok: true,
      call_id: parseInt(call_id),
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
 * Create a new spare consumption record with defective tracking
 * 
 * ⚡ KEY CONCEPT: issued_qty comes from spare_request_items.approved_qty (approval process)
 * User does NOT provide issued_qty - it's auto-looked up from the approved spare request
 * 
 * Request body:
 * {
 *   call_id: number,
 *   spare_part_id: number,
 *   used_qty: number,            // Qty of spare part used to replace defective part
 *   returned_qty?: number,        // Qty to be returned (default: issued_qty - used_qty)
 *   used_by_tech_id?: number,     // Optional, auto-detected from call if not provided
 *   remarks?: string
 * }
 * 
 * Data Flow:
 * 1. User requests spares from Service Center
 * 2. SC approves with specific quantities → stored in spare_request_items.approved_qty
 * 3. This endpoint looks up the approved_qty for this spare_part_id
 * 4. Uses that as issued_qty (what was issued from SC to technician)
 * 5. Validates used_qty <= approved_qty
 * 6. Tracks defective parts: qty_good decreases, qty_defective increases
 * 
 * When used_qty > 0, the defective part (removed during replacement) is tracked:
 * - spare_inventory.qty_defective increases by used_qty
 * - spare_inventory.qty_good decreases by used_qty
 */
router.post('/spare-consumption', async (req, res) => {
  let transaction;
  try {
    // Accept both camelCase and snake_case for input parameters
    const call_id = req.body.call_id;
    const spare_part_id = req.body.spare_part_id;
    const used_qty = req.body.used_qty;
    const returned_qty = req.body.returned_qty;
    const used_by_tech_id = req.body.used_by_tech_id;
    const remarks = req.body.remarks;

    // ✅ STEP 1: Validate required fields BEFORE transaction
    // Note: issued_qty is NOT required from user - will be looked up from approval
    if (!call_id || !spare_part_id) {
      return res.status(400).json({
        ok: false,
        error: 'Missing required fields: call_id, spare_part_id',
        received: {
          call_id,
          spare_part_id,
          used_qty,
          returned_qty,
          used_by_tech_id,
          remarks
        }
      });
    }

    // ✅ STEP 2: Validate spare part exists BEFORE transaction
    console.log(`\n🔍 Validating spare part ID ${spare_part_id}...`);
    const [spareExists] = await sequelize.query(
      `SELECT Id, PART, DESCRIPTION FROM spare_parts WHERE Id = ?`,
      { replacements: [spare_part_id] }
    );

    if (!spareExists || spareExists.length === 0) {
      // Fetch available spare IDs for helpful error message
      const [availableSpares] = await sequelize.query(
        `SELECT TOP 10 Id, PART, DESCRIPTION FROM spare_parts WHERE Id IS NOT NULL ORDER BY Id`
      );
      
      const spareList = availableSpares.map(s => `${s.Id} (${s.PART})`).join(', ');
      
      return res.status(400).json({
        ok: false,
        error: `Spare part ID ${spare_part_id} does not exist in database`,
        availableSpareIds: availableSpares.map(s => ({ id: s.Id, code: s.PART, description: s.DESCRIPTION })),
        availableIdsString: spareList,
        suggestion: `Use one of these valid spare IDs: ${spareList}`
      });
    }

    console.log(`✅ Spare part validated: ${spareExists[0].PART} - ${spareExists[0].DESCRIPTION}`);

    // ✅ STEP 3: Get technician ID from call BEFORE transaction (no transaction param)
    const [callData] = await sequelize.query(
      `SELECT assigned_tech_id FROM calls WHERE call_id = ?`,
      { replacements: [call_id] }
    );

    let technicianId = used_by_tech_id;
    if (!technicianId) {
      if (callData && callData.length > 0) {
        technicianId = callData[0].assigned_tech_id;
      }
    }

    if (!technicianId) {
      return res.status(400).json({
        ok: false,
        error: 'Technician ID not found. Provide used_by_tech_id or ensure call has assigned_tech_id',
      });
    }

    // ✅ STEP 4: LOOKUP approved_qty from spare_request_items for THIS CALL
    // Find the approved spare request for this specific call with this spare_part_id
    console.log(`\n🔎 Looking up approved spare request for this call...`);
    
    const [approvalData] = await sequelize.query(`
      SELECT TOP 1
        sri.approved_qty,
        sr.request_id,
        sr.call_id
      FROM spare_request_items sri
      INNER JOIN spare_requests sr ON sri.request_id = sr.request_id
      WHERE sr.call_id = ?
        AND sri.spare_id = ?
        AND sri.approved_qty > 0
      ORDER BY sr.created_at DESC
    `, {
      replacements: [call_id, spare_part_id]
    });

    // Use approved_qty if found, otherwise use issued_qty from request body
    let issued_qty = req.body.issued_qty;
    
    if (approvalData && approvalData.length > 0) {
      issued_qty = approvalData[0].approved_qty;
      console.log(`✅ Found approved spare request for this call (Request ID: ${approvalData[0].request_id})`);
      console.log(`   Approved Qty (issued to technician): ${issued_qty}`);
    } else {
      console.log(`⚠️  No approved spare request found for this call. Using issued_qty from request body: ${issued_qty}`);
    }

    // ✅ STEP 5: Validate used_qty <= issued_qty
    const finalUsedQty = used_qty || 0;
    if (finalUsedQty > issued_qty) {
      return res.status(400).json({
        ok: false,
        error: `Used quantity (${finalUsedQty}) exceeds issued quantity (${issued_qty})`,
        explanation: 'Cannot use more spares than what was issued',
        received: { used_qty: finalUsedQty, issued_qty }
      });
    }

    // ✅ STEP 6: NOW start the transaction for actual database modifications
    transaction = await sequelize.transaction();

    const finalReturnedQty = returned_qty !== undefined ? returned_qty : (issued_qty - finalUsedQty);
    const usage_status = finalUsedQty === 0 ? 'NOT_USED' : finalUsedQty < issued_qty ? 'PARTIAL' : 'USED';

    console.log('\n' + '='.repeat(70));
    console.log('📝 RECORDING SPARE CONSUMPTION WITH DEFECTIVE TRACKING');
    console.log('='.repeat(70));
    console.log(`Call ID: ${call_id}`);
    console.log(`Spare Part ID: ${spare_part_id} (${spareExists[0].PART})`);
    console.log(`Issued Qty (from approved request): ${issued_qty}`);
    console.log(`Used Qty (defective replaced): ${finalUsedQty}`);
    console.log(`Returned Qty: ${finalReturnedQty}`);
    console.log(`Usage Status: ${usage_status}`);
    console.log(`Technician ID: ${technicianId}`);

    // Step 1: Record usage in call_spare_usage
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
        used_qty: finalUsedQty,
        returned_qty: finalReturnedQty,
        usage_status,
        used_by_tech_id: technicianId,
        remarks: remarks || null,
      },
      transaction
    });

    const usageId = result[0]?.usage_id || result[0];
    console.log(`✅ Recorded in call_spare_usage (ID: ${usageId})`);

    // Step 2: Update technician's spare inventory - track defective spares
    // When used_qty > 0: the technician removed a defective part and installed the spare
    // So we track that defective part in technician's inventory
    if (finalUsedQty > 0) {
      console.log(`\n🔴 DEFECTIVE TRACKING:`);
      console.log(`   Technician removed ${finalUsedQty} defective part(s) during replacement`);
      
      // Try to update existing record first
      const updateResult = await sequelize.query(`
        UPDATE spare_inventory
        SET 
          qty_good = CASE WHEN qty_good >= ? THEN qty_good - ? ELSE 0 END,
          qty_defective = qty_defective + ?,
          updated_at = GETDATE()
        WHERE spare_id = ?
          AND location_type = 'technician'
          AND location_id = ?
      `, {
        replacements: [finalUsedQty, finalUsedQty, finalUsedQty, spare_part_id, technicianId],
        transaction
      });

      // If no rows were updated, insert a new record
      if (updateResult[1] === 0) {
        console.log(`   ℹ️ No existing record, creating new inventory entry...`);
        await sequelize.query(`
          INSERT INTO spare_inventory (
            spare_id, location_type, location_id, qty_good, qty_defective, 
            created_at, updated_at
          ) VALUES (
            ?, 'technician', ?, 0, ?, GETDATE(), GETDATE()
          )
        `, {
          replacements: [spare_part_id, technicianId, finalUsedQty],
          transaction
        });
      }

      console.log(`   ✅ Updated technician inventory:`);
      console.log(`      - qty_good decreased by ${finalUsedQty}`);
      console.log(`      - qty_defective increased by ${finalUsedQty}`);
    }

    // Step 3: Stock movement will be created when call is closed (in /call/:call_id/close endpoint)
    // So no need to create it here
    if (finalUsedQty > 0) {
      console.log(`   ℹ️  Stock movement will be created when call is closed`);
    }

    await safeCommit(transaction);
    console.log(`\n✅ Spare consumption recorded successfully\n`);

    res.json({
      ok: true,
      message: 'Spare consumption recorded successfully with defective tracking',
      usage_id: usageId,
      data: {
        call_id,
        spare_part_id,
        spare_name: spareExists[0].PART,
        issued_qty,                        // From approved spare request or request body
        issued_qty_source: approvalData && approvalData.length > 0 
          ? `Request ${approvalData[0].request_id}` 
          : `From request body`,
        used_qty: finalUsedQty,
        returned_qty: finalReturnedQty,
        usage_status,
        technician_id: technicianId,
        defective_tracked: finalUsedQty > 0,
        remarks,
      },
    });
  } catch (err) {
    await safeRollback(transaction, err);
    console.error('❌ Error creating spare consumption:', err);
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
 * GET /api/technician-tracking/tat-tracking/call/:call_id
 * Get TAT tracking for a specific call
 */
router.get('/tat-tracking/call/:call_id', async (req, res) => {
  try {
    const { call_id } = req.params;

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
      WHERE tt.call_id = :call_id
    `, {
      replacements: { call_id: parseInt(call_id) },
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
 * GET /api/technician-tracking/tat-holds/call/:call_id
 * Get TAT holds for a specific call
 */
router.get('/tat-holds/call/:call_id', async (req, res) => {
  try {
    const { call_id } = req.params;

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
      WHERE th.call_id = :call_id
      ORDER BY th.created_at DESC
    `, {
      replacements: { call_id: parseInt(call_id) },
    });

    res.json({
      ok: true,
      call_id: parseInt(call_id),
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
 * PUT /api/technician-tracking/tat-holds/:hold_id/resolve
 * Resolve (close) a TAT hold and update TAT tracking with hold duration
 */
router.put('/tat-holds/:hold_id/resolve', async (req, res) => {
  let transaction;
  try {
    transaction = await sequelize.transaction();
    const { hold_id } = req.params;

    // Step 1: Update the hold end time
    const sql = `
      UPDATE tat_holds
      SET hold_end_time = GETDATE(),
          updated_at = GETDATE()
      WHERE tat_holds_id = :hold_id;
      
      SELECT 
        tat_holds_id,
        call_id,
        hold_reason,
        hold_start_time,
        hold_end_time,
        DATEDIFF(MINUTE, hold_start_time, hold_end_time) as hold_duration_minutes
      FROM tat_holds
      WHERE tat_holds_id = :hold_id;
    `;

    const [result] = await sequelize.query(sql, {
      replacements: { hold_id: parseInt(hold_id) },
      transaction
    });

    if (!result || result.length === 0) {
      await transaction.rollback();
      return res.status(404).json({
        ok: false,
        error: 'TAT hold not found',
      });
    }

    const holdData = result[0];
    const holdDurationMinutes = holdData.hold_duration_minutes || 0;
    const callId = holdData.call_id;

    console.log(`\n⏸️ RESOLVING TAT HOLD`);
    console.log(`Hold ID: ${hold_id}`);
    console.log(`Hold Duration: ${holdDurationMinutes} minutes`);
    console.log(`Call ID: ${callId}`);

    // Step 2: Update tat_tracking with total hold minutes
    try {
      const [tatUpdateResult] = await sequelize.query(`
        UPDATE tat_tracking
        SET total_hold_minutes = ISNULL(total_hold_minutes, 0) + ?,
            updated_at = GETDATE()
        WHERE call_id = ?;
        
        SELECT 
          id,
          call_id,
          total_hold_minutes,
          DATEDIFF(MINUTE, tat_start_time, ISNULL(tat_end_time, GETDATE())) as elapsed_minutes
        FROM tat_tracking
        WHERE call_id = ?
      `, {
        replacements: [holdDurationMinutes, callId, callId],
        transaction
      });

      if (tatUpdateResult && tatUpdateResult.length > 0) {
        const tatData = tatUpdateResult[0];
        console.log(`✅ TAT tracking updated:`);
        console.log(`   Total Hold Minutes: ${tatData.total_hold_minutes}`);
        console.log(`   Elapsed Minutes: ${tatData.elapsed_minutes}`);
      }
    } catch (tatErr) {
      console.error(`⚠️ Error updating TAT tracking:`, tatErr.message);
      // Don't fail if TAT update fails
    }

    await safeCommit(transaction);
    console.log(`✅ TAT hold resolved\n`);

    res.json({
      ok: true,
      message: 'TAT hold resolved',
      data: {
        ...holdData,
        tat_updated: true,
        message: `Hold resolved. Hold duration (${holdDurationMinutes} minutes) added to TAT's total_hold_minutes`
      },
    });
  } catch (err) {
    await safeRollback(transaction, err);
    console.error('Error resolving TAT hold:', err);
    res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
});

/**
 * GET /api/technician-tracking/summary/:call_id
 * Get full summary of call including spares consumed, TAT tracking, and holds
 */
router.get('/summary/:call_id', async (req, res) => {
  try {
    const { call_id } = req.params;

    // Get spare consumption
    const [spareConsumption] = await sequelize.query(`
      SELECT 
        csu.usage_id,
        csu.spare_part_id,
        sp.PART as spare_name,
        sp.DESCRIPTION,
        csu.issued_qty,
        csu.used_qty,
        csu.returned_qty,
        csu.usage_status
      FROM call_spare_usage csu
      LEFT JOIN spare_parts sp ON csu.spare_part_id = sp.Id
      WHERE csu.call_id = :call_id
    `, {
      replacements: { call_id: parseInt(call_id) },
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
      WHERE tt.call_id = :call_id
    `, {
      replacements: { call_id: parseInt(call_id) },
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
      WHERE th.call_id = :call_id
      ORDER BY th.created_at DESC
    `, {
      replacements: { call_id: parseInt(call_id) },
    });

    res.json({
      ok: true,
      call_id: parseInt(call_id),
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

/**
 * POST /api/technician-tracking/call/:call_id/close
 * Close a call and trigger stock movements for spare usage tracking
 * 
 * When a call is closed:
 * 1. Get all call_spare_usage records for this call
 * 2. Calculate total used_qty across all spares
 * 3. Create ONE single stock_movement for the call closure 
 *    (from technician GOOD to technician DEFECTIVE)
 * 4. Update spare_inventory for each spare (qty_good -=, qty_defective +=)
 * 5. Update call status to CLOSED/REPAIR_CLOSED
 * 
 * Request:
 * {
 *   "technician_id": number,
 *   "call_id": number,
 *   "status": "CLOSED" | "REPAIR_CLOSED"
 * }
 */
router.post('/call/:call_id/close', authenticateToken, async (req, res) => {
  let transaction;
  try {
    transaction = await sequelize.transaction();
    const { call_id } = req.params;
    const { technician_id } = req.body;
    const userId = req.user?.id;

    console.log('\n' + '='.repeat(70));
    console.log('📋 CLOSING CALL - PROCESSING SPARE USAGE');
    console.log('='.repeat(70));
    console.log(`Call ID: ${call_id}`);
    console.log(`Technician ID: ${technician_id}`);
    console.log(`Closed By User ID: ${userId}`);
    console.log(`New Status: CLOSED (status_id=8)`);
    // Step 1: Get all spare usage records for this call (both with used_qty and those needing auto-calculation)
    console.log('\n1️⃣ Getting spare usage records...');
    const usageRecords = await sequelize.query(`
      SELECT 
        usage_id,
        call_id,
        spare_part_id,
        issued_qty,
        used_qty,
        ISNULL(returned_qty, 0) as returned_qty,
        usage_status,
        used_by_tech_id
      FROM call_spare_usage
      WHERE call_id = ?
      ORDER BY usage_id DESC
    `, {
      replacements: [call_id],
      transaction
    });

    let spareUsages = usageRecords[0] || [];
    
    // Auto-calculate used_qty for ALL spares where used_qty is 0 but issued > returned
    const allSpares = spareUsages.map(usage => {
      if (usage.used_qty === 0 || usage.used_qty === null) {
        // Calculate used_qty = issued_qty - returned_qty
        const calculatedUsedQty = (usage.issued_qty || 0) - (usage.returned_qty || 0);
        if (calculatedUsedQty > 0) {
          console.log(`   ℹ️  Auto-calculated used_qty for spare_part_id=${usage.spare_part_id}: ${calculatedUsedQty} (issued=${usage.issued_qty}, returned=${usage.returned_qty})`);
          return { ...usage, used_qty: calculatedUsedQty };
        } else {
          console.log(`   ℹ️  Spare_part_id=${usage.spare_part_id} was NOT used (issued=${usage.issued_qty}, returned=${usage.returned_qty})`);
          return { ...usage, used_qty: 0 };
        }
      }
      return usage;
    });
    
    console.log(`   Found ${allSpares.length} spare usage record(s) total`);
    
    // Filter for spares with used_qty > 0 for stock movement
    const usedSpares = allSpares.filter(u => u.used_qty > 0);
    console.log(`   ${usedSpares.length} spare(s) with used_qty > 0 will create stock movement`);

    // Update call_spare_usage records with calculated used_qty and usage_status for ALL spares
    for (const usage of allSpares) {
      if (!usage.usage_id) continue;
      try {
        // Determine usage_status based on used_qty
        const usageStatus = usage.used_qty > 0 ? 'USED' : 'NOT_USED';
        
        await sequelize.query(`
          UPDATE call_spare_usage
          SET used_qty = ?, usage_status = ?, updated_at = GETDATE()
          WHERE usage_id = ?
        `, {
          replacements: [usage.used_qty, usageStatus, usage.usage_id],
          transaction
        });
        
        if (usageStatus === 'NOT_USED') {
          console.log(`   ✅ Updated usage_id=${usage.usage_id}: marked as NOT_USED`);
        } else {
          console.log(`   ✅ Updated usage_id=${usage.usage_id}: marked as USED (used_qty=${usage.used_qty})`);
        }
      } catch (updateErr) {
        console.error(`   ⚠️  Could not update usage_id ${usage.usage_id}:`, updateErr.message);
      }
    }

    // Step 2: Calculate total quantity and get technician ID using the USED spares only for movement
    let totalUsedQty = 0;
    let technicianId = technician_id;
    const itemsForMovement = [];

    for (const usage of usedSpares) {
      totalUsedQty += usage.used_qty;
      
      // Use technician from first record if not provided in request
      if (!technicianId && usage.used_by_tech_id) {
        technicianId = usage.used_by_tech_id;
      }
      
      itemsForMovement.push(usage);
    }

    console.log(`   Total used quantity: ${totalUsedQty}`);
    console.log(`   Technician ID: ${technicianId}`);

    let movementId = null;
    let inventoryUpdated = 0;

    // Step 3: Create ONE single stock movement for the call closure
    // This moves spares from technician's GOOD to DEFECTIVE (internal transfer)
    // NOTE: bucket, bucket_operation, bucket_impact are NOT set here
    // Each item's condition is tracked in goods_movement_items
    if (totalUsedQty > 0 && technicianId) {
      console.log(`\n2️⃣ Creating SINGLE stock movement (technician internal transfer)...`);
      
      try {
        const result = await sequelize.query(`
          INSERT INTO stock_movement (
            stock_movement_type,
            reference_type,
            reference_no,
            source_location_type,
            source_location_id,
            destination_location_type,
            destination_location_id,
            total_qty,
            movement_date,
            created_by,
            status,
            created_at,
            updated_at
          )
          VALUES (
            'DEFECTIVE_MARKING',
            'call_spare_usage',
            'CALL-' + CAST(? AS VARCHAR),
            'technician',
            ?,
            'technician',
            ?,
            ?,
            GETDATE(),
            ?,
            'completed',
            GETDATE(),
            GETDATE()
          );
          SELECT SCOPE_IDENTITY() as movement_id;
        `, {
          replacements: [call_id, technicianId, technicianId, totalUsedQty, technician_id || null],
          transaction,
          raw: true,
          nest: false
        });
        
        // Extract movement_id from SCOPE_IDENTITY() result
        // Sequelize patterns:
        // Pattern 1: result = [[{movement_id: X}]] for multi-statement with raw:true
        // Pattern 2: result = [{movement_id: X}] for single select with raw:true
        let movementIdValue = null;
        
        console.log(`   Debug: result type=${typeof result}, isArray=${Array.isArray(result)}, length=${result?.length}`);
        
        if (Array.isArray(result)) {
          // Try to find SCOPE_IDENTITY value in result
          if (result.length > 1) {
            // Multi-statement result: [[INSERT result], [SELECT result]]
            const selectResult = result[1];
            console.log(`   Debug: selectResult=${JSON.stringify(selectResult)}`);
            if (Array.isArray(selectResult) && selectResult.length > 0) {
              movementIdValue = selectResult[0].movement_id || Object.values(selectResult[0])[0];
            }
          } else if (result.length === 1 && result[0]) {
            // Single result with multiple columns, first one is SCOPE_IDENTITY
            console.log(`   Debug: result[0]=${JSON.stringify(result[0])}`);
            movementIdValue = result[0].movement_id || Object.values(result[0])[0];
          }
        }
        
        movementId = movementIdValue;
        
        console.log(`   📊 Stock movement inserted`);
        console.log(`      Movement ID: ${movementId || '(failed to extract)'}`);
        
        if (movementId && movementId > 0) {
          console.log(`   ✅ Stock movement created: ID=${movementId}`);
          console.log(`      Movement: GOOD → DEFECTIVE (technician inventory)`);
          console.log(`      Type: DEFECTIVE_MARKING | Operation: TRANSFER_TO_DEFECTIVE`);
          console.log(`      Quantity: ${totalUsedQty} | Technician: ${technicianId}`);
        } else {
          console.log(`   ⚠️  Stock movement created but no ID returned. Value: ${movementId}`);
        }
      } catch (mvtErr) {
        console.error(`   ⚠️  Error creating stock movement:`, mvtErr.message);
        // Don't fail the entire operation if stock movement fails
      }

      // Step 4: Create goods_movement_items for each spare in the single movement
      if (movementId) {
        console.log(`\n3️⃣ Creating goods movement items...`);
        for (const usage of itemsForMovement) {
          try {
            await sequelize.query(`
              INSERT INTO goods_movement_items (
                movement_id, spare_part_id, qty, condition, created_at, updated_at
              ) VALUES (
                ?, ?, ?, 'defective', GETDATE(), GETDATE()
              )
            `, {
              replacements: [movementId, usage.spare_part_id, usage.used_qty],
              transaction
            });
            console.log(`   ✅ Goods item created: spare_id=${usage.spare_part_id}, qty=${usage.used_qty}`);
          } catch (gmiErr) {
            console.error(`   ⚠️  Error creating goods_movement_item for spare ${usage.spare_part_id}:`, gmiErr.message);
          }
        }
      }

      // Step 5: Update spare_inventory for each spare
      // Decrease qty_good (spares used from good stock)
      // Increase qty_defective (spares marked as defective during call)
      console.log(`\n4️⃣ Updating spare inventory...`);
      for (const usage of itemsForMovement) {
        const usedQty = usage.used_qty;
        const spareId = usage.spare_part_id;
        const usageTechId = usage.used_by_tech_id || technicianId;

        try {
          // First, try to UPDATE existing inventory
          const updateResult = await sequelize.query(`
            UPDATE spare_inventory
            SET qty_good = CASE WHEN qty_good >= ? THEN qty_good - ? ELSE 0 END,
                qty_defective = qty_defective + ?,
                updated_at = GETDATE()
            WHERE spare_id = ?
              AND location_type = 'technician'
              AND location_id = ?
          `, {
            replacements: [usedQty, usedQty, usedQty, spareId, usageTechId],
            transaction
          });

          if (updateResult[1] && updateResult[1] > 0) {
            console.log(`   ✅ Inventory updated: spare_id=${spareId}, qty_good-=${usedQty}, qty_defective+=${usedQty}`);
            inventoryUpdated++;
          } else {
            // If no existing record, create new one
            console.log(`   ℹ️  No existing inventory, creating new entry for spare_id=${spareId}`);
            await sequelize.query(`
              INSERT INTO spare_inventory (
                spare_id, location_type, location_id, qty_good, qty_defective,
                created_at, updated_at
              ) VALUES (
                ?, 'technician', ?, 0, ?, GETDATE(), GETDATE()
              )
            `, {
              replacements: [spareId, usageTechId, usedQty],
              transaction
            });
            console.log(`   ✅ Created new inventory entry with qty_defective=${usedQty}`);
            inventoryUpdated++;
          }
        } catch (invErr) {
          console.error(`   ❌ Error updating inventory for spare ${spareId}:`, invErr.message);
          throw invErr;
        }
      }
    } else {
      console.log(`\n2️⃣ No spares with used_qty > 0, skipping stock movement creation`);
    }

    // Step 5: Update TAT tracking - Set end time when call closes
    console.log(`\n5️⃣ Updating TAT tracking - Setting tat_end_time...`);
    try {
      const [tatUpdateResult] = await sequelize.query(`
        UPDATE tat_tracking
        SET tat_end_time = GETDATE(),
            tat_status = 'resolved',
            updated_at = GETDATE()
        WHERE call_id = ?;
        
        SELECT 
          id,
          call_id,
          tat_start_time,
          tat_end_time,
          DATEDIFF(MINUTE, tat_start_time, tat_end_time) as total_tat_minutes
        FROM tat_tracking
        WHERE call_id = ?
      `, {
        replacements: [call_id, call_id],
        transaction
      });

      if (tatUpdateResult && tatUpdateResult.length > 0) {
        const tatData = tatUpdateResult[0];
        console.log(`   ✅ TAT tracking completed:`);
        console.log(`      Start Time: ${tatData.tat_start_time}`);
        console.log(`      End Time: ${tatData.tat_end_time}`);
        console.log(`      Total TAT: ${tatData.total_tat_minutes} minutes`);
      } else {
        console.log(`   ⚠️  No TAT tracking found for this call (TAT may not have been started)`);
      }
    } catch (tatErr) {
      console.error(`   ⚠️  Error updating TAT tracking:`, tatErr.message);
      // Don't fail the operation if TAT update fails
    }

    // Step 6: Get technician name for closed_by field
    let closedByName = null;
    try {
      const [techData] = await sequelize.query(`
        SELECT t.name
        FROM users t
        WHERE t.user_id = ?
      `, {
        replacements: [userId],
        transaction
      });
      if (techData && techData.length > 0) {
        closedByName = techData[0].name;
      }
    } catch (nameErr) {
      console.warn(`⚠️ Could not fetch user name for user_id ${userId}:`, nameErr.message);
    }

    // Step 7: Update call status to CLOSED and set closed_by fields
    console.log(`\n6️⃣ Updating call status to CLOSED...`);
    const statusUpdate = await sequelize.query(`
      UPDATE calls
      SET status_id = 8,
          sub_status_id = NULL,
          closed_by = ?,
          closed_by_user_id = ?,
          updated_at = GETDATE()
      WHERE call_id = ?
    `, {
      replacements: [closedByName || 'System', userId || null, call_id],
      transaction
    });

    if (statusUpdate[1] === 0) {
      throw new Error(`Call ${call_id} not found`);
    }

    console.log(`   ✅ Call status updated to CLOSED (status_id=8)`);
    console.log(`   ✅ Closed by: ${closedByName || 'System'} (User ID: ${userId})`);
    // Commit transaction
    await safeCommit(transaction);
    console.log(`\n✅ CALL CLOSED SUCCESSFULLY\n`);

    res.json({
      ok: true,
      message: 'Call closed and spare movements processed',
      call_id,
      data: {
        call_id: call_id,
        status_id: 8,
        status_name: 'CLOSED',
        closed_by: closedByName || 'System',
        closed_by_user_id: userId,
        spare_movements: {
          stock_movement_created: !!movementId,
          stock_movement_id: movementId,
          total_spares_used: spareUsages.length,
          total_qty_processed: totalUsedQty,
          inventory_updates: inventoryUpdated,
        },
        tat_tracking: {
          message: 'TAT end time set to current time (call closure time)',
          tat_end_time: new Date(),
          tat_status: 'resolved'
        }
      },
    });

  } catch (err) {
    await safeRollback(transaction, err);
    console.error('❌ Error closing call:', err);
    res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
});

export default router;
