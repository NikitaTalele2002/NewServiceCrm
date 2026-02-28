/**
 * TECHNICIAN SPARE RETURN REQUEST WORKFLOW
 * 
 * Flow:
 * 1. Technician submits spare return request (defective + unused spares)
 * 2. Request appears on Service Center's Rental Returns page (status: submitted)
 * 3. Service Center reviews and receives the spares
 * 4. Service Center verifies quantities and condition
 * 5. Inventory is updated (technician good/defective → service center good/defective)
 * 
 * Statuses:
 * - draft: Initial state, technician can edit
 * - submitted: Submitted to SC, awaiting receive
 * - received: Received at SC, awaiting verification
 * - verified: Verified and inventoried
 * - cancelled: Cancelled by technician or SC
 */

import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { sequelize } from '../db.js';
import { QueryTypes } from 'sequelize';

const router = express.Router();

/**
 * POST /api/technician-spare-returns/create
 * Technician submits a spare request (defective or returns)
 */
router.post('/create', authenticateToken, async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const userId = req.user.id;
    const { callId, items, remarks, requestReason = 'defect', requestType = 'TECH_RETURN_DEFECTIVE' } = req.body;

    console.log('\n' + '='.repeat(60));
    console.log('🆕 TECHNICIAN SPARE REQUEST');
    console.log('='.repeat(60));

    // Validate input
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'At least one spare must be included in the request' });
    }

    // Get technician details
    console.log('\n🔍 Step 1: Verify technician...');
    
    const techDetails = await sequelize.query(`
      SELECT 
        t.technician_id,
        t.name as technician_name,
        t.service_center_id
      FROM technicians t
      WHERE t.user_id = ?
    `, { replacements: [userId], type: QueryTypes.SELECT });

    if (!techDetails || !techDetails.length) {
      await transaction.rollback();
      return res.status(403).json({ error: 'Technician profile not found' });
    }

    const tech = techDetails[0];
    const technicianId = tech.technician_id;
    const serviceCenterId = tech.service_center_id;

    if (!serviceCenterId) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Service Center not assigned to this technician' });
    }

    console.log(`✅ Technician verified: ${tech.technician_name} (ID: ${technicianId})`);
    console.log(`✅ Assigned Service Center ID: ${serviceCenterId}`);

    // Get status_id for 'Pending' status
    const statusResult = await sequelize.query(`
      SELECT TOP 1 status_id FROM status WHERE status_name = 'Pending'
    `, { replacements: [], type: QueryTypes.SELECT });

    if (!statusResult || !statusResult.length) {
      await transaction.rollback();
      return res.status(500).json({ error: 'Status not found' });
    }

    const statusId = statusResult[0].status_id;

    console.log('\n📦 Step 2: Create spare request...');

    // Create main spare request - send to assigned service center, not warehouse
    const createResult = await sequelize.query(`
      INSERT INTO spare_requests (
        call_id,
        spare_request_type,
        requested_source_type,
        requested_source_id,
        requested_to_type,
        requested_to_id,
        request_reason,
        status_id,
        created_by,
        created_at,
        updated_at
      ) VALUES (?, ?, 'technician', ?, 'service_center', ?, ?, ?, ?, GETDATE(), GETDATE())
    `, {
      replacements: [
        callId || null,
        requestType,
        technicianId,
        serviceCenterId,
        requestReason,
        statusId,
        userId
      ],
      transaction
    });

    // Get the inserted request_id
    const [newRequest] = await sequelize.query(`
      SELECT TOP 1 request_id FROM spare_requests 
      WHERE created_by = ? AND created_at = (SELECT MAX(created_at) FROM spare_requests WHERE created_by = ?)
      ORDER BY request_id DESC
    `, { 
      replacements: [userId, userId], 
      type: QueryTypes.SELECT,
      transaction 
    });

    const requestId = newRequest?.request_id;
    if (!requestId) {
      await transaction.rollback();
      return res.status(500).json({ error: 'Failed to create spare request' });
    }

    console.log(`✅ Spare request created (ID: ${requestId})`);

    // Add items to spare request
    let totalItems = 0;

    for (const item of items) {
      const { spareId, requestedQty, condition = 'good' } = item;

      // Validate spare exists
      const spare = await sequelize.query(`
        SELECT Id, PART, DESCRIPTION FROM spare_parts WHERE Id = ?
      `, { replacements: [spareId], type: QueryTypes.SELECT, transaction });

      if (!spare || spare.length === 0) {
        await transaction.rollback();
        return res.status(400).json({ error: `Spare part ${spareId} not found` });
      }

      // Insert request item with condition
      await sequelize.query(`
        INSERT INTO spare_request_items (
          request_id,
          spare_id,
          requested_qty,
          approved_qty,
          condition,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, 0, ?, GETDATE(), GETDATE())
      `, {
        replacements: [
          requestId,
          spareId,
          requestedQty,
          condition
        ],
        transaction
      });

      totalItems += requestedQty;
      console.log(`   ✅ Added ${spare[0].DESCRIPTION}: ${requestedQty} qty (Condition: ${condition})`);
    }

    await transaction.commit();

    console.log(`\n✅ Spare request created successfully!`);
    console.log(`   Request ID: ${requestId}`);
    console.log(`   Total items: ${totalItems}`);

    res.json({
      success: true,
      requestId,
      status: 'Pending',
      message: 'Spare request submitted successfully',
      data: {
        request_id: requestId,
        spare_request_type: requestType,
        created_at: new Date().toISOString(),
        total_items: totalItems
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error creating spare request:', error);
    res.status(500).json({ 
      error: 'Failed to create spare request',
      details: error.message 
    });
  }
});

