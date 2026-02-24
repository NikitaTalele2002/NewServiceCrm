import { sequelize } from '../db.js';
import { SPARE_REQUEST_TYPES } from '../constants/requestTypeConstants.js';
import { QueryTypes } from 'sequelize';
import {
  SpareRequest,
  SpareRequestItem,
  Technicians,
  StockMovement,
  Status,
  SparePart,
  GoodsMovementItems,
  Approvals
} from '../models/index.js';

/**
 * Create a spare return request
 * This tracks defective spares and remaining goods being returned to ASC
 */
export async function createReturnRequest(data, transaction) {
  try {
    const {
      technician_id,
      call_id,
      request_reason = 'defective_collected',
      items,
      remarks,
      created_by
    } = data;

    // Get technician's service center
    const technician = await Technicians.findOne({
      where: { technician_id },
      transaction
    });

    if (!technician) {
      throw new Error(`Technician ${technician_id} not found`);
    }

    // Get pending status
    const pendingStatus = await Status.findOne({
      where: { status_name: 'pending' },
      transaction
    });

    if (!pendingStatus) {
      throw new Error('Pending status not found');
    }

    // Create return request
    const requestNumber = `RET-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const returnRequest = await SpareRequest.create({
      spare_request_type: SPARE_REQUEST_TYPES.TECH_RETURN_DEFECTIVE,
      request_reason,
      call_id,
      requested_source_type: 'technician',
      requested_source_id: technician_id,
      requested_to_type: 'service_center',
      requested_to_id: technician.service_center_id,
      status_id: pendingStatus.status_id,
      created_by,
      created_at: new Date(),
      updated_at: new Date(),
      // Store request number in notes field for now (or use requestNumber field if available)
      notes: `Request #: ${requestNumber}\nReason: ${request_reason}\n${remarks ? 'Remarks: ' + remarks : ''}`
    }, { transaction });

    // Update requestNumber or store it in notes
    const returnRequestId = returnRequest.request_id;

    // Create return request items
    for (const item of items) {
      // Verify spare exists
      const spare = await SparePart.findOne({
        where: { Id: item.spare_id },
        transaction
      });

      if (!spare) {
        throw new Error(`Spare part ${item.spare_id} not found`);
      }

      // Check if technician has this inventory
      const techInventory = await TechnicianInventory.findOne({
        where: {
          TechnicianId: technician_id,
          Sku: spare.PART
        },
        transaction
      });

      if (!techInventory) {
        console.warn(`⚠️ Technician ${technician_id} doesn't have spare ${spare.PART} in inventory`);
        // Don't throw error, just create the return item anyway (technician might have already used some)
      }

      // Verify technician has enough to return
      const totalToReturn = (item.good_qty || 0) + (item.defective_qty || 0);
      if (techInventory && totalToReturn > (techInventory.GoodQty + techInventory.DefectiveQty)) {
        console.warn(`⚠️ Warning: Technician inventory mismatch for ${spare.PART}`);
        // Continue anyway - might be discrepancies
      }

      // Create the return item
      await SpareRequestItem.create({
        RequestId: returnRequestId,
        Sku: spare.PART,
        SpareName: spare.DESCRIPTION || spare.PART,
        RequestedQty: totalToReturn,
        ApprovedQty: totalToReturn, // Auto-approve on creation
        // Store defective qty in notes
        notes: `Good: ${item.good_qty || 0}, Defective: ${item.defective_qty || 0}. ${item.remarks || ''}`
      }, { transaction });
    }

    // Don't create stock movement yet - wait for ASC to receive
    // The stock movement will be created when the return is received at ASC

    console.log(`✅ Created return request: ID=${returnRequestId}, Technician=${technician_id}`);

    return {
      return_request_id: returnRequestId,
      request_number: requestNumber,
      status: 'pending',
      technician_id,
      service_center_id: technician.service_center_id
    };
  } catch (error) {
    console.error('Error creating return request:', error);
    throw error;
  }
}

/**
 * Get return requests for a service center
 */
