import { Plant, RSMStateMapping, SpareRequest, SpareRequestItem, Status, Approvals, SpareInventory, StockMovement, LogisticsDocuments, LogisticsDocumentItems, Cartons, GoodsMovementItems, SparePart, ServiceCenter, SAPDocuments, SAPDocumentItems } from '../models/index.js';
import express from 'express';
import rsmController from '../controllers/rsmController.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { sequelize } from '../db.js';
import { generateMockSAPData, formatSAPDataForDB } from '../services/sapIntegration.js';
import { safeRollback, safeCommit, isTransactionActive } from '../utils/transactionHelper.js';

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
  let transaction = null;
  
  try {
    const { requestId } = req.params;
    const { approvals } = req.body; // { [itemId]: { approvedQty } }
    
    // ===== STEP 0: ALL VALIDATIONS BEFORE TRANSACTION =====
    // Fetch the request with all required fields
    const request = await SpareRequest.findByPk(requestId, { 
      include: [{ model: SpareRequestItem, as: 'SpareRequestItems' }]
    });
    
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    // Verify request has required fields for inventory check
    if (!request.requested_source_id || !request.requested_source_type) {
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
        return res.status(403).json({ error: 'RSM record not found' });
      }
    }
    
    const plantId = request.requested_to_id;
    const mappings = await RSMStateMapping.findAll({ 
      where: { rsm_user_id: rsmId, is_active: true }
    });
    const stateIds = mappings.map(m => m.state_id);
    
    const plant = await Plant.findOne({ 
      where: { plant_id: plantId, state_id: stateIds }
    });
    
    if (!plant) {
      return res.status(403).json({ error: 'Not authorized to approve requests for this plant' });
    }

    // ===== STEP 1: START TRANSACTION (after all validations pass) =====
    transaction = await sequelize.transaction();
    console.log('✅ Transaction created for request ' + requestId);
    
    try {
      // Get the service center/branch ID from the request
      const requestSourceId = request.requested_source_id;
      const requestSourceType = request.requested_source_type;
      
      console.log(`[APPROVAL STARTED] Request ${requestId}: source_type=${requestSourceType}, source_id=${requestSourceId}`);

      // Update each item with approved quantity
      const itemInventoryInfo = {};
      
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
              location_type: request.requested_to_type,
              location_id: request.requested_to_id
            },
            transaction
          });

          const availableQty = inventory ? (inventory.qty_good || 0) : 0;
          
          console.log(`[INVENTORY CHECK] Item ${itemId}: available=${availableQty}, frontend_request=${requestedQtyFromFrontend}`);
          
          // CRITICAL: Validate RSM cannot approve more than available quantity
          if (requestedQtyFromFrontend > availableQty) {
            const spareInfo = item.spare_id ? ` (Spare ID: ${item.spare_id})` : '';
            console.error(`[REJECTION TRIGGERED] Cannot approve ${requestedQtyFromFrontend} units when only ${availableQty} available`);
            throw new Error(`Cannot approve ${requestedQtyFromFrontend} units. Insufficient inventory${spareInfo}. Available: ${availableQty}`);
          }

          // Determine final approved quantity (minimum of constraints)
          const finalApprovedQty = Math.min(
            requestedQtyFromFrontend,
            requestedQtyFromItem,
            availableQty
          );

          console.log(`[APPROVAL DECISION] Item ${itemId}: finalApprovedQty=${finalApprovedQty}`);

          // Validate final quantity is valid
          if (finalApprovedQty < 0) {
            throw new Error(`Invalid approval quantity for spare part (ID: ${item.spare_id})`);
          }

          // Store inventory info for response (including spare_id for stock movement)
          itemInventoryInfo[itemId] = {
            spare_id: item.spare_id,
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

      // ===== CREATE DELIVERY NOTE AND STOCK MOVEMENT =====
      console.log(`[STOCK MOVEMENT] Creating delivery note and stock movement...`);
      
      try {
        // Calculate total approved quantity
        const totalApprovedQty = Object.values(itemInventoryInfo).reduce((sum, info) => sum + (info.approvedQty || 0), 0);
        
        if (totalApprovedQty > 0) {
          // Step 1: Generate DN (Delivery Note) number
          const dnDate = new Date();
          const dnDateStr = `${dnDate.getFullYear()}${String(dnDate.getMonth() + 1).padStart(2, '0')}${String(dnDate.getDate()).padStart(2, '0')}`;
          const dnRandom = Math.random().toString(36).substring(2, 8).toUpperCase();
          const dnNumber = `DN-${dnDateStr}-${dnRandom}`;
          
          console.log(`[DN] Generated Delivery Note: ${dnNumber}`);
          
          // Step 2: Create Logistics Document (DN) if not exists - SKIP IF IT FAILS
          let dnDoc = null;
          try {
            dnDoc = await LogisticsDocuments.findOne({
              where: {
                reference_id: requestId,
                document_type: 'DN'
              },
              transaction
            });
            
            if (!dnDoc) {
              dnDoc = await LogisticsDocuments.create({
                external_system: 'CRM',
                document_type: 'DN',
                document_number: dnNumber,
                reference_type: 'SPARE_REQUEST',
                reference_id: requestId,
                from_entity_type: 'plant',
                from_entity_id: plantId,
                to_entity_type: request.requested_source_type,
                to_entity_id: request.requested_source_id,
                status: 'Created',
                document_date: new Date()
              }, { transaction });
              
              console.log(`✅ Delivery Note created: ID=${dnDoc.id}, Number=${dnNumber}`);
            }
          } catch (dnError) {
            console.warn(`⚠️  Could not create Delivery Note (DB Constraint):`, dnError.message);
            console.warn(`   This may be due to database constraint. Run migration: add_plant_to_logistics_constraint.sql`);
            // Continue anyway - SAP document creation is more important
          }
          
          // Step 3: Create Stock Movement with DN reference
          try {
            const stockMovement = await StockMovement.create({
              stock_movement_type: request.spare_request_type === 'CFU' ? 'FILLUP_DISPATCH' : 'TECH_ISSUE_OUT',
              reference_type: 'DN',
              reference_no: dnNumber,
              source_location_type: 'plant',  // ✅ FROM PLANT
              source_location_id: plantId,    // ✅ PLANT ID
              destination_location_type: request.requested_source_type,
              destination_location_id: request.requested_source_id,
              total_qty: totalApprovedQty,
              movement_date: new Date(),
              status: 'pending',
              bucket: 'GOOD',
              bucket_operation: 'DECREASE',
              created_by: req.user?.id || 1,
              assigned_to: req.user?.id || 1
            }, { transaction });
            
            console.log(`✅ Stock movement created: ID=${stockMovement.movement_id}, FROM plant ${plantId} TO ${request.requested_source_type} ${request.requested_source_id}`);
          } catch (smError) {
            console.warn(`⚠️  Could not create Stock Movement:`, smError.message);
          }
          
          // Step 4: Generate random invoice number and create SAP document (CRITICAL - MUST SUCCEED)
          const invoiceDate = new Date();
          const invoiceDateStr = `${invoiceDate.getFullYear()}${String(invoiceDate.getMonth() + 1).padStart(2, '0')}${String(invoiceDate.getDate()).padStart(2, '0')}`;
          const invoiceRandom = Math.random().toString(36).substring(2, 8).toUpperCase();
          const invoiceNumber = `INV-${invoiceDateStr}-${invoiceRandom}`;
          
          console.log(`[INVOICE] Generated random invoice: ${invoiceNumber}`);
          
          console.log(`[SAP] Creating SAP document with these values:`);
          console.log(`  - sap_doc_type: INVOICE`);
          console.log(`  - sap_doc_number: ${invoiceNumber}`);
          console.log(`  - module_type: spare_request`);
          console.log(`  - reference_id: ${requestId}`);
          console.log(`  - asc_id: ${request.requested_source_type === 'service_center' ? request.requested_source_id : 'null'}`);
          
          const sapInvoice = await SAPDocuments.create({
            sap_doc_type: 'INVOICE',
            sap_doc_number: invoiceNumber,
            module_type: 'spare_request',
            reference_id: requestId,
            asc_id: request.requested_source_type === 'service_center' ? request.requested_source_id : null,
            amount: null,
            status: 'Created',
            sap_created_at: new Date(),
            synced_at: new Date()
          }, { transaction });
          
          console.log(`✅ Invoice created in SAP documents: ${invoiceNumber}, ID=${sapInvoice.id}`);
          
          // Step 5: Create SAP Document Items for each approved spare part
          console.log(`[SAP ITEMS] Creating invoice line items for ${Object.keys(itemInventoryInfo).length} items...`);
          
          let itemsCreatedCount = 0;
          for (const [itemId, info] of Object.entries(itemInventoryInfo)) {
            if (info.approvedQty > 0) {
              const sparePart = await SparePart.findByPk(info.spare_id, { transaction });
              
              if (sparePart) {
                console.log(`[SAP ITEM] Creating for spare_id=${info.spare_id}, qty=${info.approvedQty}`);
                
                await SAPDocumentItems.create({
                  sap_doc_id: sapInvoice.id,
                  spare_part_id: info.spare_id,
                  qty: info.approvedQty,
                  unit_price: sparePart.unit_price || 0,
                  gst: sparePart.gst_rate || 0,
                  hsn: sparePart.hsn_code || null
                }, { transaction });
                
                itemsCreatedCount++;
                console.log(`✅ Invoice item created: Spare=${info.spare_id}, Qty=${info.approvedQty}, Price=${sparePart.unit_price || 0}`);
              } else {
                console.warn(`⚠️  Spare part ${info.spare_id} not found, skipping SAP item`);
              }
            }
          }
          
          console.log(`✅ Created ${itemsCreatedCount} SAP document items`);
          
          // Update inventory: DECREASE at plant, INCREASE at service center
          console.log(`[INVENTORY UPDATE] Adjusting inventory for plant and ${request.requested_source_type}...`);
          
          for (const [itemId, info] of Object.entries(itemInventoryInfo)) {
            if (info.approvedQty > 0) {
              const spareId = info.spare_id;
              
              // DECREASE at plant
              const plantInventory = await SpareInventory.findOne({
                where: {
                  spare_id: spareId,
                  location_type: request.requested_to_type,
                  location_id: plantId
                },
                transaction
              });
              
              if (plantInventory) {
                await plantInventory.update({
                  qty_good: Math.max(0, (plantInventory.qty_good || 0) - info.approvedQty)
                }, { transaction });
                console.log(`✅ Decreased plant inventory: spare_id=${spareId}, qty=${info.approvedQty}`);
              }
              
              // INCREASE at destination (service_center/branch)
              let destInventory = await SpareInventory.findOne({
                where: {
                  spare_id: spareId,
                  location_type: request.requested_source_type,
                  location_id: request.requested_source_id
                },
                transaction
              });
              
              if (destInventory) {
                await destInventory.update({
                  qty_good: (destInventory.qty_good || 0) + info.approvedQty
                }, { transaction });
              } else {
                // Create new inventory record if doesn't exist
                await SpareInventory.create({
                  spare_id: spareId,
                  location_type: request.requested_source_type,
                  location_id: request.requested_source_id,
                  qty_good: info.approvedQty,
                  qty_defective: 0
                }, { transaction });
              }
              console.log(`✅ Increased ${request.requested_source_type} inventory: spare_id=${spareId}, qty=${info.approvedQty}`);
            }
          }
        } else {
          console.log(`⚠️  No approved quantity, skipping stock movement creation`);
        }
      } catch (movementError) {
        console.error(`❌ CRITICAL ERROR in stock movement/invoice creation:`, movementError.message);
        console.error(`Stack:`, movementError.stack);
        throw movementError; // Fail the entire approval if SAP documents can't be created
      }

      console.log(`[APPROVAL SUCCESS] Request ${requestId} approved successfully`);
      
      // Commit transaction before sending response
      console.log('🔄 Attempting to commit transaction...');
      if (transaction && !transaction.finished) {
        await transaction.commit();
        console.log('✅ Transaction committed successfully');
      } else {
        console.warn('⚠️  Transaction already finished or null, skipping commit');
      }
      transaction = null; // Clear reference after commit
      
      res.json({ 
        ok: true, 
        message: 'Request approved successfully',
        requestId: request.request_id,
        inventoryInfo: itemInventoryInfo
      });
      
    } catch (txError) {
      // Rollback on error
      console.error('❌ Error during approval transaction:', txError.message);
      await safeRollback(transaction, txError);
      throw txError; // Re-throw to be caught by outer catch
    }
    
  } catch (error) {
    console.error('❌ Error in approve endpoint:', error.message);
    // Don't try to rollback here - it was already handled in inner catch
    res.status(500).json({ error: error.message });
  }
});

