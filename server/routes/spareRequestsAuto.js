/**
 * Spare Request Routes with AUTOMATIC type determination
 * No manual reason input - system determines type based on inventory & item status
 */

import { Router } from 'express';
import { SpareRequest, SpareRequestItem } from '../models/index.js';
import { determineTypeAutomatically, getAutoDeterminationSummary } from '../utils/determineTypeAutomatically.js';
import { LOCATION_TYPES } from '../constants/requestTypeConstants.js';
import { sequelize } from '../config/database.js';

const router = Router();

/**
 * POST /api/spare-requests/auto
 * Create spare request with AUTOMATIC type determination
 * 
 * Request body:
 * {
 *   "requested_source_id": 3,           // ASC ID
 *   "requested_to_id": 1,               // Branch ID
 *   "items": [
 *     {
 *       "spare_id": 1,
 *       "quantity": 5,
 *       "is_defective": false,          // System checks this
 *       "is_verified": false,           // System checks this
 *       "is_unused": false              // System checks this
 *     }
 *   ]
 * }
 * 
 * Response: {request_type, sap_code, request_reason, analysis}
 */
router.post('/auto', async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const {
      requested_source_id,
      requested_to_id,
      items = [],
      call_id = null,
      created_by = null
    } = req.body;

    // Validate required fields
    if (!requested_source_id || !requested_to_id || !items || items.length === 0) {
      return res.status(400).json({
        error: 'Missing required fields: requested_source_id, requested_to_id, items array'
      });
    }

    // 1. AUTO-DETERMINE type based on inventory & item status
    const autoResult = await determineTypeAutomatically({
      fromType: LOCATION_TYPES.SERVICE_CENTER,
      fromId: requested_source_id,
      toType: LOCATION_TYPES.BRANCH,
      toId: requested_to_id,
      items
    });

    // 2. Create SpareRequest with auto-determined values
    const spareRequest = await SpareRequest.create(
      {
        request_type: autoResult.request_type,
        sap_code: autoResult.sap_code,
        call_id,
        requested_source_type: LOCATION_TYPES.SERVICE_CENTER,
        requested_source_id,
        requested_to_type: LOCATION_TYPES.BRANCH,
        requested_to_id,
        request_reason: autoResult.request_reason,
        status_id: 1,  // pending
        created_by
      },
      { transaction }
    );

    // 3. Create SpareRequestItems
    for (const item of items) {
      await SpareRequestItem.create(
        {
          request_id: spareRequest.request_id,
          spare_id: item.spare_id,
          quantity: item.quantity,
          is_defective: item.is_defective || false,
          is_verified: item.is_verified || false,
          is_unused: item.is_unused || false
        },
        { transaction }
      );
    }

    await transaction.commit();

    // 4. Return with analysis showing WHY this type was chosen
    return res.json({
      success: true,
      request_id: spareRequest.request_id,
      request_type: autoResult.request_type,
      sap_code: autoResult.sap_code,
      request_reason: autoResult.request_reason,
      analysis: autoResult.analysis,
      message: 'Request created with auto-determined type'
    });
  } catch (error) {
    await transaction.rollback();
    console.error(`Error creating spare request: ${error.message}`);
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * POST /api/spare-requests/analyze
 * Preview what type would be auto-determined WITHOUT creating request
 * Useful for showing user "This will be treated as CFS because..."
 * 
 * Same request body structure as /auto
 */
router.post('/analyze', async (req, res) => {
  try {
    const { requested_source_id, requested_to_id, items = [] } = req.body;

    if (!requested_source_id || !requested_to_id || !items || items.length === 0) {
      return res.status(400).json({
        error: 'Missing required fields'
      });
    }

    // Just analyze, don't create
    const autoResult = await determineTypeAutomatically({
      fromType: LOCATION_TYPES.SERVICE_CENTER,
      fromId: requested_source_id,
      toType: LOCATION_TYPES.BRANCH,
      toId: requested_to_id,
      items
    });

    return res.json({
      success: true,
      analysis: getAutoDeterminationSummary(autoResult),
      message: `Request will be created as: ${autoResult.sap_code} - ${autoResult.analysis.message}`
    });
  } catch (error) {
    console.error(`Error analyzing request: ${error.message}`);
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * GET /api/spare-requests/:id
 * Get request details with auto-determination analysis
 */
router.get('/:id', async (req, res) => {
  try {
    const request = await SpareRequest.findByPk(req.params.id, {
      include: [
        {
          association: 'items',
          include: ['spare']
        }
      ]
    });

    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    res.json({
      ...request.toJSON(),
      sap_tracking: {
        code: request.sap_code,
        reason: request.request_reason,
        message: `Treated as ${request.sap_code} - ${request.request_type}`
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/spare-requests
 * List all requests with SAP codes
 */
router.get('/', async (req, res) => {
  try {
    const requests = await SpareRequest.findAll({
      attributes: [
        'request_id',
        'request_type',
        'sap_code',
        'request_reason',
        'requested_source_type',
        'requested_to_type',
        'status_id',
        'created_at'
      ],
      order: [['created_at', 'DESC']],
      limit: 50
    });

    res.json({
      success: true,
      count: requests.length,
      requests
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