export async function getReturnRequestsForServiceCenter(serviceCenterId, filters = {}) {
  try {
    const {
      technician_id,
      status,
      from_date,
      to_date,
      include_items = true
    } = filters;

    let whereClause = `
      WHERE sr.requested_to_type = 'service_center'
      AND sr.requested_to_id = ?
      AND sr.spare_request_type = '${SPARE_REQUEST_TYPES.TECH_RETURN_DEFECTIVE}'
    `;
    const replacements = [serviceCenterId];

    // Add technician filter
    if (technician_id) {
      whereClause += ` AND sr.requested_source_id = ?`;
      replacements.push(technician_id);
    }

    // Add status filter
    if (status) {
      whereClause += ` AND st.status_name = ?`;
      replacements.push(status);
    }

    // Add date filters
    if (from_date) {
      whereClause += ` AND sr.created_at >= ?`;
      replacements.push(from_date);
    }
    if (to_date) {
      whereClause += ` AND sr.created_at <= ?`;
      replacements.push(to_date);
    }

    const requests = await sequelize.query(`
      SELECT 
        sr.request_id,
        'RET-' + CAST(sr.request_id AS VARCHAR) as request_number,
        sr.request_reason,
        sr.call_id,
        COALESCE(t.name, 'Unknown') as technician_name,
        COALESCE(t.phone, '') as technician_phone,
        COALESCE(st.status_name, 'pending') as status,
        sr.created_at,
        sr.updated_at
      FROM spare_requests sr
      LEFT JOIN technicians t ON sr.requested_source_id = t.technician_id
      LEFT JOIN [status] st ON sr.status_id = st.status_id
      ${whereClause}
      ORDER BY sr.created_at DESC
    `, { replacements, type: sequelize.QueryTypes.SELECT });

    // Load items if requested
    if (include_items) {
      for (const request of requests) {
        const items = await sequelize.query(`
          SELECT 
            sri.Id as return_item_id,
            sri.Sku,
            sri.SpareName,
            sri.RequestedQty as return_qty,
            sri.ApprovedQty,
            sri.notes
          FROM SpareRequestItems sri
          WHERE sri.RequestId = ?
        `, { replacements: [request.request_id], type: sequelize.QueryTypes.SELECT });

        // Parse good/defective from notes
        request.items = items.map(item => {
          const notesMatch = item.notes?.match(/Good: (\d+), Defective: (\d+)/);
          return {
            return_item_id: item.return_item_id,
            sku: item.Sku,
            spare_name: item.SpareName,
            good_qty: notesMatch ? parseInt(notesMatch[1]) : 0,
            defective_qty: notesMatch ? parseInt(notesMatch[2]) : item.return_qty,
            approval_status: item.ApprovedQty > 0 ? 'approved' : 'pending'
          };
        });
      }
    }

    return requests;
  } catch (error) {
    console.error('Error fetching return requests:', error);
    throw error;
  }
}

/**
 * Get return request details
 */
export async function getReturnRequestDetails(returnRequestId, serviceCenterId) {
  try {
    const request = await sequelize.query(`
      SELECT 
        sr.request_id,
        'RET-' + CAST(sr.request_id AS VARCHAR) as request_number,
        sr.spare_request_type,
        sr.request_reason,
        sr.call_id,
        sr.requested_source_id as technician_id,
        COALESCE(t.name, 'Unknown') as technician_name,
        COALESCE(t.phone, '') as technician_phone,
        sr.requested_to_id as service_center_id,
        sr.notes,
        COALESCE(st.status_name, 'pending') as status,
        sr.created_at,
        sr.updated_at
      FROM spare_requests sr
      LEFT JOIN technicians t ON sr.requested_source_id = t.technician_id
      LEFT JOIN [status] st ON sr.status_id = st.status_id
      WHERE sr.request_id = ?
      AND sr.requested_to_id = ?
      AND sr.spare_request_type = '${SPARE_REQUEST_TYPES.TECH_RETURN_DEFECTIVE}'
    `, { replacements: [returnRequestId, serviceCenterId], type: sequelize.QueryTypes.SELECT });

    if (!request || request.length === 0) {
      return null;
    }

    const data = request[0];

    // Get items
    const items = await sequelize.query(`
      SELECT 
        sri.Id as return_item_id,
        sri.Sku,
        sri.SpareName,
        sri.RequestedQty as return_qty,
        sri.ApprovedQty,
        sri.notes
      FROM SpareRequestItems sri
      WHERE sri.RequestId = ?
    `, { replacements: [returnRequestId], type: sequelize.QueryTypes.SELECT });

    data.items = items.map(item => {
      const notesMatch = item.notes?.match(/Good: (\d+), Defective: (\d+)/);
      return {
        return_item_id: item.return_item_id,
        sku: item.Sku,
        spare_name: item.SpareName,
        good_qty: notesMatch ? parseInt(notesMatch[1]) : 0,
        defective_qty: notesMatch ? parseInt(notesMatch[2]) : item.return_qty,
        received_qty: 0, // Will be updated when received
        verified_qty: 0  // Will be updated when verified
      };
    });

    return data;
  } catch (error) {
    console.error('Error fetching return request details:', error);
    throw error;
  }
}

