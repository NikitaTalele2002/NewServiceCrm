/**
 * Service Center to Branch Spare Request Routes
 * 
 * Handles spare requests from Service Center to Branch
 * Examples:
 * - Send spare parts from Service Center to Branch for deployment
 * - Return defective/excess stock from SC to Branch  
 * - Inventory transfers between SC and Branch
 */

import express from 'express';
import { sequelize } from '../db.js';
import { SpareRequest, SpareInventory, StockMovement } from '../models/index.js';
import { authenticateToken } from '../middleware/auth.js';
import { QueryTypes } from 'sequelize';
import {
  processMovement,
  validateBucketOperation
} from '../services/bucketTrackingService.js';
import { SPARE_REQUEST_TO_MOVEMENTS } from '../constants/requestTypeConstants.js';

const router = express.Router();

/**
 * GET /api/sc-branch-requests/inventory/:scId/:spareId
 * Check available inventory at Service Center for transfer to Branch
 */
router.get('/inventory/:scId/:spareId', authenticateToken, async (req, res) => {
  try {
    const { scId, spareId } = req.params;
    
    const inventory = await SpareInventory.findOne({
      where: {
        spare_id: spareId,
        location_type: 'service_center',
        location_id: scId
      }
    });

    if (!inventory) {
      return res.status(404).json({
        success: false,
        data: {
          available_to_send: {
            good: 0,
            defective: 0,
            in_transit: 0
          },
          message: 'No inventory found for this spare at Service Center'
        }
      });
    }

    res.json({
      success: true,
      data: {
        spare_id: spareId,
        location: `Service Center ${scId}`,
        inventory: {
          good: inventory.qty_good || 0,
          defective: inventory.qty_defective || 0,
          in_transit: inventory.qty_in_transit || 0
        },
        available_to_send: {
          good: inventory.qty_good || 0,
          defective: inventory.qty_defective || 0,
          in_transit: inventory.qty_in_transit || 0
        }
      }
    });
  } catch (error) {
    console.error('Error checking SC inventory:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check inventory',
      details: error.message
    });
  }
});

/**
 * POST /api/sc-branch-requests
 * Create a spare request from Service Center to Branch
 * 
 * Request Types:
 * - SEND_TO_BRANCH: Send spare parts from SC to Branch
 * - RETURN_DEFECTIVE: Return defective parts from SC to Branch  
 * - RETURN_EXCESS: Return excess/unused stock from SC to Branch
 */
router.post('/', authenticateToken, async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      spare_request_type,    // SEND_TO_BRANCH | RETURN_DEFECTIVE | RETURN_EXCESS
      spare_id,
      quantity,
      sc_id,                 // Source Service Center
      branch_id,             // Destination Branch
      reason,
      notes
    } = req.body;

    // Validate required fields
    if (!spare_id || !quantity || !sc_id || !branch_id) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: spare_id, quantity, sc_id, branch_id'
      });
    }

    // Validate spare exists
    const spare = await sequelize.query(
      'SELECT Id, PART, DESCRIPTION FROM spare_parts WHERE Id = ?',
      {
        replacements: [spare_id],
        type: QueryTypes.SELECT,
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

    // Map spare request type to standard types and validate stock
    let finalRequestType = spare_request_type;
    if (!finalRequestType) {
      // Default to SEND_TO_BRANCH if not specified
      finalRequestType = 'SEND_TO_BRANCH';
    }

    // For transfers from SC, validate we have stock to send
    const validation = await validateBucketOperation(
      spare_id,
      'service_center',
      sc_id,
      quantity
    );

    if (!validation.valid) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        error: validation.message,
        available: validation.available,
        requested: quantity
      });
    }

    // Create the spare request
    const request = await SpareRequest.create(
      {
        spare_request_type: finalRequestType,
        spare_id: spare_id,
        quantity: quantity,
        requested_by: req.user?.id || 1,
        approved_status: 'approved',  // SC to Branch auto-approved
        status: 'completed',
        notes: notes || null,
        request_reason: reason || finalRequestType,
        requested_source_type: 'service_center',
        requested_source_id: sc_id,
        requested_to_type: 'branch',
        requested_to_id: branch_id,
        created_at: new Date()
      },
      { transaction }
    );

    console.log(`✅ Created SC→Branch request ${request.request_id} (${finalRequestType})`);

    // Create stock movement (map to standard movement types)
    let movementType = 'SC_TO_BRANCH_OUT'; // Default output movement
    
    if (finalRequestType === 'RETURN_DEFECTIVE') {
      movementType = 'SC_RETURN_DEFECTIVE_OUT';
    } else if (finalRequestType === 'RETURN_EXCESS') {
      movementType = 'SC_RETURN_EXCESS_OUT';
    }

    const movements = [];
    try {
      const movementData = {
        stock_movement_type: movementType,
        spare_id: spare_id,
        total_qty: quantity,
        reference_type: 'spare_request',
        reference_no: `SR-${request.request_id}`,
        source_location_type: 'service_center',
        source_location_id: sc_id,
        destination_location_type: 'plant',
        destination_location_id: branch_id,
        status: 'completed',
        bucket: 'good',  // Default bucket
        bucket_operation: 'DECREASE'
      };

      const result = await processMovement(movementData, transaction);

      movements.push({
        movement_id: result.movement?.movement_id,
        stock_movement_type: movementType,
        bucket: result.bucketUpdate?.bucket,
        operation: result.bucketUpdate?.operation,
        quantity: quantity
      });
    } catch (mvtError) {
      console.error('Movement creation warning:', mvtError.message);
      // Don't fail the entire request if movement fails
    }

    await transaction.commit();

    res.json({
      success: true,
      request: {
        request_id: request.request_id,
        type: finalRequestType,
        spare_id: spare_id,
        quantity: quantity,
        source: `Service Center ${sc_id}`,
        destination: `Branch ${branch_id}`,
        status: 'completed',
        movements: movements
      }
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error creating SC→Branch request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create spare request',
      details: error.message
    });
  }
});

