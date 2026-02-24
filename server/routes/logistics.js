import express from 'express';
import { sequelize } from '../db.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { generateMockSAPData, formatSAPDataForDB } from '../services/sapIntegration.js';
import * as StockMovementService from '../services/StockMovementService.js';

const router = express.Router();

/**
 * POST /api/logistics/sync-sap
 * Trigger SAP integration when RSM approves a spare request or service center tracks order
 * Creates mock SAP documents and stores them in the database
 */
router.post('/sync-sap', authenticateToken, requireRole(['rsm', 'admin', 'service_center']), async (req, res) => {
  try {
    const { requestId } = req.body;

    if (!requestId) {
      return res.status(400).json({ ok: false, error: 'Request ID is required' });
    }

    // Fetch the spare request with items and spare part details
    const spareRequest = await sequelize.models.SpareRequest.findByPk(requestId, {
      include: [
        {
          model: sequelize.models.SpareRequestItem,
          as: 'SpareRequestItems',
          include: [
            {
              model: sequelize.models.SparePart,
              as: 'SparePart'
            }
          ]
        }
      ]
    });

    if (!spareRequest) {
      return res.status(404).json({ ok: false, error: 'Spare request not found' });
    }

    // Step 1: Get the plant assigned to the requesting ASC
    // The ASC that requested the spares is stored in requested_source_id
    console.log(`📝 Fetching plant assignment for ASC ${spareRequest.requested_source_id}...`);
    const serviceCenter = await sequelize.models.ServiceCenter.findByPk(spareRequest.requested_source_id);
    
    if (!serviceCenter) {
      console.log(`❌ Service Center ${spareRequest.requested_source_id} not found`);
      return res.status(404).json({
        ok: false,
        error: 'Service center not found'
      });
    }

    const plantId = serviceCenter.plant_id;
    
    if (!plantId) {
      console.log(`❌ No plant assigned to ASC ${spareRequest.requested_source_id}`);
      return res.status(400).json({
        ok: false,
        error: 'No plant assigned to this service center'
      });
    }

    console.log(`✅ ASC ${spareRequest.requested_source_id} is assigned to Plant ${plantId}`);

    // Verify that the request has been approved by RSM
    // Check if the associated status is 'approved_by_rsm'
    const statusRecord = await sequelize.models.Status.findByPk(spareRequest.status_id);
    const statusName = statusRecord?.status_name || '';
    
    if (statusName !== 'approved_by_rsm') {
      return res.status(403).json({ ok: false, error: 'Only approved requests can be synced to SAP. Please wait for RSM approval.' });
    }

    // Get items with proper field mapping from SpareRequestItem and SparePart
    const items = (spareRequest.SpareRequestItems || []).map(item => {
      const sparePart = item.SparePart || {};
      return {
        spare_id: item.spare_id,
        part_id: item.spare_id,
        sku: sparePart.PART || `PART-${item.spare_id}`,
        spareName: sparePart.BRAND || sparePart.PART || 'Unknown Part',
        spare_description: sparePart.DESCRIPTION || sparePart.MODEL_DESCRIPTION || 'Part Description',
        requested_qty: item.requested_qty || 0,
        approved_qty: item.approved_qty || 0,
        uom: 'PCS',  // Default Unit of Measure
        hsn: null    // HSN - to be populated from master if needed
      };
    });

    // Generate mock SAP data
    const sapData = generateMockSAPData(spareRequest, items);

    // Format data for database storage
    // Source: Plant assigned to ASC (auto-determined)
    // Destination: The ASC that requested the spares
    console.log(`📝 Using Plant ${plantId} as source warehouse (from ASC assignment)`);
    const formattedData = formatSAPDataForDB(sapData, 
      { type: 'warehouse', id: plantId }, 
      { type: 'service_center', id: spareRequest.requested_source_id }
    );

    // Start transaction
    const transaction = await sequelize.transaction();

    try {
      // Create logistics documents for each document type (SO, DN, CHALLAN)
      const createdDocs = [];
      let dnDocument = null;
      
      for (const docData of formattedData.documents) {
        const { items: docItems, ...docRecord } = docData;

        // Create main logistics document
        const logisticsDoc = await sequelize.models.LogisticsDocuments.create(
          docRecord,
          { transaction }
        );

        // Create line items
        for (const item of (docItems || [])) {
          await sequelize.models.LogisticsDocumentItems.create(
            {
              document_id: logisticsDoc.id,
              spare_part_id: item.spare_part_id,
              qty: item.supplied_qty || item.received_qty || 0,
              uom: item.uom || 'PCS',
              hsn: item.hsn || null
            },
            { transaction }
          );
        }

        // If this is a DN document, save it to create stock_movement later
        if (docRecord.document_type === 'DN') {
          dnDocument = logisticsDoc;
        }

        createdDocs.push(logisticsDoc.toJSON());
      }

      // 🎯 Auto-create stock_movement when DN is created in SAP
      if (dnDocument) {
        console.log(`📝 Creating stock_movement for DN: ${dnDocument.document_number}...`);
        
        // Calculate total quantity from approved items
        const totalQty = items.reduce((sum, item) => sum + (item.approved_qty || 0), 0);

        // Create stock_movement with the SAP-generated DN as reference_no
        const stockMovement = await sequelize.models.StockMovement.create(
          {
            stock_movement_type: 'FILLUP_DISPATCH',
            reference_type: 'spare_request',
            reference_no: dnDocument.document_number,  // ✅ Use actual SAP-generated DN
            source_location_type: 'plant',  // Plant warehouse location
            source_location_id: plantId,
            destination_location_type: 'service_center',
            destination_location_id: spareRequest.requested_source_id,
            total_qty: totalQty,
            movement_date: new Date(),
            status: 'pending',  // Pending until physically received
            bucket: 'GOOD',  // ✅ Added required field
            bucket_operation: 'DECREASE',  // ✅ Added required field
            created_by: req.user?.id || 1
          },
          { transaction }
        );

        console.log(`✅ Stock movement created: ID=${stockMovement.movement_id}, DN=${dnDocument.document_number}`);

        // 📦 Update Inventory for each spare item
        console.log(`📝 Updating inventory for source (plant) and destination (service_center)...`);
        for (const item of items) {
          const approvedQty = item.approved_qty || 0;
          
          if (approvedQty > 0) {
            // DECREASE at source (plant warehouse)
            const sourceInventory = await sequelize.models.SpareInventory.findOne({
              where: {
                spare_id: item.spare_id,
                location_type: 'plant',
                location_id: plantId
              },
              transaction
            });
            
            if (sourceInventory) {
              await sourceInventory.update({
                qty_good: (sourceInventory.qty_good || 0) - approvedQty
              }, { transaction });
              console.log(`✅ Decreased plant inventory: spare_id=${item.spare_id}, qty=${approvedQty}`);
            }
            
            // INCREASE at destination (service center)
            const destinationInventory = await sequelize.models.SpareInventory.findOne({
              where: {
                spare_id: item.spare_id,
                location_type: 'service_center',
                location_id: spareRequest.requested_source_id
              },
              transaction
            });
            
            if (destinationInventory) {
              await destinationInventory.update({
                qty_good: (destinationInventory.qty_good || 0) + approvedQty
              }, { transaction });
              console.log(`✅ Increased service_center inventory: spare_id=${item.spare_id}, qty=${approvedQty}`);
            } else {
              // Create new inventory record if it doesn't exist
              await sequelize.models.SpareInventory.create({
                spare_id: item.spare_id,
                location_type: 'service_center',
                location_id: spareRequest.requested_source_id,
                qty_good: approvedQty,
                qty_defective: 0
              }, { transaction });
              console.log(`✅ Created new service_center inventory: spare_id=${item.spare_id}, qty=${approvedQty}`);
            }
          }
        }

        // Create cartons for items
        for (const item of items) {
          const carton = await sequelize.models.Cartons.create(
            {
              movement_id: stockMovement.movement_id,
              carton_number: `CTN-${dnDocument.document_number}-${item.spare_id}`,
              status: 'pending'
            },
            { transaction }
          );

          // Create goods movement item for this spare
          await sequelize.models.GoodsMovementItems.create(
            {
              movement_id: stockMovement.movement_id,
              carton_id: carton.carton_id,
              spare_part_id: item.spare_id,
              qty: item.approved_qty || 0,
              condition: 'good'
            },
            { transaction }
          );
        }

        console.log(`✅ Cartons and goods items created for stock_movement`);
      }

      // Commit transaction
      await transaction.commit();

      res.status(201).json({
        ok: true,
        message: 'SAP documents created successfully',
        documents: createdDocs,
        transportDetails: formattedData.transportDetails,
        sapData: sapData
      });

    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (error) {
    console.error('❌ Error syncing with SAP:', error.message);
    if (error.sql) {
      console.error('SQL Query:', error.sql);
    }
    console.error('Full stack:', error.stack);
    res.status(500).json({ ok: false, error: error.message, details: error.sql || error.stack });
  }
});

/**
 * GET /api/logistics/track/:requestId
 * Get logistics documents and tracking information for a spare request
 */
router.get('/track/:requestId', authenticateToken, async (req, res) => {
  try {
    const { requestId } = req.params;

    // Fetch the spare request with items
    const spareRequest = await sequelize.models.SpareRequest.findByPk(requestId, {
      include: [
        {
          model: sequelize.models.SpareRequestItem,
          as: 'SpareRequestItems',
          include: [
            {
              model: sequelize.models.SparePart,
              as: 'SparePart',
              attributes: ['Id', 'PART', 'DESCRIPTION', 'BRAND', 'MODEL_DESCRIPTION']
            }
          ]
        }
      ]
    });

    if (!spareRequest) {
      return res.status(404).json({ ok: false, error: 'Spare request not found' });
    }

    // Fetch logistics documents related to this request
    const logisticsDocs = await sequelize.models.LogisticsDocuments.findAll({
      where: {
        reference_id: requestId,
        reference_type: 'SPARE_REQUEST'
      },
      include: [
        {
          model: sequelize.models.LogisticsDocumentItems,
          as: 'items',
          include: [
            {
              model: sequelize.models.SparePart,
              as: 'SparePart',
              attributes: ['Id', 'PART', 'DESCRIPTION']
            }
          ]
        }
      ],
      order: [['document_type', 'ASC']]
    });

    // Organize documents by type
    const documentsByType = {};
    logisticsDocs.forEach(doc => {
      documentsByType[doc.document_type] = doc.toJSON();
    });

    // Format response
    const trackingInfo = {
      ok: true,
      requestId: spareRequest.request_id,
      requestNumber: `REQ-${spareRequest.request_id}`,
      status: spareRequest.status || 'Processing',
      createdAt: spareRequest.created_at,
      updatedAt: spareRequest.updated_at,
      items: spareRequest.SpareRequestItems || [],
      logistics: {
        salesOrder: documentsByType['SO'] || null,
        deliveryNote: documentsByType['DN'] || null,
        challan: documentsByType['CHALLAN'] || null
      }
    };

    res.json(trackingInfo);

  } catch (error) {
    console.error('Error fetching tracking info:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * GET /api/logistics/documents/:spareRequestId
 * Get all logistics documents for a spare request with their items
 */
router.get('/documents/:spareRequestId', authenticateToken, async (req, res) => {
  try {
    const { spareRequestId } = req.params;

    const documents = await sequelize.models.LogisticsDocuments.findAll({
      where: {
        reference_id: spareRequestId,
        reference_type: 'SPARE_REQUEST'
      },
      include: [
        {
          model: sequelize.models.LogisticsDocumentItems,
          as: 'items',
          include: [
            {
              model: sequelize.models.SparePart,
              as: 'SparePart',
              attributes: ['Id', 'PART', 'DESCRIPTION']
            }
          ]
        }
      ]
    });

    if (documents.length === 0) {
      return res.json({
        ok: true,
        documents: [],
        message: 'No logistics documents found for this request'
      });
    }

    res.json({
      ok: true,
      documents: documents.map(doc => doc.toJSON())
    });

  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * GET /api/logistics/summary/:spareRequestId
 * Get a summary of logistics documents and key information
 */
router.get('/summary/:spareRequestId', authenticateToken, async (req, res) => {
  try {
    const { spareRequestId } = req.params;

    // Fetch spare request with approval info
    const spareRequest = await sequelize.models.SpareRequest.findByPk(spareRequestId, {
      include: [
        {
          model: sequelize.models.SpareRequestItem,
          as: 'SpareRequestItems'
        }
      ]
    });

    if (!spareRequest) {
      return res.status(404).json({ ok: false, error: 'Spare request not found' });
    }

    // Fetch documents
    const documents = await sequelize.models.LogisticsDocuments.findAll({
      where: {
        reference_id: spareRequestId,
        reference_type: 'SPARE_REQUEST'
      },
      include: [
        {
          model: sequelize.models.LogisticsDocumentItems,
          as: 'items',
          include: [
            {
              model: sequelize.models.SparePart,
              as: 'SparePart',
              attributes: ['Id', 'PART', 'DESCRIPTION']
            }
          ]
        }
      ],
      raw: false
    });

    // Extract key information
    const salesOrder = documents.find(d => d.document_type === 'SO');
    const deliveryNote = documents.find(d => d.document_type === 'DN');
    const challan = documents.find(d => d.document_type === 'CHALLAN');

    const summary = {
      ok: true,
      request: {
        id: spareRequest.request_id,
        number: `REQ-${spareRequest.request_id}`,
        createdAt: spareRequest.created_at,
        status: spareRequest.status || 'Pending'
      },
      salesOrder: salesOrder ? {
        number: salesOrder.document_number,
        date: salesOrder.document_date,
        status: salesOrder.status,
        totalAmount: salesOrder.amount || 0,
        itemCount: (salesOrder.LogisticsDocumentItems || []).length
      } : null,
      deliveryNote: deliveryNote ? {
        number: deliveryNote.document_number,
        date: deliveryNote.document_date,
        dispatchDate: deliveryNote.document_date,
        status: deliveryNote.status,
        branch: 'Pimpri ASC' // This should be fetched from actual data
      } : null,
      challan: challan ? {
        number: challan.document_number,
        date: challan.document_date,
        status: challan.status,
        transportDetails: challan.transportDetails || {}
      } : null,
      items: (spareRequest.SpareRequestItems || []).map((item, idx) => ({
        lineNo: idx + 1,
        partCode: item.sku || `PART-${item.spare_id}`,
        partDescription: item.spareName || 'Part Description',
        requestedQty: item.requested_qty || item.requestedQty || 0,
        approvedQty: item.approved_qty || item.approvedQty || 0,
        dispatchedQty: item.approved_qty || item.approvedQty || 0,
        cost: 0 // This should be fetched from actual pricing
      }))
    };

    res.json(summary);

  } catch (error) {
    console.error('Error fetching summary:', error);
    res.status(500).json({ ok: false, error: error.message });
  }
});

/**
 * POST /api/logistics/receive-delivery
 * Receive DN or Challan at ASC and trigger stock movement
 * Updates inventory at both plant (source) and ASC (destination)
 * Creates stock movement records, goods movement items, and carton tracking
 */
router.post('/receive-delivery', authenticateToken, requireRole(['service_center', 'admin', 'rsm']), async (req, res) => {
  try {
    const {
      requestId,
      documentType, // 'DN' or 'CHALLAN'
      documentNumber,
      plants, // Plant ID or array of plant IDs
      items = [] // Array of items: {spare_id, qty, carton_number, condition}
    } = req.body;

    console.log('\n📦 === RECEIVE DELIVERY REQUEST ===');
    console.log('Request body:', { requestId, documentType, documentNumber, plants, itemCount: items.length });

    // Validation
    if (!requestId || !documentType || !documentNumber) {
      return res.status(400).json({
        ok: false,
        error: 'requestId, documentType, and documentNumber are required'
      });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({
        ok: false,
        error: 'At least one item must be provided'
      });
    }

    const userId = req.user?.id || req.user?.user_id;
    const ascId = req.user?.centerId || req.user?.service_center_id; // ASC receiving the delivery

    console.log('User info:', { userId, ascId, userRole: req.user?.role });

    if (!ascId) {
      return res.status(403).json({
        ok: false,
        error: 'Service center ID is required'
      });
    }

    // Step 0: Get the plant assigned to this ASC
    console.log(`📝 Fetching plant assignment for ASC ${ascId}...`);
    const serviceCenter = await sequelize.models.ServiceCenter.findByPk(ascId);
    
    if (!serviceCenter) {
      console.log(`❌ Service Center ${ascId} not found`);
      return res.status(404).json({
        ok: false,
        error: 'Service center not found'
      });
    }

    const plantId = serviceCenter.plant_id;
    
    if (!plantId) {
      console.log(`❌ No plant assigned to ASC ${ascId}`);
      return res.status(400).json({
        ok: false,
        error: 'No plant assigned to this service center'
      });
    }

    console.log(`✅ ASC ${ascId} is assigned to Plant ${plantId}`);
    console.log(`📝 Using Plant ${plantId} as source (ignoring any plant ID in request)`);

    // Fetch spare request to verify it exists and get plant details
    console.log(`📝 Fetching spare request ${requestId}...`);
    const spareRequest = await sequelize.models.SpareRequest.findByPk(requestId, {
      include: [
        {
          model: sequelize.models.SpareRequestItem,
          as: 'SpareRequestItems'
        }
      ]
    });

    if (!spareRequest) {
      console.log(`❌ Spare request ${requestId} not found`);
      return res.status(404).json({
        ok: false,
        error: 'Spare request not found'
      });
    }

    console.log('✅ Spare request found:', { requested_source_id: spareRequest.requested_source_id });

    // Plant ID is already determined from ASC assignment (done above)
    console.log(`✅ Using Plant ${plantId} for source (from ASC assignment)`);

    // Fetch logistics document by requestId only - DO NOT TRUST frontend documentNumber
    // Get the one with status='Posted' (not yet received) as that's the one being received now
    console.log(`📝 Fetching logistics document for request ${requestId}...`);
    const logisticsDoc = await sequelize.models.LogisticsDocuments.findOne({
      where: {
        reference_id: requestId,
        document_type: documentType,
        reference_type: 'SPARE_REQUEST',
        status: 'Posted'  // Only get documents that haven't been received yet
      },
      order: [['created_at', 'ASC']], // Get the oldest 'Posted' one (first in sequence)
      limit: 1
    });

    if (!logisticsDoc) {
      console.log(`❌ Logistics document not found for request ${requestId}`);
      return res.status(404).json({
        ok: false,
        error: `${documentType} document not found for this request`
      });
    }

    console.log('✅ Logistics document found');

    // Get the ACTUAL SAP-generated DN from the database (not from frontend)
    const sapGeneratedDN = logisticsDoc.document_number;
    console.log(`📝 Database DN for Request ${requestId}: ${sapGeneratedDN}`);
    
    // Log if frontend sent a different DN (for debugging)
    if (documentNumber !== sapGeneratedDN) {
      console.warn(`⚠️ Frontend DN (${documentNumber}) differs from Database DN (${sapGeneratedDN})`);
      console.warn(`📌 Using Database DN as source of truth`);
    }

    // Validate items qty against SpareRequestItem approved quantities
    console.log(`📝 Validating items against SpareRequestItem approvals...`);
    const validatedItems = [];
    
    for (const item of items) {
      const { spare_id, qty } = item;
      
      // Find the approved item in SpareRequestItem
      const approvedItem = spareRequest.SpareRequestItems?.find(sri => sri.spare_id === spare_id);
      
      if (!approvedItem) {
        console.warn(`⚠️ Spare ${spare_id} not found in request ${requestId}`);
        return res.status(400).json({
          ok: false,
          error: `Spare ${spare_id} not found in request items`
        });
      }
      
      // Validate qty doesn't exceed approved qty
      const approvedQty = approvedItem.approved_qty || approvedItem.qty || 0;
      if (qty > approvedQty) {
        console.warn(`⚠️ Received qty ${qty} exceeds approved qty ${approvedQty} for Spare ${spare_id}`);
        return res.status(400).json({
          ok: false,
          error: `Received qty ${qty} exceeds approved qty ${approvedQty} for Spare ${spare_id}`
        });
      }
      
      validatedItems.push({
        ...item,
        qty: qty, // Use the received qty (which should match approved)
        sparePartId: spare_id
      });
      
      console.log(`✅ Validated Spare ${spare_id}: qty=${qty}, approved_qty=${approvedQty}`);
    }

    // Process delivery reception
    // Use the SAP-generated DN from database, not from frontend request
    console.log(`📝 Processing delivery reception with SAP DN: ${sapGeneratedDN}...`);
    
    let result;
    
    // Check if stock_movement was auto-created by sync-sap
    const existingMovement = await sequelize.models.StockMovement.findOne({
      where: {
        reference_no: sapGeneratedDN,
        reference_type: 'spare_request'
      }
    });

    if (existingMovement) {
      console.log(`✅ Stock movement already exists (auto-created by sync-sap): ID=${existingMovement.movement_id}`);
      console.log(`📝 Computing inventory updates...`);
      
      // Compute inventory updates first
      const inventoryResult = await StockMovementService.updateInventory(
        {
          movement_id: existingMovement.movement_id,
          source_type: existingMovement.source_location_type,
          source_id: existingMovement.source_location_id,
          dest_type: existingMovement.destination_location_type,
          dest_id: existingMovement.destination_location_id,
          items: validatedItems
        },
        null
      );

      console.log(`✅ Inventory computed`);
      
      // Update movement status to completed using Model.update()
      console.log(`📝 Updating movement status...`);
      const updateResult = await sequelize.models.StockMovement.update(
        {
          status: 'completed',
          verified_by: userId,
          verified_at: new Date(),
          received_date: new Date()
        },
        {
          where: { movement_id: existingMovement.movement_id }
        }
      );

      console.log(`✅ Movement updated (${updateResult[0]} rows affected)`);

      // Fetch fresh copy from database to get updated timestamp
      const updatedMovement = await sequelize.models.StockMovement.findByPk(existingMovement.movement_id);

      result = {
        movement: updatedMovement.toJSON(),
        inventory: inventoryResult
      };
    } else {
      console.log(`📝 Stock movement not found - creating new one (backward compatibility)`);
      
      // Fallback: create stock movement (for backward compatibility if sync-sap wasn't called)
      result = await StockMovementService.processDeliveryReception({
        requestId,
        documentType,
        documentNumber: sapGeneratedDN,
        plantId,
        ascId,
        items: validatedItems,
        userId
      });
    }

    console.log('✅ Delivery reception processed successfully');

    // Update logistics document status to 'Completed'
    console.log('📝 Updating logistics document status...');
    await logisticsDoc.update(
      { status: 'Completed', received_date: new Date() },
      { returning: true }
    );

    console.log('✅ Logistics document status updated');

    res.status(201).json({
      ok: true,
      message: `${documentType} received successfully at ASC`,
      data: {
        requestId,
        documentType,
        documentNumber: sapGeneratedDN, // Return the actual SAP-generated DN from database
        plantId,
        ascId,
        movement: result.movement,
        inventory: result.inventory,
        itemsReceived: items.length,
        totalQtyReceived: items.reduce((sum, item) => sum + (item.qty || 0), 0)
      }
    });

  } catch (error) {
    console.error('❌ Error receiving delivery:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({
      ok: false,
      error: error.message,
      details: error.stack
    });
  }
});
/**
 * GET /api/logistics/in-transit/:ascId
 * Get all in-transit materials coming to the specified ASC
 * Shows materials that have been shipped but not yet received
 */
router.get('/in-transit/:ascId', authenticateToken, requireRole(['service_center', 'rsm', 'admin']), async (req, res) => {
  try {
    const { ascId } = req.params;

    const inTransitMaterials = await StockMovementService.getInTransitMaterials(ascId);

    res.json({
      ok: true,
      ascId,
      inTransitCount: inTransitMaterials.length,
      materials: inTransitMaterials
    });

  } catch (error) {
    console.error('Error fetching in-transit materials:', error);
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

/**
 * GET /api/logistics/movement-history/:requestId
 * Get stock movement history for a spare request
 * Shows all movement records including cartons and items
 */
router.get('/movement-history/:requestId', authenticateToken, async (req, res) => {
  try {
    const { requestId } = req.params;

    const movements = await StockMovementService.getMovementHistory(requestId);

    res.json({
      ok: true,
      requestId,
      movementCount: movements.length,
      movements: movements.map(m => m.toJSON ? m.toJSON() : m)
    });

  } catch (error) {
    console.error('Error fetching movement history:', error);
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

/**
 * GET /api/logistics/cartons/:movementId
 * Get all cartons for a specific stock movement
 * Shows physical cartons and their contents
 */
router.get('/cartons/:movementId', authenticateToken, async (req, res) => {
  try {
    const { movementId } = req.params;

    const cartons = await sequelize.models.Cartons.findAll({
      where: { movement_id: movementId },
      include: [
        {
          model: sequelize.models.GoodsMovementItems,
          as: 'goods_items',
          include: [
            {
              model: sequelize.models.SparePart,
              as: 'SparePart',
              attributes: ['Id', 'PART', 'DESCRIPTION']
            }
          ]
        }
      ]
    });

    res.json({
      ok: true,
      movementId,
      cartonCount: cartons.length,
      cartons: cartons.map(c => c.toJSON ? c.toJSON() : c)
    });

  } catch (error) {
    console.error('Error fetching cartons:', error);
    res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

export default router;