/**
 * GET /api/technician-spare-returns
 * Fetch all spare return requests for the authenticated technician
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, limit = 50, offset = 0 } = req.query;

    console.log('📋 Fetching spare return requests for technician...');

    // First, find the technician record for this user
    const technicianQuery = `
      SELECT technician_id FROM technicians WHERE user_id = ?
    `;
    
    const [technicianRecord] = await sequelize.query(technicianQuery, {
      replacements: [userId],
      type: QueryTypes.SELECT
    });

    if (!technicianRecord) {
      return res.status(404).json({
        success: false,
        error: 'Technician record not found for this user'
      });
    }

    const technicianId = technicianRecord.technician_id;

    let query = `
      SELECT 
        sr.request_id,
        sr.call_id,
        sr.spare_request_type,
        sr.request_reason,
        sr.status_id,
        st.status_name,
        sr.created_at,
        (SELECT COUNT(*) FROM spare_request_items 
         WHERE request_id = sr.request_id) as item_count
      FROM spare_requests sr
      LEFT JOIN status st ON sr.status_id = st.status_id
      WHERE sr.requested_source_type = 'technician'
        AND sr.requested_source_id = ?
    `;

    const replacements = [technicianId];

    if (status) {
      query += ' AND st.status_name = ?';
      replacements.push(status);
    }

    query += ' ORDER BY sr.created_at DESC OFFSET ? ROWS FETCH NEXT ? ROWS ONLY';
    replacements.push(offset, limit);

    const requests = await sequelize.query(query, {
      replacements,
      type: QueryTypes.SELECT
    });

    res.json({
      success: true,
      data: requests,
      count: requests.length,
      limit,
      offset
    });

  } catch (error) {
    console.error('❌ Error fetching spare return requests:', error);
    res.status(500).json({ 
      error: 'Failed to fetch spare return requests',
      details: error.message 
    });
  }
});

/**
 * GET /api/technician-spare-returns/:returnId
 * Fetch details of a specific spare return request with items
 */