/**
 * GET /api/sc-branch-requests
 * List all SC to Branch spare requests with optional filters
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { sc_id, branch_id, status, dateFrom, dateTo } = req.query;

    let whereClause = `WHERE requested_source_type = 'service_center' AND requested_to_type = 'branch'`;
    const params = [];

    if (sc_id) {
      whereClause += ` AND requested_source_id = ?`;
      params.push(sc_id);
    }

    if (branch_id) {
      whereClause += ` AND requested_to_id = ?`;
      params.push(branch_id);
    }

    if (status) {
      whereClause += ` AND status = ?`;
      params.push(status);
    }

    if (dateFrom) {
      whereClause += ` AND created_at >= ?`;
      params.push(dateFrom);
    }

    if (dateTo) {
      whereClause += ` AND created_at <= ?`;
      params.push(dateTo);
    }

    const query = `
      SELECT 
        sr.request_id,
        sr.spare_request_type,
        sr.quantity,
        sr.status,
        sr.created_at,
        sr.requested_source_id as sc_id,
        sr.requested_to_id as branch_id,
        sp.PART as spare_code,
        sp.DESCRIPTION as spare_description
      FROM spare_requests sr
      LEFT JOIN spare_parts sp ON sr.spare_id = sp.Id
      ${whereClause}
      ORDER BY sr.created_at DESC
    `;

    const requests = await sequelize.query(query, {
      replacements: params,
      type: QueryTypes.SELECT
    });

    res.json({
      success: true,
      data: requests,
      total: requests.length
    });
  } catch (error) {
    console.error('Error listing SC→Branch requests:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list requests',
      details: error.message
    });
  }
});

/**
 * GET /api/sc-branch-requests/:id
 * Get a specific SCto Branch spare request with movements
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Get request details
    const query = `
      SELECT 
        sr.request_id,
        sr.spare_request_type,
        sr.spare_id,
        sr.quantity,
        sr.status,
        sr.notes,
        sr.created_at,
        sr.requested_source_id as sc_id,
        sr.requested_to_id as branch_id,
        sp.PART as spare_code,
        sp.DESCRIPTION as spare_description
      FROM spare_requests sr
      LEFT JOIN spare_parts sp ON sr.spare_id = sp.Id
      WHERE sr.request_id = ? 
        AND sr.requested_source_type = 'service_center'
        AND sr.requested_to_type = 'branch'
    `;

    const requests = await sequelize.query(query, {
      replacements: [id],
      type: QueryTypes.SELECT
    });

    if (!requests || requests.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Request not found'
      });
    }

    const request = requests[0];

    // Get movements for this request
    const movements = await sequelize.query(
      `SELECT movement_id, stock_movement_type, total_qty, bucket, bucket_operation, created_at
       FROM stock_movements 
       WHERE reference_type = 'spare_request' AND reference_no = ?
       ORDER BY created_at DESC`,
      {
        replacements: [`SR-${id}`],
        type: QueryTypes.SELECT
      }
    );

    res.json({
      success: true,
      data: {
        ...request,
        movements: movements
      }
    });
  } catch (error) {
    console.error('Error fetching SC→Branch request:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch request',
      details: error.message
    });
  }
});

export default router;
