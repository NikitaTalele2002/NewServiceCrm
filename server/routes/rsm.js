import { Plant, RSMStateMapping, SpareRequest, SpareRequestItem, Status, Approvals, SpareInventory, StockMovement, LogisticsDocuments, LogisticsDocumentItems, Cartons, GoodsMovementItems, SparePart, ServiceCenter } from '../models/index.js';
import express from 'express';
import rsmController from '../controllers/rsmController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { sequelize } from '../db.js';
import { generateMockSAPData, formatSAPDataForDB } from '../services/sapIntegration.js';

const router = express.Router();
// GET /api/rsm/plants - Get plant IDs assigned to the logged-in RSM
router.get('/plants', authenticateToken, requireRole('rsm'), async (req, res) => {
  try {
    // Get rsm_id from token or lookup from user_id
    let rsmId = req.user.rsmId;
    if (!rsmId) {
      const rsmRecord = await sequelize.query(
        'SELECT TOP 1 rsm_id FROM rsms WHERE user_id = ?',
        { replacements: [req.user.id], type: sequelize.QueryTypes.SELECT }
      );
      if (rsmRecord && rsmRecord[0]) {
        rsmId = rsmRecord[0].rsm_id;
      }
    }
    
    if (!rsmId) {
      return res.status(403).json({ error: 'RSM record not found' });
    }
    
    const mappings = await RSMStateMapping.findAll({ where: { rsm_user_id: rsmId, is_active: true } });
    const stateIds = mappings.map(m => m.state_id);
    if (!stateIds.length) return res.json({ plantIds: [] });
    const plants = await Plant.findAll({ where: { state_id: stateIds } });
    const plantIds = plants.map(p => p.plant_id);
    res.json({ plantIds });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// GET /api/rsm/:rsmUserId/spare-requests
// If no :rsmUserId provided, the authenticated user will be used (for logged-in RSMs)
// Support both `/spare-requests` (uses logged-in RSM) and `/:rsmUserId/spare-requests`
async function spareRequestsHandler(req, res) {
  // prefer explicit param, otherwise use logged-in RSM ID
  if (!req.params.rsmUserId && req.user) {
    // Use rsmId from token if available, otherwise lookup from database
    if (req.user.rsmId) {
      req.params.rsmUserId = req.user.rsmId;
    } else {
      // Fallback: lookup rsm_id from user_id
      try {
        const rsmRecord = await sequelize.query(
          'SELECT TOP 1 rsm_id FROM rsms WHERE user_id = ?',
          { replacements: [req.user.id], type: sequelize.QueryTypes.SELECT }
        );
        if (rsmRecord && rsmRecord[0]) {
          req.params.rsmUserId = rsmRecord[0].rsm_id;
        } else {
          return res.status(403).json({ ok: false, error: 'RSM record not found' });
        }
      } catch (err) {
        console.error('Error looking up RSM ID:', err.message);
        return res.status(500).json({ ok: false, error: 'Failed to lookup RSM ID' });
      }
    }
  }
  return rsmController.getRsmSpareRequests(req, res);
}

router.get('/spare-requests', authenticateToken, requireRole('rsm'), spareRequestsHandler);
router.get('/:rsmUserId/spare-requests', authenticateToken, requireRole('rsm'), spareRequestsHandler);

// POST /api/rsm/spare-requests/:requestId/approve - RSM approves a spare request with quantity
router.post('/spare-requests/:requestId/approve', authenticateToken, requireRole('rsm'), async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { requestId } = req.params;
    const { approvals } = req.body; // { [itemId]: { approvedQty } }
    
    // Fetch the request with all required fields
    const request = await SpareRequest.findByPk(requestId, { 
      include: [{ model: SpareRequestItem, as: 'SpareRequestItems' }],
      transaction 
    });
    
    if (!request) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Request not found' });
    }

    // Verify request has required fields for inventory check
    if (!request.requested_source_id || !request.requested_source_type) {
      await transaction.rollback();
      console.error(`SpareRequest ${requestId} missing source info:`, {
        requested_source_id: request.requested_source_id,
        requested_source_type: request.requested_source_type
      });
      return res.status(400).json({ 
        error: 'Spare request missing source information (service_center/branch not specified)' 
      });
    }

    // Verify RSM has access to this plant
    let rsmId = req.user.rsmId;
    if (!rsmId) {
      const rsmRecord = await sequelize.query(
        'SELECT TOP 1 rsm_id FROM rsms WHERE user_id = ?',
        { replacements: [req.user.id], type: sequelize.QueryTypes.SELECT }
      );
      if (rsmRecord && rsmRecord[0]) {
        rsmId = rsmRecord[0].rsm_id;
      } else {
        await transaction.rollback();
        return res.status(403).json({ error: 'RSM record not found' });
      }
    }
    const plantId = request.requested_to_id;
    
    const mappings = await RSMStateMapping.findAll({ 
      where: { rsm_user_id: rsmId, is_active: true },
      transaction 
    });
    const stateIds = mappings.map(m => m.state_id);
    
    const plant = await Plant.findOne({ 
      where: { plant_id: plantId, state_id: stateIds },
      transaction 
    });
    
    if (!plant) {
      await transaction.rollback();
      return res.status(403).json({ error: 'Not authorized to approve requests for this plant' });
    }

    // Get the service center/branch ID from the request
    const requestSourceId = request.requested_source_id;
    const requestSourceType = request.requested_source_type; // 'service_center' or 'branch'
    
    console.log(`[APPROVAL STARTED] Request ${requestId}: 
      source_type=${requestSourceType}, 
      source_id=${requestSourceId}`);

    // Update each item with approved quantity
    const itemInventoryInfo = {}; // Track inventory info for response
    
    console.log(`[APPROVAL] Processing ${Object.keys(approvals).length} items for request ${requestId}`);
    
    for (const itemId in approvals) {
      console.log(`\n[APPROVAL ITEM] Processing itemId=${itemId}`);
      
      const item = await SpareRequestItem.findByPk(itemId, { transaction });
      console.log(`[ITEM LOOKUP] itemId=${itemId}, found=${!!item}, spare_id=${item?.spare_id}, requested_qty=${item?.requested_qty}`);
      
      if (item && approvals[itemId].approvedQty !== undefined) {
        const requestedQtyFromFrontend = parseInt(approvals[itemId].approvedQty);
        const requestedQtyFromItem = item.requested_qty;

        console.log(`[QUANTITIES] frontend=${requestedQtyFromFrontend}, item=${requestedQtyFromItem}`);

        // Check inventory at the PLANT/BRANCH (where RSM approves from), not the requesting location
        const inventory = await SpareInventory.findOne({
          where: {
            spare_id: item.spare_id,
            location_type: request.requested_to_type, // Check at PLANT/BRANCH where inventory is stored
            location_id: request.requested_to_id      // Check at PLANT/BRANCH ID
          },
          transaction
        });

        const availableQty = inventory ? (inventory.qty_good || 0) : 0;
        
        console.log(`[INVENTORY CHECK] Item ${itemId}:
          spare_id=${item.spare_id}, 
          location_type=${request.requested_source_type}, 
          location_id=${request.requested_source_id},
          inventory_found=${!!inventory},
          available=${availableQty},
          frontend_approval=${requestedQtyFromFrontend},
          requested=${requestedQtyFromItem}`);
        
        // CRITICAL: Validate RSM cannot approve more than available quantity
        console.log(`[VALIDATION CHECK] availableQty=${availableQty}, requestedQtyFromFrontend=${requestedQtyFromFrontend}`);
        if (requestedQtyFromFrontend > availableQty) {
          console.error(`[REJECTION TRIGGERED] Cannot approve ${requestedQtyFromFrontend} units when only ${availableQty} available`);
          await transaction.rollback();
          const spareInfo = item.spare_id ? ` (Spare ID: ${item.spare_id})` : '';
          console.error(`[REJECTING] Spare${spareInfo} - INSUFFICIENT INVENTORY`);
          return res.status(400).json({ 
            ok: false,
            error: `Cannot approve ${requestedQtyFromFrontend} units. Insufficient inventory${spareInfo}. Requested: ${requestedQtyFromFrontend}, Available: ${availableQty}`,
            inventoryInfo: { availableQty, requestedQty: requestedQtyFromItem, approvedQty: 0 }
          });
        }

        // Determine final approved quantity (minimum of constraints)
        const finalApprovedQty = Math.min(
          requestedQtyFromFrontend,
          requestedQtyFromItem,
          availableQty
        );

        console.log(`[APPROVAL DECISION] Item ${itemId}: finalApprovedQty=${finalApprovedQty} (min of: frontend=${requestedQtyFromFrontend}, item=${requestedQtyFromItem}, available=${availableQty})`);

        // Validate final quantity is valid
        if (finalApprovedQty < 0) {
          await transaction.rollback();
          return res.status(400).json({ 
            error: `Invalid approval quantity for spare part (ID: ${item.spare_id})`
          });
        }

        // Store inventory info for response
        itemInventoryInfo[itemId] = {
          availableQty,
          requestedQty: requestedQtyFromItem,
          approvedQty: finalApprovedQty,
          partiallyApproved: finalApprovedQty < requestedQtyFromItem
        };

        console.log(`[UPDATING ITEM] itemId=${itemId}, approved_qty=${finalApprovedQty}`);

        await item.update({
          approved_qty: finalApprovedQty,
          rejection_reason: null,
          updated_at: new Date()
        }, { transaction });
      }
    }

    // Update request status to approved_by_rsm
    // Find or create the 'approved_by_rsm' status
    let approvedStatus = await Status.findOne({ where: { status_name: 'approved_by_rsm' }, transaction });
    if (!approvedStatus) {
      approvedStatus = await Status.create({ status_name: 'approved_by_rsm' }, { transaction });
    }
    
    await request.update({
      status_id: approvedStatus.status_id,
      updated_at: new Date()
    }, { transaction });

    // Create an approval record in the Approvals table (Level 1 = RSM)
    await Approvals.create({
      entity_type: 'spare_request',
      entity_id: requestId,
      approval_level: 1,
      approver_user_id: rsmId,
      approval_status: 'approved',
      approval_remarks: 'Approved by RSM',
      approved_at: new Date()
    }, { transaction });

    // 🚀 STEP 1: AUTO-TRIGGER SAP SYNC - Create logistics documents first
    console.log(`[SAP SYNC] Step 1: Creating SAP logistics documents for request ${requestId}...`);
    
    let dnDocument = null;
    try {
      // Get the spare request with items for SAP data generation
      const requestWithItems = await SpareRequest.findByPk(requestId, {
        include: [
          {
            model: SpareRequestItem,
            as: 'SpareRequestItems',
            include: [
              {
                model: SparePart,
                as: 'SparePart'
              }
            ]
          }
        ],
        transaction
      });

      // Get the plant assigned to the requesting ASC
      const serviceCenter = await ServiceCenter.findByPk(request.requested_source_id, { transaction });
      if (!serviceCenter || !serviceCenter.plant_id) {
        console.warn(`⚠️  Service center not found or no plant assigned, skipping SAP sync`);
      } else {
        const plantId = serviceCenter.plant_id;

        // Format items for SAP
        const items = (requestWithItems.SpareRequestItems || []).map(item => {
          const sparePart = item.SparePart || {};
          return {
            spare_id: item.spare_id,
            part_id: item.spare_id,
            sku: sparePart.PART || `PART-${item.spare_id}`,
            spareName: sparePart.BRAND || sparePart.PART || 'Unknown Part',
            spare_description: sparePart.DESCRIPTION || sparePart.MODEL_DESCRIPTION || 'Part Description',
            requested_qty: item.requested_qty || 0,
            approved_qty: item.approved_qty || 0,
            uom: 'PCS'
          };
        });

        // Generate mock SAP data
        const sapData = generateMockSAPData(requestWithItems, items);

        // Format data for database storage
        const formattedData = formatSAPDataForDB(sapData, 
          { type: 'warehouse', id: plantId }, 
          { type: 'service_center', id: request.requested_source_id }
        );

        // Create logistics documents
        for (const docData of formattedData.documents) {
          const { items: docItems, ...docRecord } = docData;

          // Create main logistics document
          const logisticsDoc = await LogisticsDocuments.create(
            docRecord,
            { transaction }
          );

          // Create line items
          for (const item of (docItems || [])) {
            await LogisticsDocumentItems.create(
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

          // If this is a DN document, save it for creating stock_movement later
          if (docRecord.document_type === 'DN') {
            dnDocument = logisticsDoc;
          }

          console.log(`✅ Created ${docRecord.document_type}: ${docRecord.document_number}`);
        }
      }
      console.log(`✅ SAP documents created for request ${requestId}`);
    } catch (sapError) {
      console.error(`⚠️  Error creating SAP documents (non-blocking):`, sapError.message);
      // Don't fail the approval if SAP sync fails - the approval already succeeded
    }

    // 🎯 STEP 2: Create stock movements after logistics documents created
    console.log(`[CREATING STOCK MOVEMENTS] Step 2: Creating stock movements for request ${requestId}`);
    
    try {
      // If DN document was created, create stock movement linked to it
      if (dnDocument) {
        // Get items with approved quantities for stock movement
        const itemsForMovement = await SpareRequestItem.findAll({
          where: { request_id: requestId },
          transaction
        });

        const totalQty = itemsForMovement.reduce((sum, item) => sum + (item.approved_qty || 0), 0);

        // Determine the stock movement type based on request type
        const spareRequestType = request.spare_request_type;
        let stockMovementType = 'FILLUP_DISPATCH'; // Default
        
        // Map spare_request_type -> stock_movement_type
        if (spareRequestType === 'CFU') {
          stockMovementType = 'FILLUP_DISPATCH';
        } else if (spareRequestType === 'TECH_ISSUE' || spareRequestType === 'TECH_RETURN_DEFECTIVE') {
          stockMovementType = 'TECH_ISSUE_OUT';
        } else if (spareRequestType === 'ASC_RETURN_DEFECTIVE') {
          stockMovementType = 'ASC_RETURN_DEFECTIVE_OUT';
        }

        // Create stock movement linked to the DN document
        const stockMovement = await StockMovement.create(
          {
            stock_movement_type: stockMovementType,
            reference_type: 'spare_request',
            reference_no: dnDocument.document_number,  // ✅ Reference the DN, not the request ID
            source_location_type: 'warehouse',
            source_location_id: request.requested_to_id,
            destination_location_type: request.requested_source_type,
            destination_location_id: request.requested_source_id,
            total_qty: totalQty,
            movement_date: new Date(),
            status: 'pending',
            bucket: 'GOOD',
            bucket_operation: 'DECREASE',
            created_by: req.user?.id || 1,
            assigned_to: req.user?.id || 1
          },
          { transaction }
        );

        console.log(`✅ Created stock movement linked to DN: ${dnDocument.document_number}`);

        // 📦 Update Inventory for each spare item
        console.log(`📝 Updating inventory for source and destination locations...`);
        for (const item of itemsForMovement) {
          const approvedQty = item.approved_qty || 0;
          
          if (approvedQty > 0) {
            // DECREASE at source location
            const sourceInventory = await SpareInventory.findOne({
              where: {
                spare_id: item.spare_id,
                location_type: 'warehouse',
                location_id: request.requested_to_id
              },
              transaction
            });
            
            if (sourceInventory) {
              await sourceInventory.update({
                qty_good: (sourceInventory.qty_good || 0) - approvedQty
              }, { transaction });
              console.log(`✅ Decreased source inventory: spare_id=${item.spare_id}, qty=${approvedQty}`);
            }
            
            // INCREASE at destination location
            const destinationInventory = await SpareInventory.findOne({
              where: {
                spare_id: item.spare_id,
                location_type: request.requested_source_type,
                location_id: request.requested_source_id
              },
              transaction
            });
            
            if (destinationInventory) {
              await destinationInventory.update({
                qty_good: (destinationInventory.qty_good || 0) + approvedQty
              }, { transaction });
              console.log(`✅ Increased destination inventory: spare_id=${item.spare_id}, qty=${approvedQty}`);
            } else {
              // Create new inventory record if it doesn't exist
              await SpareInventory.create({
                spare_id: item.spare_id,
                location_type: request.requested_source_type,
                location_id: request.requested_source_id,
                qty_good: approvedQty,
                qty_defective: 0
              }, { transaction });
              console.log(`✅ Created destination inventory: spare_id=${item.spare_id}, qty=${approvedQty}`);
            }
          }
        }

        // Create cartons for items
        for (const item of itemsForMovement) {
          if (item.approved_qty && item.approved_qty > 0) {
            const carton = await Cartons.create(
              {
                movement_id: stockMovement.movement_id,
                carton_number: `CTN-${dnDocument.document_number}-${item.spare_id}`,
                status: 'pending'
              },
              { transaction }
            );

            await GoodsMovementItems.create(
              {
                movement_id: stockMovement.movement_id,
                carton_id: carton.carton_id,
                spare_part_id: item.spare_id,
                qty: item.approved_qty,
                condition: 'good'
              },
              { transaction }
            );
          }
        }
        console.log(`✅ Cartons and goods items created for stock movement`);
      } else {
        console.warn(`⚠️  No DN document created, skipping stock movement creation`);
      }
    } catch (movementError) {
      console.error(`⚠️  Error creating stock movements (non-blocking):`, movementError.message);
      // Don't fail the approval
    }

    await transaction.commit();
    
    console.log(`[APPROVAL SUCCESS] Request ${requestId} approved successfully with stock movements`);
    console.log(`[APPROVAL DETAILS] inventoryInfo:`, JSON.stringify(itemInventoryInfo, null, 2));
    
    res.json({ 
      ok: true, 
      message: 'Request approved successfully',
      requestId: request.request_id,
      inventoryInfo: itemInventoryInfo
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error approving request:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/rsm/spare-requests/:requestId/reject - RSM rejects a spare request
router.post('/spare-requests/:requestId/reject', authenticateToken, requireRole('rsm'), async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { requestId } = req.params;
    const { reason } = req.body;
    
    // Fetch the request
    const request = await SpareRequest.findByPk(requestId, { 
      include: [{ model: SpareRequestItem, as: 'SpareRequestItems' }],
      transaction 
    });
    
    if (!request) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Request not found' });
    }

    // Verify RSM has access to this plant
    let rsmId = req.user.rsmId;
    if (!rsmId) {
      const rsmRecord = await sequelize.query(
        'SELECT TOP 1 rsm_id FROM rsms WHERE user_id = ?',
        { replacements: [req.user.id], type: sequelize.QueryTypes.SELECT }
      );
      if (rsmRecord && rsmRecord[0]) {
        rsmId = rsmRecord[0].rsm_id;
      } else {
        await transaction.rollback();
        return res.status(403).json({ error: 'RSM record not found' });
      }
    }
    const plantId = request.requested_to_id;
    
    const mappings = await RSMStateMapping.findAll({ 
      where: { rsm_user_id: rsmId, is_active: true },
      transaction 
    });
    const stateIds = mappings.map(m => m.state_id);
    
    const plant = await Plant.findOne({ 
      where: { plant_id: plantId, state_id: stateIds },
      transaction 
    });
    
    if (!plant) {
      await transaction.rollback();
      return res.status(403).json({ error: 'Not authorized to reject requests for this plant' });
    }

    // Reject all items - set approved_qty to 0
    await SpareRequestItem.update({
      approved_qty: 0,
      rejection_reason: reason || 'Rejected by RSM',
      updated_at: new Date()
    }, {
      where: { request_id: requestId },
      transaction
    });

    // Update request status to rejected_by_rsm
    // Find or create the 'rejected_by_rsm' status
    let rejectedStatus = await Status.findOne({ where: { status_name: 'rejected_by_rsm' }, transaction });
    if (!rejectedStatus) {
      rejectedStatus = await Status.create({ status_name: 'rejected_by_rsm' }, { transaction });
    }
    
    await request.update({
      status_id: rejectedStatus.status_id,
      updated_at: new Date()
    }, { transaction });

    // Create an approval record in the Approvals table
    await Approvals.create({
      entity_type: 'spare_request',
      entity_id: requestId,
      approval_level: 1, // RSM approval is level 1
      approver_user_id: rsmId,
      approval_status: 'rejected',
      approval_remarks: reason || 'Rejected by RSM',
      approved_at: new Date()
    }, { transaction });

    await transaction.commit();
    
    res.json({ 
      ok: true, 
      message: 'Request rejected successfully',
      requestId: request.request_id
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Error rejecting request:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