/**
 * Receive return request at ASC
 * Creates stock movement from technician to service center
 */
export async function receiveReturnRequest(returnRequestId, serviceCenterId, receiveData, transaction) {
  try {
    const { received_items, received_by, received_remarks, received_by_user_id } = receiveData;

    // Get the return request
    const returnRequest = await SpareRequest.findOne({
      where: { request_id: returnRequestId },
      transaction
    });

    if (!returnRequest) {
      throw new Error('Return request not found');
    }

    if (returnRequest.requested_to_id !== serviceCenterId) {
      throw new Error('You are not authorized to receive this return');
    }

    // Get technician info
    const technician = await Technicians.findOne({
      where: { technician_id: returnRequest.requested_source_id },
      transaction
    });

    if (!technician) {
      throw new Error('Technician not found');
    }

    // Update technician inventory (reduce) and service center inventory (increase)
    let totalReceivedQty = 0;

    for (const item of received_items) {
      const requestItem = await SpareRequestItem.findOne({
        where: { Id: item.return_item_id },
        transaction
      });

      if (!requestItem) continue;

      const receivedTotal = (item.received_good_qty || 0) + (item.received_defective_qty || 0);
      totalReceivedQty += receivedTotal;

      // Reduce from technician inventory
      // NOTE: TechnicianInventory and ServiceCenterInventory tables don't exist in current database
      // Inventory tracking is done via stock_movement table
      
      // TODO: Implement inventory tracking using spare_inventory table or equivalent
      // For now, we just track the movement in stock_movement table
      
      /*
      const techInventory = await TechnicianInventory.findOne({
        where: {
          TechnicianId: technician.technician_id,
          Sku: requestItem.Sku
        },
        transaction
      });

      if (techInventory) {
        if (item.received_good_qty > 0) {
          techInventory.GoodQty = Math.max(0, techInventory.GoodQty - item.received_good_qty);
        }
        if (item.received_defective_qty > 0) {
          techInventory.DefectiveQty = Math.max(0, techInventory.DefectiveQty - item.received_defective_qty);
        }

        if (techInventory.GoodQty === 0 && techInventory.DefectiveQty === 0) {
          await techInventory.destroy({ transaction });
        } else {
          await techInventory.save({ transaction });
        }
      }

      // Add to service center inventory
      // TODO: Implement using spare_inventory table
      /*
      let scInventory = await ServiceCenterInventory.findOne({
        where: {
          Sku: requestItem.Sku,
          ServiceCentreId: serviceCenterId
        },
        transaction
      });

      if (scInventory) {
        scInventory.GoodQty = (scInventory.GoodQty || 0) + (item.received_good_qty || 0);
        scInventory.DefectiveQty = (scInventory.DefectiveQty || 0) + (item.received_defective_qty || 0);
        await scInventory.save({ transaction });
      } else {
        await ServiceCenterInventory.create({
          Sku: requestItem.Sku,
          SpareName: requestItem.SpareName,
          ServiceCentreId: serviceCenterId,
          GoodQty: item.received_good_qty || 0,
          DefectiveQty: item.received_defective_qty || 0,
          ReceivedFrom: `Technician ${technician.technician_id} Return`,
          ReceivedAt: new Date()
        }, { transaction });
      }
      */
    }

    // Create stock movement (return movement)
    const receivedStatus = await Status.findOne({
      where: { status_name: 'received' },
      transaction
    });

    const movementStatus = await StockMovement.create({
      stock_movement_type: 'TECH_ISSUE_IN',
      reference_type: 'return_request',
      reference_no: `RET-${returnRequestId}`,
      source_location_type: 'technician',
      source_location_id: returnRequest.requested_source_id,
      destination_location_type: 'service_center',
      destination_location_id: serviceCenterId,
      total_qty: totalReceivedQty,
      movement_date: new Date(),
      status: 'completed',
      created_by: received_by_user_id,
      created_at: new Date(),
      updated_at: new Date()
    }, { transaction });

    // Update return request status to received
    await returnRequest.update({
      status_id: receivedStatus ? receivedStatus.status_id : returnRequest.status_id,
      updated_at: new Date(),
      notes: (returnRequest.notes || '') + `\n\nReceived: ${received_by} at ${new Date().toISOString()}\n${received_remarks || ''}`
    }, { transaction });

    console.log(`✅ Return request ${returnRequestId} received, created stock movement ${movementStatus.movement_id}`);

    return {
      return_request_id: returnRequestId,
      stock_movement_id: movementStatus.movement_id,
      status: 'received'
    };
  } catch (error) {
    console.error('Error receiving return request:', error);
    throw error;
  }
}

