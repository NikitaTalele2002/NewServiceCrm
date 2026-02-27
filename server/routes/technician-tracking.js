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
import { recordCallSpareUsage } from '../services/callSpareUsageService.js';

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
 * Create a new spare consumption record with defective tracking
 * 
 * Request body:
 * {
 *   call_id: number,
 *   spare_part_id: number,
 *   issued_qty: number,
 *   used_qty: number,           // Qty of spare part used to replace defective part
 *   returned_qty?: number,       // Qty to be returned (default: issued_qty - used_qty)
 *   used_by_tech_id: number,
 *   remarks?: string
 * }
 * 
 * When used_qty > 0, the defective part (removed during replacement) is tracked:
 * - spare_inventory.qty_defective increases by used_qty
 * - spare_inventory.qty_good decreases by used_qty
 */
router.post('/spare-consumption', async (req, res) => {
  const transaction = await sequelize.transaction();
  
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
      await transaction.rollback();
      return res.status(400).json({
        ok: false,
        error: 'Missing required fields: call_id, spare_part_id, issued_qty',
      });
    }

    // Get technician ID from call if not provided
    let technicianId = used_by_tech_id;
    if (!technicianId) {
      const [callData] = await sequelize.query(
        `SELECT assigned_tech_id FROM calls WHERE call_id = ?`,
        { replacements: [call_id], transaction }
      );
      if (callData && callData.length > 0) {
        technicianId = callData[0].assigned_tech_id;
      }
    }

    if (!technicianId) {
      await transaction.rollback();
      return res.status(400).json({
        ok: false,
        error: 'Technician ID not found. Provide used_by_tech_id or ensure call has assigned_tech_id',
      });
    }

    const finalUsedQty = used_qty || 0;
    const finalReturnedQty = returned_qty !== undefined ? returned_qty : (issued_qty - finalUsedQty);
    const usage_status = finalUsedQty === 0 ? 'NOT_USED' : finalUsedQty < issued_qty ? 'PARTIAL' : 'USED';

    console.log('\n' + '='.repeat(70));
    console.log('📝 RECORDING SPARE CONSUMPTION WITH DEFECTIVE TRACKING');
    console.log('='.repeat(70));
    console.log(`Call ID: ${call_id}`);
    console.log(`Spare Part ID: ${spare_part_id}`);
    console.log(`Issued Qty: ${issued_qty}`);
    console.log(`Used Qty (defective to be returned): ${finalUsedQty}`);
    console.log(`Returned Qty: ${finalReturnedQty}`);
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

    // Step 3: Create stock movement record for audit trail (optional - table may not exist)
    if (finalUsedQty > 0) {
      try {
        await sequelize.query(`
          INSERT INTO stock_movements (
            spare_id, location_type, location_id, movement_type, 
            quantity, reference_type, reference_id, created_at, updated_at
          ) VALUES (
            ?, 'technician', ?, 'DEFECTIVE_TRACKED',
            ?, 'call_spare_usage', ?, GETDATE(), GETDATE()
          )
        `, {
          replacements: [spare_part_id, technicianId, finalUsedQty, usageId],
          transaction
        });
        console.log(`   ✅ Movement record created (DEFECTIVE_TRACKED)`);
      } catch (mvtErr) {
        // Stock movements table might not exist, but it's not critical
        console.log(`   ⚠️ Stock movement not recorded: ${mvtErr.message.substring(0, 50)}...`);
      }
    }

    await transaction.commit();
    console.log(`\n✅ Spare consumption recorded successfully\n`);

    res.json({
      ok: true,
      message: 'Spare consumption recorded successfully with defective tracking',
      usage_id: usageId,
      data: {
        call_id,
        spare_part_id,
        issued_qty,
        used_qty: finalUsedQty,
        returned_qty: finalReturnedQty,
        usage_status,
        technician_id: technicianId,
        defective_tracked: finalUsedQty > 0,
        remarks,
      },
    });
  } catch (err) {
    await transaction.rollback();
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

/**
 * POST /api/technician-tracking/call/:callId/close
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
router.post('/call/:callId/close', async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { callId } = req.params;
    const { technician_id, status = 'CLOSED' } = req.body;

    console.log('\n' + '='.repeat(70));
    console.log('📋 CLOSING CALL - PROCESSING SPARE USAGE');
    console.log('='.repeat(70));
    console.log(`Call ID: ${callId}`);
    console.log(`Technician ID: ${technician_id}`);
    console.log(`New Status: ${status}`);

    // Step 1: Get all spare usage records for this call with used_qty > 0
    console.log('\n1️⃣ Getting spare usage records...');
    const usageRecords = await sequelize.query(`
      SELECT 
        usage_id,
        call_id,
        spare_part_id,
        issued_qty,
        used_qty,
        returned_qty,
        usage_status,
        used_by_tech_id
      FROM call_spare_usage
      WHERE call_id = ? AND used_qty > 0
      ORDER BY usage_id DESC
    `, {
      replacements: [callId],
      transaction
    });

    const spareUsages = usageRecords[0] || [];
    console.log(`   Found ${spareUsages.length} spare usage record(s) with used_qty > 0`);

    // Step 2: Calculate total quantity and get technician ID
    let totalUsedQty = 0;
    let technicianId = technician_id;
    const itemsForMovement = [];

    for (const usage of spareUsages) {
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
    // This moves spares from technician's GOOD bucket to DEFECTIVE bucket (internal transfer)
    if (totalUsedQty > 0 && technicianId) {
      console.log(`\n2️⃣ Creating SINGLE stock movement (technician internal transfer)...`);
      
      try {
        const [movementResult] = await sequelize.query(`
          INSERT INTO stock_movement (
            stock_movement_type,
            bucket,
            bucket_operation,
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
            'GOOD',
            'DECREASE',
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
          replacements: [callId, technicianId, technicianId, totalUsedQty, technician_id || null],
          transaction,
          raw: true
        });
        
        movementId = movementResult?.[0]?.movement_id;
        
        if (movementId) {
          console.log(`   ✅ Stock movement created: ID=${movementId} (technician→technician internal transfer)`);
          console.log(`      Type: DEFECTIVE_MARKING | Qty: ${totalUsedQty}`);
        } else {
          console.log(`   ⚠️  Stock movement created but no ID returned`);
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

    // Step 6: Update call status to CLOSED/REPAIR_CLOSED
    console.log(`\n5️⃣ Updating call status to ${status}...`);
    const statusUpdate = await sequelize.query(`
      UPDATE calls
      SET status = ?,
          updated_at = GETDATE()
      WHERE call_id = ?
    `, {
      replacements: [status, callId],
      transaction
    });

    if (statusUpdate[1] === 0) {
      throw new Error(`Call ${callId} not found`);
    }

    console.log(`   ✅ Call status updated to ${status}`);

    // Commit transaction
    await transaction.commit();
    console.log(`\n✅ CALL CLOSED SUCCESSFULLY\n`);

    res.json({
      ok: true,
      message: 'Call closed and spare movements processed',
      callId,
      data: {
        call_id: callId,
        status,
        spare_movements: {
          stock_movement_created: !!movementId,
          stock_movement_id: movementId,
          total_spares_used: spareUsages.length,
          total_qty_processed: totalUsedQty,
          inventory_updates: inventoryUpdated,
        },
      },
    });

  } catch (err) {
    await transaction.rollback();
    console.error('❌ Error closing call:', err);
    res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
});

export default router;
