/**
 * Spare Return Call Tracking Service
 *
 * Handles linking returned spares back to the original calls/complaints
 * Maintains complete traceability through the return chain
 */

import { sequelize } from '../db.js';
import {
  CallSpareUsage,
  SpareRequestItem,
  SpareRequest,
  StockMovement,
  Calls,
  Customer,
  SparePart
} from '../models/index.js';
import { QueryTypes } from 'sequelize';
import { Op } from 'sequelize';

/**
 * Link a returned item to its original call usage
 * Called when technician submits a return request
 */
export async function linkReturnItemToCallUsage(
  requestId,
  spareId,
  returnedQty,
  callId = null,
  transaction = null
) {
  try {
    console.log(`\n🔗 Linking returned spare ${spareId} to call usage...`);

    // First, find the call_spare_usage record for this spare
    // If callId provided, use it; otherwise find the most recent usage
    let usage = null;

    if (callId) {
      usage = await CallSpareUsage.findOne({
        where: {
          call_id: callId,
          spare_part_id: spareId,
          used_qty: { [Op.gt]: 0 }
        },
        order: [['created_at', 'DESC']],
        transaction
      });
    } else {
      // Find most recent usage of this spare by this technician
      usage = await CallSpareUsage.findOne({
        where: {
          spare_part_id: spareId,
          used_qty: { [Op.gt]: 0 }
        },
        order: [['created_at', 'DESC']],
        transaction
      });
    }

    if (!usage) {
      console.warn(
        `⚠️  No call_spare_usage found for spare ${spareId}${
          callId ? ` in call ${callId}` : ''
        }`
      );
      return null;
    }

    // Update the spare_request_item with the call_usage_id
    const item = await SpareRequestItem.findOne(
      {
        where: {
          request_id: requestId,
          spare_id: spareId
        }
      },
      { transaction }
    );

    if (item) {
      await item.update(
        { call_usage_id: usage.usage_id },
        { transaction }
      );
      console.log(`   ✅ Linked spare_request_item to call_usage_id=${usage.usage_id} (call #${usage.call_id})`);
      return usage;
    } else {
      console.warn(`   ⚠️  spare_request_item not found for request ${requestId}, spare ${spareId}`);
    }
  } catch (error) {
    console.error(`❌ Error linking return to call usage: ${error.message}`);
    throw error;
  }
}

/**
 * Get call details for a returned spare
 */
export async function getCallDetailsForReturn(requestId) {
  try {
    const callDetails = await sequelize.query(
      `
      SELECT DISTINCT
        c.call_id,
        c.complaint_number,
        c.created_at as call_date,
        cn.customer_id,
        cn.customer_name,
        cn.phone_number,
        p.product_id,
        p.product_name,
        pr.product_group_name,
        sp.Id as spare_id,
        sp.PART as spare_name,
        sp.DESCRIPTION as spare_description,
        sri.id as request_item_id,
        sri.requested_qty as return_qty,
        csu.usage_id,
        csu.used_qty,
        csu.issued_qty,
        csu.returned_qty,
        csu.created_at as usage_date,
        sr.spare_request_type,
        sr.request_reason,
        sr.created_at as return_request_date

      FROM spare_request_items sri
      INNER JOIN spare_request sr ON sri.request_id = sr.request_id
      LEFT JOIN call_spare_usage csu ON sri.call_usage_id = csu.usage_id
      LEFT JOIN calls c ON csu.call_id = c.call_id
      LEFT JOIN customers cn ON c.customer_id = cn.customer_id
      LEFT JOIN products p ON c.product_id = p.product_id
      LEFT JOIN product_groups pr ON p.product_group_id = pr.product_group_id
      LEFT JOIN spare_parts sp ON sri.spare_id = sp.Id

      WHERE sr.request_id = ?

      ORDER BY c.call_id, sp.Id
      `,
      {
        replacements: [requestId],
        type: QueryTypes.SELECT
      }
    );

    return callDetails;
  } catch (error) {
    console.error(`❌ Error getting call details for return: ${error.message}`);
    throw error;
  }
}

/**
 * Trace all calls using a specific spare (when it comes back from ASC)
 */
export async function traceSpareToOriginalCalls(spareId) {
  try {
    const calls = await sequelize.query(
      `
      SELECT 
        c.call_id,
        c.complaint_number,
        c.created_at as call_date,
        cn.customer_name,
        cn.phone_number,
        cn.email,
        p.product_name,
        p.model_number,
        sp.PART as spare_name,
        sp.DESCRIPTION,
        csu.used_qty,
        csu.used_by_tech_id,
        u.name as technician_name,
        csu.usage_id,
        (
          SELECT COUNT(DISTINCT sr.request_id) 
          FROM spare_request sr
          INNER JOIN spare_request_items sri ON sr.request_id = sri.request_id
          WHERE sri.call_usage_id = csu.usage_id
            AND sr.spare_request_type IN ('TECH_RETURN_DEFECTIVE', 'TECH_RETURN_EXCESS')
        ) as return_request_count,
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
      LEFT JOIN users u ON csu.used_by_tech_id = u.user_id

      WHERE csu.spare_part_id = ?
        AND csu.used_qty > 0

      ORDER BY csu.created_at DESC
      `,
      {
        replacements: [spareId],
        type: QueryTypes.SELECT
      }
    );

    return calls;
  } catch (error) {
    console.error(`❌ Error tracing spare to calls: ${error.message}`);
    throw error;
  }
}

