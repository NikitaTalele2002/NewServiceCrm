/**
 * Stock Movement Service
 * Handles creation of stock movements when deliveries are received
 * Tracks goods movement items and cartons
 * Updates inventory at source and destination locations
 */

import { sequelize } from '../db.js';
import fs from 'fs';
import path from 'path';
import { safeRollback, safeCommit, isTransactionActive } from '../utils/transactionHelper.js';

// File-based logging for debugging - use absolute path to be safe
const logDir = 'c:\\Crm_dashboard';
const logFile = path.join(logDir, 'inventory_debug.log');

function logToFile(msg) {
  const timestamp = new Date().toISOString();
  try {
    fs.appendFileSync(logFile, `${timestamp} - ${msg}\n`);
    console.log(msg);
  } catch (error) {
    console.error(`⚠️ Failed to write debug log: ${error.message}`);
    console.log(msg);
  }
}

/**
 * Create stock movement when DN/Challan is received
 * @param {Object} params - Movement parameters
 * @param {number} params.requestId - Spare request ID
 * @param {string} params.documentType - Document type ('DN' or 'CHALLAN')
 * @param {string} params.documentNumber - Document number
 * @param {string} params.sourceLocationType - Source location type (e.g., 'branch', 'warehouse')
 * @param {number} params.sourceLocationId - Source location ID (plant/branch ID)
 * @param {string} params.destLocationType - Destination location type (e.g., 'service_center')
 * @param {number} params.destLocationId - Destination location ID (ASC ID)
 * @param {Array} params.items - Array of items with spare_id, qty, carton_id, condition
 * @param {number} params.userId - User ID creating the movement
 * @param {Object} transaction - Sequelize transaction object
 * @returns {Object} Created stock movement with details
 */
export async function createStockMovement(params, transaction) {
  const {
    requestId,
    documentType,
    documentNumber,
    sourceLocationType,
    sourceLocationId,
    destLocationType,
    destLocationId,
    items = [],
    userId
  } = params;

  try {
    // Validate required parameters
    if (!documentType || !documentNumber || !sourceLocationId || !destLocationId) {
      throw new Error(`Missing required parameters: documentType=${documentType}, documentNumber=${documentNumber}, sourceLocationId=${sourceLocationId}, destLocationId=${destLocationId}`);
    }

    // Calculate total quantity
    const totalQty = items.reduce((sum, item) => sum + (item.qty || 0), 0);

    console.log(`🔵 Creating StockMovement with: type=${sourceLocationType}-${sourceLocationId} → ${destLocationType}-${destLocationId}, totalQty=${totalQty}`);

    // Create stock movement record
    // reference_no stores the SAP-generated Delivery Note (DN) or Challan number
    const movement = await sequelize.models.StockMovement.create(
      {
        stock_movement_type: 'FILLUP_DISPATCH', // Plant to ASC is a fillup dispatch
        reference_type: 'spare_request',
        reference_no: documentNumber, // SAP-generated DN/Challan number (e.g., 'DN-20260216-XRKKV')
        source_location_type: sourceLocationType,
        source_location_id: sourceLocationId,
        destination_location_type: destLocationType,
        destination_location_id: destLocationId,
        total_qty: totalQty,
        movement_date: new Date(),
        created_by: userId || null,
        status: 'completed' // Mark as completed since DN/Challan is already received
      },
      { transaction }
    );

    console.log(`✅ Stock movement created: ${movement.movement_id}`);
    console.log(`📋 DN Number stored in reference_no: ${movement.reference_no}`);

    // Create carton records and goods movement items
    const createdCartons = [];
    const createdMovementItems = [];

    for (const item of items) {
      // Create carton record if carton data provided
      let cartonId = null;
      
      if (item.carton_number) {
        try {
          const carton = await sequelize.models.Cartons.create(
            {
              movement_id: movement.movement_id,
              carton_number: item.carton_number
            },
            { transaction }
          );
          cartonId = carton.carton_id;
          createdCartons.push(carton.toJSON());
          console.log(`✅ Carton created: ${item.carton_number}`);
        } catch (cartonError) {
          console.warn(`⚠️ Carton creation failed for ${item.carton_number}:`, cartonError.message);
        }
      }

      // Create goods movement item
      const movementItem = await sequelize.models.GoodsMovementItems.create(
        {
          movement_id: movement.movement_id,
          carton_id: cartonId || null,
          spare_part_id: item.spare_id,
          qty: item.qty || 0,
          condition: item.condition || 'good'
        },
        { transaction }
      );

      createdMovementItems.push(movementItem.toJSON());
      console.log(`✅ Goods movement item created: spare_id=${item.spare_id}, qty=${item.qty}`);
    }

    return {
      movement: movement.toJSON(),
      cartons: createdCartons,
      items: createdMovementItems
    };

  } catch (error) {
    console.error('❌ Error creating stock movement:', error.message);
    console.error('Stack:', error.stack);
    throw error;
  }
}