/**
 * Verify return request at ASC
 * Final quality check and quantity verification
 */
export async function verifyReturnRequest(returnRequestId, serviceCenterId, verifyData, transaction) {
  try {
    const { verified_items, verified_remarks, verified_by_user_id } = verifyData;

    console.log(`\n🔍 Starting verification process for return request ${returnRequestId}`);

    // Get the return request
    const returnRequest = await SpareRequest.findOne({
      where: { request_id: returnRequestId },
      transaction
    });

    if (!returnRequest) {
      throw new Error(`Return request ${returnRequestId} not found`);
    }

    const technicianId = returnRequest.requested_source_id;
    let totalVerifiedQty = 0;
    const itemDetails = [];

    console.log(`📋 Processing ${verified_items.length} items for verification`);

    // Update verified quantities in request items and collect details for stock movement
    for (const item of verified_items) {
      const requestItem = await SpareRequestItem.findOne({
        where: { Id: item.return_item_id },
        transaction
      });

      if (requestItem) {
        const verifiedTotal = (item.verified_good_qty || 0) + (item.verified_defective_qty || 0);
        totalVerifiedQty += verifiedTotal;
        
        console.log(`  - Item ${item.return_item_id}: Good=${item.verified_good_qty}, Defective=${item.verified_defective_qty}`);
        
        // Update with verified quantities
        await requestItem.update({
          ApprovedQty: verifiedTotal,
          notes: (requestItem.notes || '') + `\nVerified: Good=${item.verified_good_qty || 0}, Defective=${item.verified_defective_qty || 0}. ${item.condition_notes || ''}`
        }, { transaction });

        itemDetails.push({
          return_item_id: item.return_item_id,
          spare_id: requestItem.spare_id,
          verified_good_qty: item.verified_good_qty || 0,
          verified_defective_qty: item.verified_defective_qty || 0,
          verified_total: verifiedTotal
        });
      } else {
        console.warn(`⚠️ Request item ${item.return_item_id} not found`);
      }
    }

    // Create approval record for the return request
    console.log(`\n📝 Creating approval record...`);
    try {
      const goodQty = verified_items.reduce((sum, i) => sum + (i.verified_good_qty || 0), 0);
      const defectiveQty = verified_items.reduce((sum, i) => sum + (i.verified_defective_qty || 0), 0);
      
      await sequelize.query(`
        INSERT INTO approvals (
          entity_type,
          entity_id,
          approval_level,
          approver_user_id,
          approval_status,
          approval_remarks,
          approved_at,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, 'approved', ?, GETDATE(), GETDATE(), GETDATE())
      `, { 
        replacements: [
          'return_request',
          returnRequestId,
          1,
          verified_by_user_id,
          `Return Approved - Total ${totalVerifiedQty} items (Good: ${goodQty}, Defective: ${defectiveQty})`
        ],
        transaction
      });
      console.log(`✅ Created approval record for return request ${returnRequestId}`);
    } catch (approvalErr) {
      console.warn(`⚠️ Warning: Could not create approval record: ${approvalErr.message}`);
      console.warn(`   Error details: ${approvalErr.message}`);
    }

    // Create stock_movement record for incoming goods from technician
    console.log(`\n📦 Creating stock movement for return of ${totalVerifiedQty} items from technician ${technicianId} to service center ${serviceCenterId}`);

    let stockMovement;
    try {
      stockMovement = await StockMovement.create({
        stock_movement_type: 'TECH_ISSUE_IN',  // Items being returned from technician
        reference_type: 'return_request',
        reference_no: `RET-${returnRequestId}`,
        source_location_type: 'technician',
        source_location_id: technicianId,
        destination_location_type: 'service_center',
        destination_location_id: serviceCenterId,
        total_qty: totalVerifiedQty,
        movement_date: new Date(),
        created_by: verified_by_user_id,
        status: 'completed'
      }, { transaction });

      console.log(`✓ Stock movement created with ID: ${stockMovement.movement_id}`);
    } catch (error) {
      console.error('❌ Error creating stock movement:', error.message);
      throw new Error(`Failed to create stock movement: ${error.message}`);
    }

    // Create goods_movement_items for each verified item
    console.log(`\n📋 Creating goods movement items...`);
    let goodsMovementItemsCreated = 0;

    for (const item of itemDetails) {
      const spare = await SparePart.findOne({
        where: { Id: item.spare_id },
        transaction
      });

      if (!spare) {
        console.warn(`⚠️ Spare part ${item.spare_id} not found, skipping movement item`);
        continue;
      }

      // Create good items record
      if (item.verified_good_qty > 0) {
        try {
          await GoodsMovementItems.create({
            movement_id: stockMovement.movement_id,
            spare_part_id: item.spare_id,
            qty: item.verified_good_qty,
            condition: 'good',
            created_at: new Date(),
            updated_at: new Date()
          }, { transaction });
          goodsMovementItemsCreated++;
          console.log(`  ✓ Recorded ${item.verified_good_qty} good units of spare ${item.spare_id}`);
        } catch (error) {
          console.error(`  ❌ Error creating good items record for spare ${item.spare_id}:`, error.message);
          throw new Error(`Failed to create goods movement item for spare ${item.spare_id}: ${error.message}`);
        }
      }

      // Create defective items record
      if (item.verified_defective_qty > 0) {
        try {
          await GoodsMovementItems.create({
            movement_id: stockMovement.movement_id,
            spare_part_id: item.spare_id,
            qty: item.verified_defective_qty,
            condition: 'defective',
            created_at: new Date(),
            updated_at: new Date()
          }, { transaction });
          goodsMovementItemsCreated++;
          console.log(`  ✓ Recorded ${item.verified_defective_qty} defective units of spare ${item.spare_id}`);
        } catch (error) {
          console.error(`  ❌ Error creating defective items record for spare ${item.spare_id}:`, error.message);
          throw new Error(`Failed to create goods movement item for spare ${item.spare_id}: ${error.message}`);
        }
      }
    }

    console.log(`✓ Total goods movement items created: ${goodsMovementItemsCreated}`);

    // Update spare_inventory: Move inventory from technician to service center
    console.log(`\n💾 Updating inventory: Moving from technician ${technicianId} to service center ${serviceCenterId}`);

    for (const item of itemDetails) {
      try {
        // 1. Reduce technician inventory (where location_type='technician' and location_id=technicianId)
        const updateTechResult = await sequelize.query(`
          UPDATE spare_inventory
          SET qty_good = qty_good - ?,
              qty_defective = qty_defective - ?,
              updated_at = GETDATE()
          WHERE spare_id = ?
            AND location_type = 'technician'
            AND location_id = ?
        `, {
          replacements: [
            item.verified_good_qty,
            item.verified_defective_qty,
            item.spare_id,
            technicianId
          ],
          type: QueryTypes.UPDATE,
          transaction
        });

        console.log(`  ✓ Reduced technician inventory for spare ${item.spare_id}`);

        // 2. Check if service center has this inventory, if yes update, if no insert
        const scInventory = await sequelize.query(`
          SELECT spare_inventory_id, qty_good, qty_defective
          FROM spare_inventory
          WHERE spare_id = ?
            AND location_type = 'service_center'
            AND location_id = ?
        `, {
          replacements: [item.spare_id, serviceCenterId],
          type: QueryTypes.SELECT,
          transaction
        });

        if (scInventory && scInventory.length > 0) {
          // Update existing service center inventory
          await sequelize.query(`
            UPDATE spare_inventory
            SET qty_good = qty_good + ?,
                qty_defective = qty_defective + ?,
                updated_at = GETDATE()
            WHERE spare_id = ?
              AND location_type = 'service_center'
              AND location_id = ?
          `, {
            replacements: [
              item.verified_good_qty,
              item.verified_defective_qty,
              item.spare_id,
              serviceCenterId
            ],
            type: QueryTypes.UPDATE,
            transaction
          });

          console.log(`  ✓ Updated service center inventory for spare ${item.spare_id}`);
        } else {
          // Create new service center inventory record
          await sequelize.query(`
            INSERT INTO spare_inventory 
            (spare_id, location_type, location_id, qty_good, qty_defective, created_at, updated_at)
            VALUES (?, 'service_center', ?, ?, ?, GETDATE(), GETDATE())
          `, {
            replacements: [
              item.spare_id,
              serviceCenterId,
              item.verified_good_qty,
              item.verified_defective_qty
            ],
            type: QueryTypes.INSERT,
            transaction
          });

          console.log(`  ✓ Created new service center inventory for spare ${item.spare_id}`);
        }
      } catch (error) {
        console.error(`  ❌ Error updating inventory for spare ${item.spare_id}:`, error.message);
        throw new Error(`Failed to update inventory for spare ${item.spare_id}: ${error.message}`);
      }
    }

    // Update return request status to verified
    console.log(`\n📝 Updating return request status to verified`);
    
    const verifiedStatus = await Status.findOne({
      where: { status_name: 'verified' },
      transaction
    });

    if (!verifiedStatus) {
      console.warn('⚠️ Verified status not found in database, using existing status');
    }

    await returnRequest.update({
      status_id: verifiedStatus ? verifiedStatus.status_id : returnRequest.status_id,
      updated_at: new Date(),
      notes: (returnRequest.notes || '') + `\n\nVerified at ${new Date().toISOString()}\nStock Movement ID: ${stockMovement.movement_id}\n${verified_remarks || ''}`
    }, { transaction });

    // Create approval tracking record
    console.log(`\n📋 Creating approval tracking record`);
    try {
      const approval = await Approvals.create({
        entity_type: 'return_request',
        entity_id: returnRequestId,
        approval_level: 1,
        approver_user_id: verified_by_user_id,
        approval_status: 'approved',
        approval_remarks: `ASC Approved - ${verified_remarks || 'No remarks'}`,
        approved_at: new Date()
      }, { transaction });

      console.log(`   ✓ Approval record created: ${approval.approval_id}`);
    } catch (approvalError) {
      console.warn(`   ⚠️ Warning: Could not create approval record: ${approvalError.message}`);
      // Don't throw error - approval creation is not critical to the main flow
    }

    console.log(`✅ Return request ${returnRequestId} verified successfully`);
    console.log(`   - Stock Movement ID: ${stockMovement.movement_id}`);
    console.log(`   - Total Quantity: ${totalVerifiedQty}`);
    console.log(`   - Goods Movement Items: ${goodsMovementItemsCreated}\n`);

    return {
      return_request_id: returnRequestId,
      status: 'verified',
      stock_movement_id: stockMovement.movement_id,
      total_qty_returned: totalVerifiedQty,
      goods_movement_items_count: goodsMovementItemsCreated
    };
  } catch (error) {
    console.error(`\n❌ Error verifying return request ${returnRequestId}:`, error);
    throw error;
  }
}

