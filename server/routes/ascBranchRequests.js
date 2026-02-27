/**
 * ASC to Branch Spare Request Handler
 * Handles defective and excess spare returns from ASC to Branch
 * 
 * Supported Request Types:
 * - ASC_RETURN_DEFECTIVE: Return of defective spares from ASC to Branch
 * - ASC_RETURN_EXCESS: Return of excess/unused spares from ASC to Branch
 */

import express from 'express';
import { sequelize } from '../db.js';
import { SpareRequest, StockMovement } from '../models/index.js';
import { authenticateToken } from '../middleware/auth.js';
import {
  processMovement,
  getBucketSummary,
  validateBucketOperation
} from '../services/bucketTrackingService.js';
import {
  SPARE_REQUEST_TYPES,
  SPARE_REQUEST_TO_MOVEMENTS
} from '../constants/requestTypeConstants.js';

const router = express.Router();

/**
 * POST /api/asc-branch-requests
 * Create spare request from ASC to Branch/Warehouse
 * 
 * Body:
 * {
 *   spare_request_type: "ASC_RETURN_DEFECTIVE" | "ASC_RETURN_EXCESS",
 *   spare_id: number,
 *   quantity: number,
 *   asc_id: number (source - ASC service center),
 *   branch_id: number (destination - Warehouse/Branch),
 *   notes: string (optional)
 * }
 * 
 * Note: request_reason is set DYNAMICALLY based on spare_request_type
 * - ASC_RETURN_DEFECTIVE → reason: "defect"
 * - ASC_RETURN_EXCESS → reason: "excess"
 */