/**
 * Update inventory when delivery is received
 * Decreases inventory at source location (plant/branch)
 * Increases inventory at destination location (ASC)
 * 
 * @param {number} sourceLocationId - Source location ID (plant ID)
 * @param {number} destLocationId - Destination location ID (ASC ID)
 * @param {Array} items - Array of items with spare_id and qty
 * @param {string} sourceLocationType - Source location type
 * @param {string} destLocationType - Destination location type
 * @param {Object} transaction - Sequelize transaction object
 * @returns {Object} Updated inventory records
 */
export async function updateInventory(sourceLocationId, destLocationId, items, sourceLocationType, destLocationType, transaction) {
  const updatedRecords = {
    source: [],
    destination: []
  };

  try {
    logToFile(`\n🔵 ==== UPDATING INVENTORY ====`);
    logToFile(`Source: ${sourceLocationType}-${sourceLocationId}`);
    logToFile(`Destination: ${destLocationType}-${destLocationId}`);
    logToFile(`Items to process: ${JSON.stringify(items)}`);
    logToFile(`Transaction object exists: ${transaction ? 'YES' : 'NO'}`);

    if (!items || items.length === 0) {
      logToFile(`⚠️ No items to process!`);
      return updatedRecords;
    }

    for (const item of items) {
      const { spare_id, qty } = item;

      logToFile(`\n📝 Processing item: spare_id=${spare_id}, qty=${qty}`);

      if (spare_id === null || spare_id === undefined || qty === null || qty === undefined) {
        logToFile(`⚠️ Skipping - missing spare_id or qty (spare_id=${spare_id}, qty=${qty})`);
        continue;
      }

      // Update source location inventory (decrease)
      logToFile(`📝 Query: Find source inventory where spare_id=${spare_id}, location_type='${sourceLocationType}', location_id=${sourceLocationId}`);
      
      let sourceInv = await sequelize.models.SpareInventory.findOne({
        where: {
          spare_id: spare_id,
          location_type: sourceLocationType,
          location_id: sourceLocationId
        },
        transaction: transaction
      });

      if (sourceInv) {
        const oldQty = sourceInv.qty_good || 0;
        const newQty = Math.max(0, oldQty - qty);
        
        logToFile(`✅ Source found: old qty=${oldQty}, will decrease to ${newQty}`);
        
        const updateResult = await sequelize.models.SpareInventory.update(
          { qty_good: newQty },
          {
            where: {
              spare_id: spare_id,
              location_type: sourceLocationType,
              location_id: sourceLocationId
            },
            transaction: transaction,
            individualHooks: false
          }
        );

        logToFile(`📊 Update result: ${updateResult[0]} rows affected`);

        updatedRecords.source.push({
          spare_id,
          location: `${sourceLocationType}-${sourceLocationId}`,
          oldQty,
          newQty,
          change: -qty
        });

        logToFile(`✅ Source inventory UPDATED: spare_id=${spare_id}, ${oldQty} → ${newQty}`);
      } else {
        logToFile(`⚠️ No source inventory found for spare_id=${spare_id}`);
      }

      // Update destination location inventory (increase)
      logToFile(`📝 Query: Find destination inventory where spare_id=${spare_id}, location_type='${destLocationType}', location_id=${destLocationId}`);
      
      let destInv = await sequelize.models.SpareInventory.findOne({
        where: {
          spare_id: spare_id,
          location_type: destLocationType,
          location_id: destLocationId
        },
        transaction: transaction
      });

      if (destInv) {
        const oldQty = destInv.qty_good || 0;
        const newQty = oldQty + qty;
        
        logToFile(`✅ Destination found: old qty=${oldQty}, will increase to ${newQty}`);
        
        const updateResult = await sequelize.models.SpareInventory.update(
          { qty_good: newQty },
          {
            where: {
              spare_id: spare_id,
              location_type: destLocationType,
              location_id: destLocationId
            },
            transaction: transaction,
            individualHooks: false
          }
        );

        logToFile(`📊 Update result: ${updateResult[0]} rows affected`);

        updatedRecords.destination.push({
          spare_id,
          location: `${destLocationType}-${destLocationId}`,
          oldQty,
          newQty,
          change: qty
        });

        logToFile(`✅ Destination inventory UPDATED: spare_id=${spare_id}, ${oldQty} → ${newQty}`);
      } else {
        logToFile(`📝 Creating new destination inventory record...`);
        await sequelize.models.SpareInventory.create(
          {
            spare_id: spare_id,
            location_type: destLocationType,
            location_id: destLocationId,
            qty_good: qty,
            qty_defective: 0
          },
          { transaction }
        );

        updatedRecords.destination.push({
          spare_id,
          location: `${destLocationType}-${destLocationId}`,
          oldQty: 0,
          newQty: qty,
          change: qty,
          isNew: true
        });

        logToFile(`✅ NEW destination inventory CREATED: spare_id=${spare_id}, qty=${qty}`);
      }
    }

    logToFile(`\n✅ Inventory update complete. Total source changes: ${updatedRecords.source.length}, Total dest changes: ${updatedRecords.destination.length}\n`);
    return updatedRecords;

  } catch (error) {
    const errorMsg = `❌ Error updating inventory: ${error.message}`;
    logToFile(errorMsg);
    logToFile(`Stack: ${error.stack}`);
    console.error(errorMsg);
    console.error('Stack:', error.stack);
    throw error;
  }
}