/**
 * Reject return request
 */
export async function rejectReturnRequest(returnRequestId, rejectData, transaction) {
  try {
    const { reason, remarks, rejected_by_user_id } = rejectData;

    // Get the return request
    const returnRequest = await SpareRequest.findOne({
      where: { request_id: returnRequestId },
      transaction
    });

    if (!returnRequest) {
      throw new Error('Return request not found');
    }

    // Update status to rejected
    const rejectedStatus = await Status.findOne({
      where: { status_name: 'rejected' },
      transaction
    });

    await returnRequest.update({
      status_id: rejectedStatus ? rejectedStatus.status_id : returnRequest.status_id,
      updated_at: new Date(),
      notes: (returnRequest.notes || '') + `\n\nRejected: ${reason}\n${remarks || ''}`
    }, { transaction });

    // Create rejection approval record
    console.log(`\n📝 Creating rejection record...`);
    try {
      await sequelize.query(`
        INSERT INTO approvals (
          entity_type,
          entity_id,
          approval_level,
          approver_user_id,
          approval_status,
          approval_remarks,
          approved_at,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, 'rejected', ?, GETDATE(), GETDATE(), GETDATE())
      `, { 
        replacements: [
          'return_request',
          returnRequestId,
          1,
          rejected_by_user_id,
          `Rejected - ${reason}. ${remarks || 'No additional remarks'}`
        ],
        transaction
      });
      console.log(`✅ Rejection record created for return request ${returnRequestId}`);
    } catch (approvalError) {
      console.warn(`⚠️ Warning: Could not create rejection record: ${approvalError.message}`);
    }

    console.log(`✅ Return request ${returnRequestId} rejected`);

    return {
      return_request_id: returnRequestId,
      status: 'rejected'
    };
  } catch (error) {
    console.error('Error rejecting return request:', error);
    throw error;
  }
}