router.post('/', authenticateToken, async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      spare_request_type,
      spare_id,
      quantity,
      asc_id,
      branch_id,
      notes
    } = req.body;

    // Validate input
    if (!spare_id || !quantity || !asc_id || !branch_id) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: spare_id, quantity, asc_id, branch_id'
      });
    }

    // Validate spare request type
    if (!spare_request_type || 
        ![SPARE_REQUEST_TYPES.ASC_RETURN_DEFECTIVE, SPARE_REQUEST_TYPES.ASC_RETURN_EXCESS].includes(spare_request_type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid request type. Must be ASC_RETURN_DEFECTIVE or ASC_RETURN_EXCESS'
      });
    }

    // Dynamically set reason based on spare_request_type
    const requestReason = spare_request_type === SPARE_REQUEST_TYPES.ASC_RETURN_DEFECTIVE 
      ? 'defect' 
      : 'excess';

    // Verify spare exists
    const spare = await sequelize.query(
      'SELECT Id, PART, DESCRIPTION FROM spare_parts WHERE Id = ?',
      {
        replacements: [spare_id],
        type: sequelize.QueryTypes.SELECT,
        transaction
      }
    );

    if (!spare || spare.length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: `Spare ${spare_id} not found`
      });
    }

    // Get the plant assigned to this ASC
    const ascPlantInfo = await sequelize.query(
      `SELECT TOP 1 plant_id FROM service_centers WHERE asc_id = ?`,
      {
        replacements: [asc_id],
        type: sequelize.QueryTypes.SELECT,
        transaction
      }
    );

    const targetPlantId = (ascPlantInfo && ascPlantInfo[0]?.plant_id) || branch_id || 1;
    
    console.log(`✓ ASC ${asc_id} assigned to Plant: ${targetPlantId}`);

    // Check stock availability at ASC
    // For ASC_RETURN_DEFECTIVE: Check defective bucket
    // For ASC_RETURN_EXCESS: Check good bucket
    const bucketToCheck = spare_request_type === SPARE_REQUEST_TYPES.ASC_RETURN_DEFECTIVE 
      ? 'DEFECTIVE' 
      : 'GOOD';

    const inventory = await getBucketSummary(spare_id, 'service_center', asc_id);

    const availableQty = inventory[bucketToCheck] || 0;

    if (availableQty < quantity) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: `Insufficient ${bucketToCheck} stock at ASC`,
        available: availableQty,
        requested: quantity,
        bucket: bucketToCheck
      });
    }

    // Create the spare request record
    const request = await SpareRequest.create(
      {
        spare_request_type,
        spare_id,
        quantity,
        requested_by: req.user?.id || 0,
        approved_status: 'approved', // ASC-to-Plant requests are typically pre-approved
        status: 'open',
        notes,
        request_reason: requestReason, // Dynamic: 'defect' or 'excess'
        requested_source_type: 'service_center',
        requested_source_id: asc_id,
        requested_to_type: 'plant',
        requested_to_id: targetPlantId, // Use ASC's assigned plant, not hardcoded warehouse
        created_at: new Date()
      },
      { transaction }
    );

    console.log(`\n✅ Created ASC→Branch request ${request.request_id}`);
    console.log(`   Type: ${spare_request_type}`);
    console.log(`   Spare: ${spare[0].PART} (ID: ${spare_id})`);
    console.log(`   Quantity: ${quantity}`);
    console.log(`   From ASC ${asc_id} → To Branch ${branch_id}`);

    // Create stock movements
    const movementTypes = SPARE_REQUEST_TO_MOVEMENTS[spare_request_type] || [];
    const movements = [];

    for (const movementType of movementTypes) {
      try {
        const movementData = {
          stock_movement_type: movementType,
          spare_id,
          total_qty: quantity,
          reference_type: 'spare_request',
          reference_no: `SR-${request.request_id}`,
          source_location_type: 'service_center',
          source_location_id: asc_id,
          destination_location_type: 'plant',
          destination_location_id: branch_id,
          status: 'completed'
        };

        const result = await processMovement(movementData);

        movements.push({
          movement_id: result.movement.movement_id,
          stock_movement_type: movementType,
          bucket: result.bucketUpdate.bucket,
          operation: result.bucketUpdate.operation,
          quantity
        });

        console.log(`   ✅ Movement: ${movementType}`);
        console.log(`      ${result.bucketUpdate.bucket} ${result.bucketUpdate.operation} x${quantity}`);
      } catch (err) {
        console.error(`   ❌ Movement failed:`, err.message);
        await transaction.rollback();
        return res.status(500).json({
          success: false,
          error: `Failed to create movement: ${err.message}`
        });
      }
    }

    // Commit transaction
    await transaction.commit();

    console.log(`✅ Transaction committed successfully\n`);

    res.status(201).json({
      success: true,
      request: {
        request_id: request.request_id,
        request_number: `SR-${request.request_id}`,
        spare_request_type,
        spare_id,
        spare_code: spare[0].PART,
        spare_name: spare[0].DESCRIPTION,
        quantity,
        from: {
          type: 'service_center',
          id: asc_id,
          name: 'ASC'
        },
        to: {
          type: 'branch',
          id: branch_id,
          name: 'Branch'
        },
        status: 'open',
        approved_status: 'approved',
        created_at: request.created_at,
        movements: movements.map(m => ({
          movement_id: m.movement_id,
          type: m.stock_movement_type,
          bucket: m.bucket,
          operation: m.operation,
          quantity: m.quantity
        }))
      },
      message: `✅ ASC→Branch request created with ${movements.length} movements`
    });

  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error creating ASC→Branch request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create ASC→Branch request',
      details: error.message
    });
  }
});