router.get('/:returnId', authenticateToken, async (req, res) => {
  try {
    const { returnId } = req.params;
    const userId = req.user.id;

    console.log(`📋 Fetching spare request #${returnId}...`);

    // Get technician ID for authorization check
    const technicianQuery = `
      SELECT technician_id FROM technicians WHERE user_id = ?
    `;
    
    const [technicianRecord] = await sequelize.query(technicianQuery, {
      replacements: [userId],
      type: QueryTypes.SELECT
    });

    if (!technicianRecord) {
      return res.status(404).json({
        success: false,
        error: 'Technician record not found for this user'
      });
    }

    const technicianId = technicianRecord.technician_id;

    // Check authorization - request must belong to this technician
    const authCheck = await sequelize.query(`
      SELECT request_id
      FROM spare_requests
      WHERE request_id = ? AND requested_source_type = 'technician' AND requested_source_id = ?
    `, { replacements: [returnId, technicianId], type: QueryTypes.SELECT });

    if (!authCheck || authCheck.length === 0) {
      return res.status(403).json({ error: 'You do not have access to this spare request' });
    }

    // Fetch request details
    const requestDetails = await sequelize.query(`
      SELECT 
        sr.request_id,
        sr.call_id,
        sr.spare_request_type,
        sr.request_reason,
        sr.status_id,
        st.status_name,
        sr.created_at,
        sr.updated_at
      FROM spare_requests sr
      LEFT JOIN status st ON sr.status_id = st.status_id
      WHERE sr.request_id = ?
    `, { replacements: [returnId], type: QueryTypes.SELECT });

    if (!requestDetails || requestDetails.length === 0) {
      return res.status(404).json({ error: 'Spare request not found' });
    }

    // Fetch request items
    const items = await sequelize.query(`
      SELECT 
        sri.id,
        sri.request_id,
        sri.spare_id,
        sri.requested_qty,
        sri.approved_qty,
        sri.rejection_reason,
        sri.unit_price,
        sri.line_price,
        sr.PART as spare_part_code,
        sr.DESCRIPTION as spare_description,
        sr.BRAND as spare_brand
      FROM spare_request_items sri
      LEFT JOIN spare_parts sr ON sri.spare_id = sr.Id
      WHERE sri.request_id = ?
      ORDER BY sri.id
    `, { replacements: [returnId], type: QueryTypes.SELECT });

    res.json({
      success: true,
      request: requestDetails[0],
      items: items,
      itemCount: items.length
    });

  } catch (error) {
    console.error('❌ Error fetching request details:', error);
    res.status(500).json({ 
      error: 'Failed to fetch request details',
      details: error.message 
    });
  }
});

/**
 * GET /api/technician-spare-returns/service-center/:serviceCenterId
 * Fetch all spare return requests FOR a service center (where SC is the recipient)
 */
router.get('/service-center/:serviceCenterId', authenticateToken, async (req, res) => {
  try {
    const { serviceCenterId } = req.params;
    const { status, limit = 100, offset = 0 } = req.query;

    console.log(`📋 Fetching spare requests for SC #${serviceCenterId}...`);

    let query = `
      SELECT 
        sr.request_id,
        sr.call_id,
        sr.spare_request_type,
        sr.request_reason,
        sr.status_id,
        st.status_name,
        sr.created_at,
        (SELECT COUNT(*) FROM spare_request_items 
         WHERE request_id = sr.request_id) as item_count
      FROM spare_requests sr
      LEFT JOIN status st ON sr.status_id = st.status_id
      WHERE sr.requested_to_type = 'service_center'
        AND sr.requested_to_id = ?
    `;

    const replacements = [serviceCenterId];

    if (status) {
      query += ' AND st.status_name = ?';
      replacements.push(status);
    }

    query += ' ORDER BY sr.created_at DESC OFFSET ? ROWS FETCH NEXT ? ROWS ONLY';
    replacements.push(offset, limit);

    const requests = await sequelize.query(query, {
      replacements,
      type: QueryTypes.SELECT
    });

    res.json({
      success: true,
      serviceCenterId,
      data: requests,
      count: requests.length,
      limit,
      offset
    });

  } catch (error) {
    console.error('❌ Error fetching SC spare requests:', error);
    res.status(500).json({ 
      error: 'Failed to fetch spare requests for service center',
      details: error.message 
    });
  }
});

/**
 * POST /api/technician-spare-returns/:returnId/receive
 * Service Center receives the spare return request
 */