/**
 * Create stock movement with call reference when spare is returned through chain
 */
export async function createMovementWithCallReference(
  movementData,
  callUsageId = null,
  transaction = null
) {
  try {
    const {
      stock_movement_type,
      bucket,
      bucket_operation,
      spare_id,
      total_qty,
      source_location_type,
      source_location_id,
      destination_location_type,
      destination_location_id,
      reference_type = 'spare_request',
      reference_no = null,
      related_request_id = null
    } = movementData;

    // If call_usage_id provided, fetch the call details
    let relatedCallId = null;
    let relatedUsageId = callUsageId;

    if (callUsageId) {
      const usage = await CallSpareUsage.findOne({
        where: { usage_id: callUsageId },
        transaction
      });
      if (usage) {
        relatedCallId = usage.call_id;
        relatedUsageId = usage.usage_id;
      }
    }

    // Create the movement with call reference
    const movement = await StockMovement.create(
      {
        stock_movement_type,
        bucket,
        bucket_operation,
        spare_id,
        total_qty,
        source_location_type,
        source_location_id,
        destination_location_type,
        destination_location_id,
        reference_type: relatedCallId ? 'call_spare_usage' : reference_type,
        reference_no: relatedCallId ? `CALL-${relatedCallId}` : reference_no,
        related_call_id: relatedCallId,
        related_usage_id: relatedUsageId,
        related_request_id: related_request_id,
        status: 'pending',
        movement_date: new Date()
      },
      { transaction }
    );

    console.log(
      `✅ Created movement with call reference: movement_id=${movement.movement_id}, call_id=${relatedCallId || 'N/A'}`
    );

    return movement;
  } catch (error) {
    console.error(`❌ Error creating movement with call reference: ${error.message}`);
    throw error;
  }
}

/**
 * Get complete audit trail for a spare from allocation to plant reception
 */
export async function getSpareAuditTrail(spareId) {
  try {
    const trail = await sequelize.query(
      `
      SELECT 
        'ALLOCATION' as stage,
        sr.created_at as date,
        sr.spare_request_type as event_type,
        'Spare allocated to technician' as description,
        NULL as call_id,
        NULL as complaint_number,
        sr.requested_source_type as from_location,
        sr.requested_source_id as from_id,
        sr.requested_to_type as to_location,
        sr.requested_to_id as to_id
      FROM spare_request sr
      WHERE sr.spare_id = ? AND sr.spare_request_type = 'TECH_ISSUE'

      UNION ALL

      SELECT 
        'USAGE' as stage,
        csu.created_at as date,
        'SPARE_USED' as event_type,
        CONCAT('Used qty:', csu.used_qty) as description,
        c.call_id,
        c.complaint_number,
        'technician' as from_location,
        csu.used_by_tech_id as from_id,
        NULL as to_location,
        NULL as to_id
      FROM call_spare_usage csu
      INNER JOIN calls c ON csu.call_id = c.call_id
      WHERE csu.spare_part_id = ?

      UNION ALL

      SELECT 
        'RETURN' as stage,
        sr.created_at as date,
        sr.spare_request_type as event_type,
        CONCAT('Return qty:', sri.requested_qty) as description,
        sr.call_id,
        NULL as complaint_number,
        sr.requested_source_type as from_location,
        sr.requested_source_id as from_id,
        sr.requested_to_type as to_location,
        sr.requested_to_id as to_id
      FROM spare_request sr
      INNER JOIN spare_request_items sri ON sr.request_id = sri.request_id
      WHERE sri.spare_id = ? 
        AND sr.spare_request_type IN ('TECH_RETURN_DEFECTIVE', 'TECH_RETURN_EXCESS', 'ASC_RETURN_DEFECTIVE', 'ASC_RETURN_EXCESS')

      UNION ALL

      SELECT 
        'MOVEMENT' as stage,
        sm.created_at as date,
        sm.stock_movement_type as event_type,
        CONCAT('Qty:', sm.total_qty) as description,
        sm.related_call_id as call_id,
        NULL as complaint_number,
        sm.source_location_type as from_location,
        sm.source_location_id as from_id,
        sm.destination_location_type as to_location,
        sm.destination_location_id as to_id
      FROM stock_movement sm
      WHERE sm.spare_id = ?

      ORDER BY date ASC
      `,
      {
        replacements: [spareId, spareId, spareId, spareId],
        type: QueryTypes.SELECT
      }
    );

    return trail;
  } catch (error) {
    console.error(`❌ Error getting audit trail: ${error.message}`);
    throw error;
  }
}

export default {
  linkReturnItemToCallUsage,
  getCallDetailsForReturn,
  traceSpareToOriginalCalls,
  createMovementWithCallReference,
  getSpareAuditTrail
};