/**
 * Process delivery note (DN) or Challan reception at ASC
 * This is the main entry point for handling DN/Challan receipt
 * 
 * @param {Object} params - Parameters
 * @param {number} params.requestId - Spare request ID
 * @param {string} params.documentType - 'DN' or 'CHALLAN'
 * @param {string} params.documentNumber - Document number
 * @param {number} params.plantId - Plant ID (source)
 * @param {number} params.ascId - ASC ID (destination)
 * @param {Array} params.items - Items received
 * @param {number} params.userId - User ID
 * @returns {Object} Complete transaction result
 */
export async function processDeliveryReception(params) {
  let transaction;
  try {
    const {
      requestId,
      documentType,
      documentNumber,
      plantId,
      ascId,
      items,
      userId
    } = params;

    console.log('🔵 Starting processDeliveryReception with params:', {
      requestId, documentType, documentNumber, plantId, ascId, itemCount: items?.length, userId
    });
    logToFile(`\n🔵🔵🔵 processDeliveryReception CALLED - params: ${JSON.stringify({requestId, documentType, documentNumber, plantId, ascId, itemCount: items?.length})}\n`);

    // Create transaction
    transaction = await sequelize.transaction();
    console.log('✅ Transaction created');

    // Step 1: Create stock movement
    console.log('📝 Creating stock movement...');
    const movementResult = await createStockMovement(
      {
        requestId,
        documentType,
        documentNumber,
        sourceLocationType: 'branch', // Plant is a branch
        sourceLocationId: plantId,
        destLocationType: 'service_center',
        destLocationId: ascId,
        items,
        userId
      },
      transaction
    );
    console.log('✅ Stock movement created:', movementResult.movement.movement_id);

    // Step 2: Update inventory
    console.log('📝 Updating inventory...');
    logToFile(`\n📝 BEFORE updateInventory call\n`);
    
    let inventoryResult;
    try {
      inventoryResult = await updateInventory(
        plantId,
        ascId,
        items,
        'branch',
        'service_center',
        transaction
      );
      logToFile(`📝 AFTER updateInventory call - result: ${JSON.stringify(inventoryResult)}\n`);
    } catch (error) {
      logToFile(`❌ updateInventory threw error: ${error.message}\n`);
      throw error;
    }
    
    console.log('✅ Inventory updated');

    // Commit transaction
    console.log('📝 Committing transaction...');
    await safeCommit(transaction);
    console.log('✅ Transaction committed successfully');

    return {
      success: true,
      movement: movementResult,
      inventory: inventoryResult,
      message: `${documentType} ${documentNumber} received and inventory updated`
    };

  } catch (error) {
    console.error('❌ Error in processDeliveryReception:', error.message);
    console.error('Stack:', error.stack);
    
    await safeRollback(transaction, error);
    throw error;
  }
}