/**
 * GET /api/asc-branch-requests
 * List all ASC to Branch spare requests
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { asc_id, branch_id, status, limit = 20, offset = 0 } = req.query;

    let whereClause = "spare_request_type IN ('ASC_RETURN_DEFECTIVE', 'ASC_RETURN_EXCESS')";
    const replacements = [];

    if (asc_id) {
      whereClause += ' AND requested_source_id = ?';
      replacements.push(asc_id);
    }

    if (branch_id) {
      whereClause += ' AND requested_to_id = ?';
      replacements.push(branch_id);
    }

    if (status) {
      whereClause += ' AND status = ?';
      replacements.push(status);
    }

    const requests = await sequelize.query(
      `SELECT 
        sr.request_id,
        'SR-' + CAST(sr.request_id AS VARCHAR) as request_number,
        sr.spare_request_type,
        sr.spare_id,
        sp.PART as spare_code,
        sp.DESCRIPTION as spare_name,
        sr.quantity,
        sr.status,
        sr.approved_status,
        sr.created_at,
        sr.requested_source_id as asc_id,
        sr.requested_to_id as branch_id
      FROM spare_requests sr
      LEFT JOIN spare_parts sp ON sr.spare_id = sp.Id
      WHERE ${whereClause}
      ORDER BY sr.created_at DESC
      OFFSET ? ROWS FETCH NEXT ? ROWS ONLY`,
      {
        replacements: [...replacements, parseInt(offset), parseInt(limit)],
        type: sequelize.QueryTypes.SELECT
      }
    );

    // Get total count
    const [countResult] = await sequelize.query(
      `SELECT COUNT(*) as total FROM spare_requests WHERE ${whereClause}`,
      { replacements }
    );

    res.json({
      success: true,
      data: requests,
      pagination: {
        total: countResult.total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        pages: Math.ceil(countResult.total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching ASC→Branch requests:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch requests',
      details: error.message
    });
  }
});

/**
 * GET /api/asc-branch-requests/:requestId
 * Get single ASC→Branch request with movements
 */
router.get('/:requestId', authenticateToken, async (req, res) => {
  try {
    const { requestId } = req.params;

    const request = await sequelize.query(
      `SELECT 
        sr.request_id,
        'SR-' + CAST(sr.request_id AS VARCHAR) as request_number,
        sr.spare_request_type,
        sr.spare_id,
        sp.PART as spare_code,
        sp.DESCRIPTION as spare_name,
        sr.quantity,
        sr.status,
        sr.approved_status,
        sr.created_at,
        sr.requested_source_id as asc_id,
        sr.requested_to_id as branch_id,
        sr.notes
      FROM spare_requests sr
      LEFT JOIN spare_parts sp ON sr.spare_id = sp.Id
      WHERE sr.request_id = ? AND sr.spare_request_type IN ('ASC_RETURN_DEFECTIVE', 'ASC_RETURN_EXCESS')`,
      {
        replacements: [requestId],
        type: sequelize.QueryTypes.SELECT
      }
    );

    if (!request || request.length === 0) {
      return res.status(404).json({
        success: false,
        error: `ASC→Branch request ${requestId} not found`
      });
    }

    // Get associated movements
    const movements = await sequelize.query(
      `SELECT 
        movement_id,
        stock_movement_type,
        bucket,
        bucket_operation,
        total_qty as quantity,
        status,
        movement_date
      FROM stock_movement
      WHERE reference_type = 'spare_request' AND reference_no = ?
      ORDER BY movement_date ASC`,
      {
        replacements: [`SR-${requestId}`],
        type: sequelize.QueryTypes.SELECT
      }
    );

    res.json({
      success: true,
      data: {
        ...request[0],
        from: {
          type: 'service_center',
          id: request[0].asc_id,
          name: 'ASC'
        },
        to: {
          type: 'branch',
          id: request[0].branch_id,
          name: 'Branch'
        },
        movements
      }
    });

  } catch (error) {
    console.error('Error fetching ASC→Branch request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch request',
      details: error.message
    });
  }
});

/**
 * GET /api/asc-branch-requests/inventory/:asc_id/:spare_id
 * Check available defective/excess stock at ASC for return
 */
router.get('/inventory/:asc_id/:spare_id', authenticateToken, async (req, res) => {
  try {
    const { asc_id, spare_id } = req.params;

    const inventory = await getBucketSummary(parseInt(spare_id), 'service_center', parseInt(asc_id));

    res.json({
      success: true,
      data: {
        spare_id: parseInt(spare_id),
        asc_id: parseInt(asc_id),
        available_to_return: {
          defective: inventory.DEFECTIVE || 0,
          excess: inventory.GOOD || 0
        },
        total_inventory: inventory.total
      },
      message: 'Available stock for ASC→Branch return'
    });

  } catch (error) {
    console.error('Error checking inventory:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check inventory',
      details: error.message
    });
  }
});

export default router;
