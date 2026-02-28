/**
 * Call Tracking API for Spare Returns
 *
 * Endpoints:
 * - GET /api/spare-tracking/call/:callId/history
 * - GET /api/spare-tracking/spare/:spareId/calls
 * - GET /api/spare-tracking/return/:requestId/calls
 * - GET /api/spare-tracking/spare/:spareId/audit-trail
 */

import express from 'express';
import { sequelize } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';
import { safeRollback, safeCommit, isTransactionActive } from '../utils/transactionHelper.js';
import {
  linkReturnItemToCallUsage,
  getCallDetailsForReturn,
  traceSpareToOriginalCalls,
  getSpareAuditTrail
} from '../services/spareReturnCallTrackingService.js';
import { QueryTypes } from 'sequelize';

const router = express.Router();

/**
 * GET /api/spare-tracking/call/:callId/history
 * Get all spares used in a call and their return status
 */
router.get('/call/:callId/history', authenticateToken, async (req, res) => {
  try {
    const { callId } = req.params;

    const spareHistory = await sequelize.query(
      `
      SELECT 
        c.call_id,
        c.complaint_number,
        c.created_at as call_date,
        cn.customer_name,
        cn.phone_number,
        p.product_name,
        sp.Id as spare_id,
        sp.PART as spare_name,
        sp.DESCRIPTION,
        csu.usage_id,
        csu.issued_qty,
        csu.used_qty,
        csu.returned_qty,
        (csu.used_qty - csu.returned_qty) as pending_return_qty,
        csu.created_at as usage_date,
        
        (
          SELECT COUNT(DISTINCT sr.request_id)
          FROM spare_request sr
          INNER JOIN spare_request_items sri ON sr.request_id = sri.request_id
          WHERE sri.call_usage_id = csu.usage_id
            AND sr.spare_request_type IN ('TECH_RETURN_DEFECTIVE', 'TECH_RETURN_EXCESS')
        ) as return_requests_submitted,

        (
          SELECT sr.spare_request_type
          FROM spare_request sr
          INNER JOIN spare_request_items sri ON sr.request_id = sri.request_id
          WHERE sri.call_usage_id = csu.usage_id
            AND sr.spare_request_type IN ('TECH_RETURN_DEFECTIVE', 'TECH_RETURN_EXCESS')
          ORDER BY sr.created_at DESC
          OFFSET 0 ROWS FETCH NEXT 1 ROWS ONLY
        ) as latest_return_type,

        (
          SELECT MAX(sr.created_at)
          FROM spare_request sr
          INNER JOIN spare_request_items sri ON sr.request_id = sri.request_id
          WHERE sri.call_usage_id = csu.usage_id
            AND sr.spare_request_type IN ('TECH_RETURN_DEFECTIVE', 'TECH_RETURN_EXCESS')
        ) as last_return_date

      FROM call_spare_usage csu
      INNER JOIN calls c ON csu.call_id = c.call_id
      INNER JOIN customers cn ON c.customer_id = cn.customer_id
      LEFT JOIN products p ON c.product_id = p.product_id
      LEFT JOIN spare_parts sp ON csu.spare_part_id = sp.Id

      WHERE c.call_id = ?

      ORDER BY csu.created_at DESC
      `,
      {
        replacements: [callId],
        type: QueryTypes.SELECT
      }
    );

    return res.json({
      success: true,
      call_id: callId,
      spare_count: spareHistory.length,
      spares: spareHistory
    });
  } catch (error) {
    console.error(`❌ Error fetching call spare history: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/spare-tracking/spare/:spareId/calls
 * Find all calls that used a specific spare (especially useful when spare comes back from ASC)
 */
router.get('/spare/:spareId/calls', authenticateToken, async (req, res) => {
  try {
    const { spareId } = req.params;

    const calls = await traceSpareToOriginalCalls(spareId);

    // Group by call and aggregate
    const callsMap = new Map();
    calls.forEach(call => {
      if (!callsMap.has(call.call_id)) {
        callsMap.set(call.call_id, {
          call_id: call.call_id,
          complaint_number: call.complaint_number,
          call_date: call.call_date,
          customer_name: call.customer_name,
          customer_phone: call.phone_number,
          customer_email: call.email,
          product_name: call.product_name,
          product_model: call.model_number,
          technician_name: call.technician_name,
          total_qty_used: 0,
          return_requests: 0,
          last_return_date: null
        });
      }
      const callData = callsMap.get(call.call_id);
      callData.total_qty_used += call.used_qty || 0;
      callData.return_requests = call.return_request_count || 0;
      if (call.last_return_date) {
        callData.last_return_date = call.last_return_date;
      }
    });

    const callsArray = Array.from(callsMap.values());

    return res.json({
      success: true,
      spare_id: spareId,
      spare_name: calls[0]?.spare_name || 'Unknown',
      calls_count: callsArray.length,
      calls: callsArray
    });
  } catch (error) {
    console.error(`❌ Error tracing spare to calls: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/spare-tracking/return/:requestId/calls
 * Get call details for all items in a return request
 */
router.get('/return/:requestId/calls', authenticateToken, async (req, res) => {
  try {
    const { requestId } = req.params;

    const callDetails = await getCallDetailsForReturn(requestId);

    // Group by call
    const callsMap = new Map();
    const sparesMap = new Map();

    callDetails.forEach(detail => {
      const callKey = `${detail.call_id}`;
      if (!callsMap.has(callKey)) {
        callsMap.set(callKey, {
          call_id: detail.call_id,
          complaint_number: detail.complaint_number,
          call_date: detail.call_date,
          customer_name: detail.customer_name,
          customer_phone: detail.phone_number,
          product_name: detail.product_name,
          spares: []
        });
      }

      const spareKey = `${detail.call_id}-${detail.spare_id}`;
      if (!sparesMap.has(spareKey)) {
        sparesMap.set(spareKey, {
          spare_id: detail.spare_id,
          spare_name: detail.spare_name,
          spare_description: detail.spare_description,
          return_qty: detail.return_qty,
          original_used_qty: detail.used_qty,
          original_issued_qty: detail.issued_qty,
          usage_date: detail.usage_date,
          return_type: detail.spare_request_type
        });

        callsMap.get(callKey).spares.push(sparesMap.get(spareKey));
      }
    });

    return res.json({
      success: true,
      return_request_id: requestId,
      calls_count: callsMap.size,
      calls: Array.from(callsMap.values())
    });
  } catch (error) {
    console.error(`❌ Error fetching return call details: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/spare-tracking/spare/:spareId/audit-trail
 * Complete lifecycle of a spare from allocation to plant reception
 */
router.get('/spare/:spareId/audit-trail', authenticateToken, async (req, res) => {
  try {
    const { spareId } = req.params;

    const trail = await getSpareAuditTrail(spareId);

    // Group by stage
    const stagesMap = new Map();
    const allCalls = new Set();

    trail.forEach(event => {
      const stage = event.stage;
      if (!stagesMap.has(stage)) {
        stagesMap.set(stage, []);
      }
      stagesMap.get(stage).push(event);

      if (event.call_id) {
        allCalls.add(event.call_id);
      }
    });

    return res.json({
      success: true,
      spare_id: spareId,
      calls_involved: Array.from(allCalls),
      total_events: trail.length,
      audit_trail: trail,
      summary: {
        allocation_events: stagesMap.get('ALLOCATION')?.length || 0,
        usage_events: stagesMap.get('USAGE')?.length || 0,
        return_events: stagesMap.get('RETURN')?.length || 0,
        movement_events: stagesMap.get('MOVEMENT')?.length || 0
      }
    });
  } catch (error) {
    console.error(`❌ Error fetching audit trail: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Internal function: Link return item to call usage
 * Called when processing return requests
 */
router.post('/link-return-to-call', authenticateToken, async (req, res) => {
  let transaction;
  try {
    const { requestId, spareId, callId } = req.body;

    // Validate BEFORE creating transaction
    if (!requestId || !spareId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: requestId, spareId'
      });
    }

    // Create transaction AFTER validation
    transaction = await sequelize.transaction();

    const usage = await linkReturnItemToCallUsage(
      requestId,
      spareId,
      null,  // returnedQty - not used here
      callId,
      transaction
    );

    await safeCommit(transaction);

    return res.json({
      success: true,
      usage_id: usage?.usage_id,
      call_id: usage?.call_id,
      message: `Linked return item to call ${usage?.call_id}`
    });
  } catch (error) {
    await safeRollback(transaction, error);
    console.error(`❌ Error linking return to call: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