/**
 * Get stock movement history for a spare request
 * @param {number} requestId - Spare request ID
 * @returns {Array} Array of stock movements
 */
export async function getMovementHistory(requestId) {
  try {
    const movements = await sequelize.models.StockMovement.findAll(
      {
        where: { reference_no: { [sequelize.Sequelize.Op.like]: `%DN-%` } },
        include: [
          {
            model: sequelize.models.GoodsMovementItems,
            as: 'goods_items',
            include: [
              {
                model: sequelize.models.Cartons,
                as: 'carton'
              }
            ]
          },
          {
            model: sequelize.models.Cartons,
            as: 'cartons'
          }
        ],
        order: [['movement_date', 'DESC']]
      }
    );

    return movements;
  } catch (error) {
    console.error('❌ Error fetching movement history:', error);
    throw error;
  }
}

/**
 * Get in-transit materials (materials that have been shipped but not yet received)
 * @param {number} ascId - ASC ID
 * @returns {Array} In-transit materials
 */
export async function getInTransitMaterials(ascId) {
  try {
    const inTransit = await sequelize.query(
      `
      SELECT 
        sm.movement_id,
        sm.reference_no,
        sm.movement_date,
        sp.PART as spare_part,
        sp.DESCRIPTION,
        gmi.qty,
        gmi.condition,
        c.carton_number,
        sm.source_location_id,
        sm.source_location_type
      FROM stock_movement sm
      LEFT JOIN goods_movement_items gmi ON sm.movement_id = gmi.movement_id
      LEFT JOIN cartons c ON sm.movement_id = c.movement_id
      LEFT JOIN spare_parts sp ON gmi.spare_part_id = sp.Id
      WHERE sm.destination_location_id = ? 
        AND sm.destination_location_type = 'service_center'
        AND sm.movement_type = 'transfer'
        AND sm.status = 'in_transit'
      ORDER BY sm.movement_date DESC
      `,
      {
        replacements: [ascId],
        type: sequelize.QueryTypes.SELECT
      }
    );

    return inTransit;
  } catch (error) {
    console.error('❌ Error fetching in-transit materials:', error);
    throw error;
  }
}

export default {
  createStockMovement,
  updateInventory,
  processDeliveryReception,
  getMovementHistory,
  getInTransitMaterials
};