router.post('/:returnId/receive', authenticateToken, async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { returnId } = req.params;
    const { items, receivedRemarks } = req.body;
    const userId = req.user.id;

    console.log('\n' + '='.repeat(60));
    console.log('📥 SERVICE CENTER RECEIVING SPARE REQUEST');
    console.log('='.repeat(60));

    // Verify the request exists and is in correct status (Pending)
    const spareReq = await sequelize.query(`
      SELECT sr.*, st.status_name FROM spare_requests sr
      LEFT JOIN status st ON sr.status_id = st.status_id
      WHERE sr.request_id = ?
    `, { replacements: [returnId], type: QueryTypes.SELECT, transaction });

    if (!spareReq || spareReq.length === 0) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Spare request not found' });
    }

    if (spareReq[0].status_name !== 'Pending') {
      await transaction.rollback();
      return res.status(400).json({ 
        error: `Cannot receive - request is in ${spareReq[0].status_name} status` 
      });
    }

    console.log(`✅ Spare request verified (ID: ${returnId})`);

    const technicianId = spareReq[0].requested_source_id;
    const serviceCenterId = spareReq[0].requested_to_id;

    console.log(`   Technician ID: ${technicianId}`);
    console.log(`   Service Center ID: ${serviceCenterId}`);

    // Update received quantities for each item
    let totalApprovedQty = 0;
    const receivedItems = [];

    for (const item of items) {
      const { id, approvedQty } = item;

      await sequelize.query(`
        UPDATE spare_request_items
        SET approved_qty = ?,
            updated_at = GETDATE()
        WHERE id = ?
      `, {
        replacements: [approvedQty, id],
        transaction
      });

      totalApprovedQty += approvedQty;
      receivedItems.push(item);
    }

    // Create stock movement for the return (technician → service center)
    // NOTE: bucket, bucket_operation, bucket_impact are NOT set here
    // Each item's condition is tracked in goods_movement_items
    console.log(`\n📊 Creating stock movement for return...`);
    if (totalApprovedQty > 0) {
      try {
        const movementResult = await sequelize.query(`
          INSERT INTO stock_movement (
            stock_movement_type,
            reference_type,
            reference_no,
            source_location_type,
            source_location_id,
            destination_location_type,
            destination_location_id,
            total_qty,
            movement_date,
            created_by,
            status,
            created_at,
            updated_at
          )
          VALUES (
            'TECH_RETURN_TO_SC',
            'spare_request',
            'REQ-' + CAST(? AS VARCHAR),
            'technician',
            ?,
            'service_center',
            ?,
            ?,
            GETDATE(),
            ?,
            'completed',
            GETDATE(),
            GETDATE()
          );
          SELECT SCOPE_IDENTITY() as movement_id;
        `, {
          replacements: [returnId, technicianId, serviceCenterId, totalApprovedQty, userId],
          transaction,
          raw: true
        });

        let movementId = null;
        console.log(`   Debug: movementResult length=${movementResult?.length}, type=${typeof movementResult}`);
        
        if (Array.isArray(movementResult) && movementResult.length > 1) {
          const selectResult = movementResult[1];
          console.log(`   Debug: selectResult=${JSON.stringify(selectResult)}`);
          if (Array.isArray(selectResult) && selectResult.length > 0) {
            movementId = selectResult[0].movement_id || Object.values(selectResult[0])[0];
          }
        } else if (Array.isArray(movementResult) && movementResult.length === 1) {
          // Single result case
          console.log(`   Debug: single result=${JSON.stringify(movementResult[0])}`);
          movementId = movementResult[0].movement_id || Object.values(movementResult[0])[0];
        }

        console.log(`   Extracted movementId: ${movementId}`);
        
        if (movementId && movementId > 0) {
          console.log(`   ✅ Stock movement created: ID=${movementId}`);
          console.log(`      Movement: Technician → Service Center (GOOD)`);
          console.log(`      Type: TECH_RETURN_TO_SC`);
          console.log(`      Total Quantity: ${totalApprovedQty}`);

          // Create goods movement items for each spare
          console.log(`\n📦 Creating goods movement items...`);
          
          // Get the spare details for each item
          for (const item of receivedItems) {
            const { id, approvedQty } = item;
            
            // Get spare_id and condition from spare_request_items
            const itemDetail = await sequelize.query(`
              SELECT spare_id, condition FROM spare_request_items WHERE id = ?
            `, {
              replacements: [id],
              type: QueryTypes.SELECT,
              transaction
            });

            if (itemDetail && itemDetail.length > 0) {
              const spareId = itemDetail[0].spare_id;
              const itemCondition = itemDetail[0].condition || 'good';
              try {
                await sequelize.query(`
                  INSERT INTO goods_movement_items (
                    movement_id, spare_part_id, qty, condition, created_at, updated_at
                  ) VALUES (
                    ?, ?, ?, ?, GETDATE(), GETDATE()
                  )
                `, {
                  replacements: [movementId, spareId, approvedQty, itemCondition],
                  transaction
                });
                console.log(`   ✅ Goods item created: spare_id=${spareId}, qty=${approvedQty}, condition=${itemCondition}`);
              } catch (gmiErr) {
                console.error(`   ⚠️  Error creating goods_movement_item for spare ${spareId}:`, gmiErr.message);
              }
            }
          }
        } else {
          console.log(`   ⚠️  Stock movement created but no ID returned`);
        }
      } catch (mvtErr) {
        console.error(`   ⚠️  Error creating stock movement:`, mvtErr.message);
        // Don't fail the entire operation if stock movement fails
      }
    }

    // Update request status to 'Approved' (representing received status)
    const approvedStatus = await sequelize.query(`
      SELECT TOP 1 status_id FROM status WHERE status_name = 'Approved'
    `, { type: QueryTypes.SELECT, transaction });

    if (approvedStatus && approvedStatus.length > 0) {
      await sequelize.query(`
        UPDATE spare_requests
        SET status_id = ?,
            updated_at = GETDATE()
        WHERE request_id = ?
      `, {
        replacements: [approvedStatus[0].status_id, returnId],
        transaction
      });
    }

    await transaction.commit();

    console.log(`✅ Spare request received successfully`);
    console.log(`   Items received: ${items.length}`);
    console.log(`   Total quantity received: ${totalApprovedQty}`);
    console.log(`   Received by: User #${userId}`);

    res.json({
      success: true,
      requestId: returnId,
      status: 'Approved',
      message: 'Spare request received successfully with stock movement created',
      itemsReceived: items.length,
      totalQuantityReceived: totalApprovedQty,
      stockMovement: {
        description: 'Stock movement created: Technician → Service Center',
        type: 'TECH_RETURN_TO_SC',
        totalQty: totalApprovedQty
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error receiving spare request:', error);
    res.status(500).json({ 
      error: 'Failed to receive spare request',
      details: error.message 
    });
  }
});