// POST /api/rsm/spare-requests/:requestId/reject - RSM rejects a spare request
router.post('/spare-requests/:requestId/reject', authenticateToken, requireRole('rsm'), async (req, res) => {
  let transaction = null;
  
  try {
    const { requestId } = req.params;
    const { reason } = req.body;
    
    // ===== STEP 0: ALL VALIDATIONS BEFORE TRANSACTION =====
    // Fetch the request
    const request = await SpareRequest.findByPk(requestId, { 
      include: [{ model: SpareRequestItem, as: 'SpareRequestItems' }]
    });
    
    if (!request) {
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
        return res.status(403).json({ error: 'RSM record not found' });
      }
    }
    
    const plantId = request.requested_to_id;
    
    const mappings = await RSMStateMapping.findAll({ 
      where: { rsm_user_id: rsmId, is_active: true }
    });
    const stateIds = mappings.map(m => m.state_id);
    
    const plant = await Plant.findOne({ 
      where: { plant_id: plantId, state_id: stateIds }
    });
    
    if (!plant) {
      return res.status(403).json({ error: 'Not authorized to reject requests for this plant' });
    }

    // ===== STEP 1: START TRANSACTION (after all validations pass) =====
    transaction = await sequelize.transaction();
    console.log('✅ Transaction created for request ' + requestId);
    
    try {
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
        approval_level: 1,
        approver_user_id: rsmId,
        approval_status: 'rejected',
        approval_remarks: reason || 'Rejected by RSM',
        approved_at: new Date()
      }, { transaction });

      console.log(`[REJECTION SUCCESS] Request ${requestId} rejected successfully`);
      
      // Commit transaction before sending response
      console.log('🔄 Attempting to commit transaction...');
      if (transaction && !transaction.finished) {
        await transaction.commit();
        console.log('✅ Transaction committed successfully');
      } else {
        console.warn('⚠️  Transaction already finished or null, skipping commit');
      }
      transaction = null; // Clear reference after commit
      
      res.json({ 
        ok: true, 
        message: 'Request rejected successfully',
        requestId: request.request_id
      });
      
    } catch (txError) {
      // Rollback on error
      console.error('❌ Error during rejection transaction:', txError.message);
      await safeRollback(transaction, txError);
      throw txError; // Re-throw to be caught by outer catch
    }
    
  } catch (error) {
    console.error('❌ Error in reject endpoint:', error.message);
    // Don't try to rollback here - it was already handled in inner catch
    res.status(500).json({ error: error.message });
  }
});

export default router;