/**
 * Get return summary for a technician
 */
export async function getTechnicianReturnSummary(technicianId) {
  try {
    const summary = await sequelize.query(`
      SELECT 
        COUNT(DISTINCT sr.request_id) as total_return_requests,
        SUM(CASE WHEN st.status_name = 'pending' THEN 1 ELSE 0 END) as pending_returns,
        SUM(CASE WHEN st.status_name = 'received' THEN 1 ELSE 0 END) as received_returns,
        SUM(CASE WHEN st.status_name = 'verified' THEN 1 ELSE 0 END) as verified_returns
      FROM spare_requests sr
      LEFT JOIN [status] st ON sr.status_id = st.status_id
      WHERE sr.spare_request_type = '${SPARE_REQUEST_TYPES.TECH_RETURN_DEFECTIVE}'
      AND sr.requested_source_id = ?
    `, { replacements: [technicianId], type: sequelize.QueryTypes.SELECT });

    return summary[0] || {
      total_return_requests: 0,
      pending_returns: 0,
      received_returns: 0,
      verified_returns: 0
    };
  } catch (error) {
    console.error('Error fetching technician return summary:', error);
    throw error;
  }
}

/**
 * Get technician inventory available for return
 */
export async function getTechnicianInventoryForReturn(technicianId) {
  try {
    const inventory = await sequelize.query(`
      SELECT 
        ti.Id,
        ti.Sku,
        ti.SpareName,
        ti.GoodQty as good_qty,
        ti.DefectiveQty as defective_qty,
        (ti.GoodQty + ti.DefectiveQty) as total_qty
      FROM TechnicianInventory ti
      WHERE ti.TechnicianId = ?
      AND (ti.GoodQty > 0 OR ti.DefectiveQty > 0)
      ORDER BY ti.SpareName
    `, { replacements: [technicianId], type: sequelize.QueryTypes.SELECT });

    return inventory;
  } catch (error) {
    console.error('Error fetching technician inventory:', error);
    throw error;
  }
}

export default {
  createReturnRequest,
  getReturnRequestsForServiceCenter,
  getReturnRequestDetails,
  receiveReturnRequest,
  verifyReturnRequest,
  rejectReturnRequest,
  getTechnicianReturnSummary,
  getTechnicianInventoryForReturn
};