/**
 * POST /api/technician-spare-returns/:returnId/verify
 * Service Center verifies quantities and updates inventory
 */
router.post('/:returnId/verify', authenticateToken, async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { returnId } = req.params;
    const { items, verifiedRemarks } = req.body;
    const userId = req.user.id;

    console.log('\n' + '='.repeat(60));
    console.log('✓ SERVICE CENTER VERIFYING SPARE REQUEST');
    console.log('='.repeat(60));

    // Verify the request exists and is in Approved status
    const spareReq = await sequelize.query(`
      SELECT sr.*, st.status_name FROM spare_requests sr
      LEFT JOIN status st ON sr.status_id = st.status_id
      WHERE sr.request_id = ?
    `, { replacements: [returnId], type: QueryTypes.SELECT, transaction });

    if (!spareReq || spareReq.length === 0) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Spare request not found' });
    }

    if (spareReq[0].status_name !== 'Approved') {
      await transaction.rollback();
      return res.status(400).json({ 
        error: `Cannot verify - request must be in 'Approved' status` 
      });
    }

    const technicianId = spareReq[0].requested_source_id;
    const serviceCenterId = spareReq[0].requested_to_id;

    console.log(`✅ Spare request verified (ID: ${returnId})`);
    console.log(`   Technician ID: ${technicianId}`);
    console.log(`   Service Center ID: ${serviceCenterId}`);

    // Process each item - update inventory
    console.log('\n💾 Updating inventory...');

    for (const item of items) {
      const { spare_id, verified_qty } = item;

      console.log(`\n   Processing: Spare ID ${spare_id} (qty: ${verified_qty})`);

      // Get spare details and condition from request items
      const spare = await sequelize.query(`
        SELECT Id, PART, DESCRIPTION FROM spare_parts WHERE Id = ?
      `, { replacements: [spare_id], type: QueryTypes.SELECT, transaction });

      if (!spare || spare.length === 0) {
        console.warn(`   ⚠️ Spare ${spare_id} not found`);
        continue;
      }

      // Get the condition from spare_request_items
      const itemCondition = await sequelize.query(`
        SELECT condition FROM spare_request_items 
        WHERE request_id = ? AND spare_id = ?
      `, { replacements: [returnId, spare_id], type: QueryTypes.SELECT, transaction });

      const condition = (itemCondition && itemCondition.length > 0) ? itemCondition[0].condition : 'good';
      const sparePart = spare[0];

      console.log(`     Condition: ${condition}`);

      // 1. Reduce technician inventory (based on condition)
      console.log(`     Step 1: Reducing technician inventory...`);
      const techUpdateColumn = condition === 'defective' ? 'qty_defective' : 'qty_good';
      const updateTechResult = await sequelize.query(`
        UPDATE spare_inventory
        SET ${techUpdateColumn} = ${techUpdateColumn} - ?,
            updated_at = GETDATE()
        WHERE spare_id = ?
          AND location_type = 'technician'
          AND location_id = ?
      `, {
        replacements: [verified_qty, spare_id, technicianId],
        transaction
      });

      console.log(`     ✓ Technician ${condition} inventory reduced by ${verified_qty}`);

      // 2. Increase service center inventory (based on condition)
      console.log(`     Step 2: Increasing SC inventory...`);

      // Check if SC inventory exists for this spare
      const scInv = await sequelize.query(`
        SELECT spare_inventory_id, qty_good, qty_defective FROM spare_inventory
        WHERE spare_id = ?
          AND location_type = 'service_center'
          AND location_id = ?
      `, {
        replacements: [spare_id, serviceCenterId],
        type: QueryTypes.SELECT,
        transaction
      });

      const scUpdateColumn = condition === 'defective' ? 'qty_defective' : 'qty_good';

      if (scInv && scInv.length > 0) {
        // Update existing inventory
        await sequelize.query(`
          UPDATE spare_inventory
          SET ${scUpdateColumn} = ${scUpdateColumn} + ?,
              updated_at = GETDATE()
          WHERE spare_id = ?
            AND location_type = 'service_center'
            AND location_id = ?
        `, {
          replacements: [verified_qty, spare_id, serviceCenterId],
          transaction
        });
        console.log(`     ✓ SC ${condition} inventory updated: +${verified_qty}`);
      } else {
        // Create new inventory record
        const goodQty = condition === 'good' ? verified_qty : 0;
        const defectiveQty = condition === 'defective' ? verified_qty : 0;
        
        await sequelize.query(`
          INSERT INTO spare_inventory (
            spare_id,
            location_type,
            location_id,
            qty_good,
            qty_defective,
            qty_in_transit,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, 0, GETDATE(), GETDATE())
        `, {
          replacements: [
            spare_id,
            'service_center',
            serviceCenterId,
            goodQty,
            defectiveQty
          ],
          transaction
        });
        console.log(`     ✓ SC inventory created: ${goodQty} good, ${defectiveQty} defective`);
      }

      // Update the request item with verified quantity
      await sequelize.query(`
        UPDATE spare_request_items
        SET approved_qty = ?,
            updated_at = GETDATE()
        WHERE request_id = ? AND spare_id = ?
      `, {
        replacements: [verified_qty, returnId, spare_id],
        transaction
      });
    }

    // Create stock movement for the entire return (technician → service center)
    // NOTE: bucket, bucket_operation, bucket_impact are NOT set here
    // Each item's condition is tracked in goods_movement_items
    console.log('\n📊 Creating stock movement for return...');
    let totalReturnQty = 0;
    const movementItems = [];

    for (const item of items) {
      totalReturnQty += item.verified_qty;
      movementItems.push(item);
    }

    if (totalReturnQty > 0) {
      try {
        const movementResult = await sequelize.query(`
          INSERT INTO stock_movement (
            stock_movement_type,
            reference_type,
            reference_no,
            source_location_type,
            source_location_id,
            destination_location_type,
            destination_location_id,
            total_qty,
            movement_date,
            created_by,
            status,
            created_at,
            updated_at
          )
          VALUES (
            'TECH_RETURN_TO_SC',
            'spare_request',
            'REQ-' + CAST(? AS VARCHAR),
            'technician',
            ?,
            'service_center',
            ?,
            ?,
            GETDATE(),
            ?,
            'completed',
            GETDATE(),
            GETDATE()
          );
          SELECT SCOPE_IDENTITY() as movement_id;
        `, {
          replacements: [returnId, technicianId, serviceCenterId, totalReturnQty, userId],
          transaction,
          raw: true
        });

        let movementId = null;
        
        // Extract SCOPE_IDENTITY() result with multiple fallback patterns
        console.log('\n🔍 Extracting movement_id from SCOPE_IDENTITY()...');
        console.log('   Result type:', typeof movementResult, '| Is Array:', Array.isArray(movementResult));
        if (Array.isArray(movementResult)) {
          console.log('   Result length:', movementResult.length);
          console.log('   Result[0]:', JSON.stringify(movementResult[0]?.slice?.(0, 1) || movementResult[0]));
          if (movementResult.length > 1) {
            console.log('   Result[1]:', JSON.stringify(movementResult[1]?.slice?.(0, 1) || movementResult[1]));
          }
        }
        
        // Pattern 1: Multi-statement result with SELECT as [1]
        if (Array.isArray(movementResult) && movementResult.length > 1) {
          const selectResult = movementResult[1];
          if (Array.isArray(selectResult) && selectResult.length > 0 && selectResult[0].movement_id) {
            movementId = selectResult[0].movement_id;
          }
        }
        
        // Pattern 2: Fallback - Direct array result
        if (!movementId && Array.isArray(movementResult) && movementResult.length > 0) {
          if (movementResult[0]?.movement_id) {
            movementId = movementResult[0].movement_id;
          } else {
            const values = Object.values(movementResult[0] || {});
            if (values.length > 0 && typeof values[0] === 'number' && values[0] > 0) {
              movementId = values[0];
            }
          }
        }
        
        console.log('   Extracted movementId:', movementId, '| Valid:', movementId && movementId > 0);

        if (movementId && movementId > 0) {
          console.log(`   ✅ Stock movement created: ID=${movementId}`);
          console.log(`      Movement: Technician → Service Center (GOOD)`);
          console.log(`      Type: TECH_RETURN_TO_SC`);
          console.log(`      Total Quantity: ${totalReturnQty}`);

          // Create goods movement items for each spare
          console.log(`\n📦 Creating goods movement items...`);
          for (const item of movementItems) {
            try {
              // Get condition from spare_request_items
              const itemCond = await sequelize.query(`
                SELECT condition FROM spare_request_items 
                WHERE request_id = ? AND spare_id = ?
              `, { replacements: [returnId, item.spare_id], type: QueryTypes.SELECT, transaction });
              
              const itemCondition = (itemCond && itemCond.length > 0) ? itemCond[0].condition : 'good';
              
              await sequelize.query(`
                INSERT INTO goods_movement_items (
                  movement_id, spare_part_id, qty, condition, created_at, updated_at
                ) VALUES (
                  ?, ?, ?, ?, GETDATE(), GETDATE()
                )
              `, {
                replacements: [movementId, item.spare_id, item.verified_qty, itemCondition],
                transaction
              });
              console.log(`   ✅ Goods item created: spare_id=${item.spare_id}, qty=${item.verified_qty}, condition=${itemCondition}`);
            } catch (gmiErr) {
              console.error(`   ⚠️  Error creating goods_movement_item for spare ${item.spare_id}:`, gmiErr.message);
            }
          }
        } else {
          console.log(`   ⚠️  Stock movement created but no ID returned`);
        }
      } catch (mvtErr) {
        console.error(`   ⚠️  Error creating stock movement:`, mvtErr.message);
        // Don't fail the entire operation if stock movement fails
      }
    }

    // Update request status to 'Rejected' (mapped as Verified/Completed)
    const rejectedStatus = await sequelize.query(`
      SELECT TOP 1 status_id FROM status WHERE status_name = 'Rejected'
    `, { type: QueryTypes.SELECT, transaction });

    if (rejectedStatus && rejectedStatus.length > 0) {
      await sequelize.query(`
        UPDATE spare_requests
        SET status_id = ?,
            updated_at = GETDATE()
        WHERE request_id = ?
      `, {
        replacements: [rejectedStatus[0].status_id, returnId],
        transaction
      });
    }

    await transaction.commit();

    console.log(`\n✅ Spare request verified successfully`);
    console.log(`   Items verified: ${items.length}`);
    console.log(`   Total quantity returned: ${totalReturnQty}`);
    console.log(`   Verified by: User #${userId}`);

    res.json({
      success: true,
      requestId: returnId,
      status: 'Rejected',
      message: 'Spare request verified successfully with stock movement',
      itemsVerified: items.length,
      totalQuantityReturned: totalReturnQty,
      stockMovement: {
        description: 'Stock movement created: Technician → Service Center',
        type: 'TECH_RETURN_TO_SC',
        totalQty: totalReturnQty
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error verifying spare request:', error);
    res.status(500).json({ 
      error: 'Failed to verify spare request',
      details: error.message 
    });
  }
});

/**
 * POST /api/technician-spare-returns/:returnId/cancel
 * Cancel a spare return request (only in draft/submitted status)
 */
router.post('/:returnId/cancel', authenticateToken, async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { returnId } = req.params;
    const { reason } = req.body;

    console.log(`🚫 Cancelling spare request #${returnId}...`);

    // Get current status name
    const spareReq = await sequelize.query(`
      SELECT sr.*, st.status_name FROM spare_requests sr
      LEFT JOIN status st ON sr.status_id = st.status_id
      WHERE sr.request_id = ?
    `, { replacements: [returnId], type: QueryTypes.SELECT, transaction });

    if (!spareReq || spareReq.length === 0) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Spare request not found' });
    }

    const currentStatus = spareReq[0].status_name;
    const cancellableStatuses = ['Pending', 'Approved'];

    if (!cancellableStatuses.includes(currentStatus)) {
      await transaction.rollback();
      return res.status(400).json({ 
        error: `Cannot cancel request in '${currentStatus}' status. Only Pending and Approved can be cancelled.` 
      });
    }

    // Get Cancelled status
    const cancelledStatus = await sequelize.query(`
      SELECT TOP 1 status_id FROM status WHERE status_name = 'Cancelled'
    `, { type: QueryTypes.SELECT, transaction });

    if (cancelledStatus && cancelledStatus.length > 0) {
      await sequelize.query(`
        UPDATE spare_requests
        SET status_id = ?,
            updated_at = GETDATE()
        WHERE request_id = ?
      `, {
        replacements: [cancelledStatus[0].status_id, returnId],
        transaction
      });
    }

    await transaction.commit();

    console.log(`✅ Spare request cancelled successfully`);

    res.json({
      success: true,
      requestId: returnId,
      status: 'Cancelled',
      message: 'Spare request cancelled successfully'
    });

  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error cancelling request:', error);
    res.status(500).json({ 
      error: 'Failed to cancel spare request',
      details: error.message 
    });
  }
});

export default router;
