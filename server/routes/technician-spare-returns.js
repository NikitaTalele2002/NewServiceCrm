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
 * Technician submits a spare return request with defective and unused spares
 */
router.post('/create', authenticateToken, async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const userId = req.user.id;
    const { callId, items, remarks } = req.body;

    console.log('\n' + '='.repeat(60));
    console.log('🆕 TECHNICIAN SPARE RETURN REQUEST');
    console.log('='.repeat(60));

    // Validate input
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'At least one spare must be included in the return' });
    }

    // Get technician details and assigned service center
    console.log('\n🔍 Step 1: Verify technician and service center...');
    
    const techDetails = await sequelize.query(`
      SELECT 
        t.technician_id,
        t.name as technician_name,
        t.service_center_id,
        sc.asc_id,
        sc.asc_name
      FROM technicians t
      LEFT JOIN service_centers sc ON t.service_center_id = sc.asc_id
      WHERE t.user_id = ?
    `, { replacements: [userId], type: QueryTypes.SELECT });

    if (!techDetails || !techDetails.length) {
      await transaction.rollback();
      return res.status(403).json({ error: 'Technician profile not found' });
    }

    const tech = techDetails[0];
    const technicianId = tech.technician_id;
    const serviceCenterId = tech.service_center_id || tech.asc_id;

    if (!serviceCenterId) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Service Center not assigned to this technician' });
    }

    console.log(`✅ Technician verified: ${tech.technician_name} (ID: ${technicianId})`);
    console.log(`✅ Service Center: ${tech.asc_name} (ID: ${serviceCenterId})`);

    // Validate call if provided
    if (callId) {
      console.log('\n🔍 Step 2: Validate call assignment...');
      const callCheck = await sequelize.query(`
        SELECT c.call_id, c.call_number
        FROM calls c
        WHERE c.call_id = ?
          AND c.assigned_asc_id = (SELECT service_center_id FROM technicians WHERE technician_id = ?)
      `, { replacements: [callId, technicianId], type: QueryTypes.SELECT });

      if (!callCheck || callCheck.length === 0) {
        await transaction.rollback();
        return res.status(403).json({ error: 'This call is not assigned to your service center' });
      }
      console.log(`✅ Call validated: ${callCheck[0].call_number}`);
    }

    // Generate return request number
    const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const returnNumber = `TSR-${timestamp}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    console.log('\n📦 Step 3: Create return request and items...');

    // Create main return request
    const [returnReq] = await sequelize.query(`
      INSERT INTO technician_spare_returns (
        call_id,
        technician_id,
        service_center_id,
        return_number,
        return_status,
        remarks,
        created_by,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, GETDATE(), GETDATE())
      
      SELECT return_id FROM technician_spare_returns WHERE return_number = ?
    `, {
      replacements: [
        callId || null,
        technicianId,
        serviceCenterId,
        returnNumber,
        'submitted',  // Directly submit instead of draft
        remarks || null,
        userId,
        returnNumber
      ],
      type: QueryTypes.SELECT,
      transaction
    });

    const returnId = returnReq?.return_id;
    if (!returnId) {
      await transaction.rollback();
      return res.status(500).json({ error: 'Failed to create return request' });
    }

    console.log(`✅ Return request created: ${returnNumber} (ID: ${returnId})`);

    // Add items to return request
    let goodSpareCount = 0;
    let defectiveSpareCount = 0;

    for (const item of items) {
      const { spareId, itemType, requestedQty, defectReason } = item;

      // Validate spare exists
      const spare = await sequelize.query(`
        SELECT Id, PART, DESCRIPTION FROM spare_parts WHERE Id = ?
      `, { replacements: [spareId], type: QueryTypes.SELECT, transaction });

      if (!spare || spare.length === 0) {
        await transaction.rollback();
        return res.status(400).json({ error: `Spare part ${spareId} not found` });
      }

      // Insert return item
      await sequelize.query(`
        INSERT INTO technician_spare_return_items (
          return_id,
          spare_id,
          item_type,
          requested_qty,
          received_qty,
          verified_qty,
          defect_reason,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, 0, 0, ?, GETDATE(), GETDATE())
      `, {
        replacements: [
          returnId,
          spareId,
          itemType,
          requestedQty,
          defectReason || null
        ],
        transaction
      });

      if (itemType === 'defective') {
        defectiveSpareCount += requestedQty;
      } else {
        goodSpareCount += requestedQty;
      }

      console.log(`   ✅ Added ${spare[0].DESCRIPTION} (${itemType}): ${requestedQty} qty`);
    }

    await transaction.commit();

    console.log(`\n✅ Spare return request created successfully!`);
    console.log(`   Return Number: ${returnNumber}`);
    console.log(`   Defective spares: ${defectiveSpareCount}`);
    console.log(`   Unused spares: ${goodSpareCount}`);

    res.json({
      success: true,
      returnId,
      returnNumber,
      status: 'submitted',
      message: 'Spare return request submitted successfully',
      summary: {
        defectiveCount: defectiveSpareCount,
        unusedCount: goodSpareCount,
        totalItems: items.length
      }
    });

  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error creating spare return request:', error);
    res.status(500).json({ 
      error: 'Failed to create spare return request',
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

    let query = `
      SELECT 
        tsr.return_id,
        tsr.return_number,
        tsr.call_id,
        tsr.technician_id,
        tsr.service_center_id,
        tsr.return_status,
        tsr.return_date,
        tsr.received_date,
        tsr.verified_date,
        tsr.remarks,
        tsr.created_at,
        t.name as technician_name,
        sc.asc_name as service_center_name,
        (SELECT COUNT(*) FROM technician_spare_return_items 
         WHERE return_id = tsr.return_id) as item_count
      FROM technician_spare_returns tsr
      LEFT JOIN technicians t ON tsr.technician_id = t.technician_id
      LEFT JOIN service_centers sc ON tsr.service_center_id = sc.asc_id
      WHERE t.user_id = ?
    `;

    const replacements = [userId];

    if (status) {
      query += ' AND tsr.return_status = ?';
      replacements.push(status);
    }

    query += ' ORDER BY tsr.created_at DESC LIMIT ? OFFSET ?';
    replacements.push(limit, offset);

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

    console.log(`📋 Fetching spare return request #${returnId}...`);

    // Check authorization - user must be the technician
    const authCheck = await sequelize.query(`
      SELECT tsr.return_id
      FROM technician_spare_returns tsr
      LEFT JOIN technicians t ON tsr.technician_id = t.technician_id
      WHERE tsr.return_id = ? AND t.user_id = ?
    `, { replacements: [returnId, userId], type: QueryTypes.SELECT });

    if (!authCheck || authCheck.length === 0) {
      return res.status(403).json({ error: 'You do not have access to this return request' });
    }

    // Fetch return details
    const returnDetails = await sequelize.query(`
      SELECT 
        tsr.return_id,
        tsr.return_number,
        tsr.call_id,
        tsr.technician_id,
        tsr.service_center_id,
        tsr.return_status,
        tsr.return_date,
        tsr.received_date,
        tsr.verified_date,
        tsr.remarks,
        tsr.received_remarks,
        tsr.verified_remarks,
        tsr.created_at,
        tsr.updated_at,
        t.name as technician_name,
        sc.asc_name as service_center_name
      FROM technician_spare_returns tsr
      LEFT JOIN technicians t ON tsr.technician_id = t.technician_id
      LEFT JOIN service_centers sc ON tsr.service_center_id = sc.asc_id
      WHERE tsr.return_id = ?
    `, { replacements: [returnId], type: QueryTypes.SELECT });

    if (!returnDetails || returnDetails.length === 0) {
      return res.status(404).json({ error: 'Return request not found' });
    }

    // Fetch return items
    const items = await sequelize.query(`
      SELECT 
        tsri.return_item_id,
        tsri.return_id,
        tsri.spare_id,
        tsri.item_type,
        tsri.requested_qty,
        tsri.received_qty,
        tsri.verified_qty,
        tsri.defect_reason,
        tsri.condition_on_receipt,
        tsri.remarks,
        sp.PART as spare_part_code,
        sp.DESCRIPTION as spare_description,
        sp.BRAND as spare_brand
      FROM technician_spare_return_items tsri
      LEFT JOIN spare_parts sp ON tsri.spare_id = sp.Id
      WHERE tsri.return_id = ?
      ORDER BY tsri.return_item_id
    `, { replacements: [returnId], type: QueryTypes.SELECT });

    res.json({
      success: true,
      return: returnDetails[0],
      items: items,
      itemCount: items.length
    });

  } catch (error) {
    console.error('❌ Error fetching return details:', error);
    res.status(500).json({ 
      error: 'Failed to fetch return details',
      details: error.message 
    });
  }
});

/**
 * GET /api/technician-spare-returns/service-center/:serviceCenterId
 * Fetch all spare return requests for a service center (for rental returns page)
 */
router.get('/service-center/:serviceCenterId', authenticateToken, async (req, res) => {
  try {
    const { serviceCenterId } = req.params;
    const { status = 'submitted', limit = 100, offset = 0 } = req.query;

    console.log(`📋 Fetching spare return requests for SC #${serviceCenterId} (status: ${status})...`);

    let query = `
      SELECT 
        tsr.return_id,
        tsr.return_number,
        tsr.call_id,
        tsr.technician_id,
        tsr.service_center_id,
        tsr.return_status,
        tsr.return_date,
        tsr.received_date,
        tsr.verified_date,
        tsr.remarks,
        tsr.created_at,
        t.name as technician_name,
        t.mobile_no as technician_phone,
        (SELECT COUNT(*) FROM technician_spare_return_items 
         WHERE return_id = tsr.return_id AND item_type = 'defective') as defective_count,
        (SELECT COUNT(*) FROM technician_spare_return_items 
         WHERE return_id = tsr.return_id AND item_type = 'unused') as unused_count
      FROM technician_spare_returns tsr
      LEFT JOIN technicians t ON tsr.technician_id = t.technician_id
      WHERE tsr.service_center_id = ?
    `;

    const replacements = [serviceCenterId];

    if (status) {
      query += ' AND tsr.return_status = ?';
      replacements.push(status);
    }

    query += ' ORDER BY tsr.created_at DESC LIMIT ? OFFSET ?';
    replacements.push(limit, offset);

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
    console.error('❌ Error fetching SC spare return requests:', error);
    res.status(500).json({ 
      error: 'Failed to fetch spare return requests for service center',
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
    console.log('📥 SERVICE CENTER RECEIVING SPARE RETURN');
    console.log('='.repeat(60));

    // Verify the request exists and is in correct status
    const returnReq = await sequelize.query(`
      SELECT * FROM technician_spare_returns WHERE return_id = ?
    `, { replacements: [returnId], type: QueryTypes.SELECT, transaction });

    if (!returnReq || returnReq.length === 0) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Return request not found' });
    }

    if (returnReq[0].return_status !== 'submitted') {
      await transaction.rollback();
      return res.status(400).json({ 
        error: `Cannot receive - return is in ${returnReq[0].return_status} status` 
      });
    }

    console.log(`✅ Return request verified: ${returnReq[0].return_number}`);

    // Update received quantities for each item
    for (const item of items) {
      const { returnItemId, receivedQty } = item;

      await sequelize.query(`
        UPDATE technician_spare_return_items
        SET received_qty = ?,
            updated_at = GETDATE()
        WHERE return_item_id = ?
      `, {
        replacements: [receivedQty, returnItemId],
        transaction
      });
    }

    // Update return status to received
    const now = new Date();
    await sequelize.query(`
      UPDATE technician_spare_returns
      SET return_status = 'received',
          received_date = ?,
          received_by = ?,
          received_remarks = ?,
          updated_at = GETDATE()
      WHERE return_id = ?
    `, {
      replacements: [now, userId, receivedRemarks || null, returnId],
      transaction
    });

    await transaction.commit();

    console.log(`✅ Spare return received successfully`);
    console.log(`   Items received: ${items.length}`);
    console.log(`   Received by: User #${userId}`);

    res.json({
      success: true,
      returnId,
      status: 'received',
      message: 'Spare return received successfully',
      itemsReceived: items.length
    });

  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error receiving spare return:', error);
    res.status(500).json({ 
      error: 'Failed to receive spare return',
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
    console.log('✓ SERVICE CENTER VERIFYING SPARE RETURN');
    console.log('='.repeat(60));

    // Verify the request exists and is in received status
    const returnReq = await sequelize.query(`
      SELECT * FROM technician_spare_returns WHERE return_id = ?
    `, { replacements: [returnId], type: QueryTypes.SELECT, transaction });

    if (!returnReq || returnReq.length === 0) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Return request not found' });
    }

    if (returnReq[0].return_status !== 'received') {
      await transaction.rollback();
      return res.status(400).json({ 
        error: `Cannot verify - return must be in 'received' status` 
      });
    }

    const technicianId = returnReq[0].technician_id;
    const serviceCenterId = returnReq[0].service_center_id;

    console.log(`✅ Return request verified: ${returnReq[0].return_number}`);
    console.log(`   Technician ID: ${technicianId}`);
    console.log(`   Service Center ID: ${serviceCenterId}`);

    // Process each item - update inventory
    console.log('\n💾 Updating inventory...');

    for (const item of items) {
      const { spare_id, verified_qty, item_type } = item;

      console.log(`\n   Processing: Spare ID ${spare_id} (${item_type}, qty: ${verified_qty})`);

      // Get spare details
      const spare = await sequelize.query(`
        SELECT Id, PART, DESCRIPTION FROM spare_parts WHERE Id = ?
      `, { replacements: [spare_id], type: QueryTypes.SELECT, transaction });

      if (!spare || spare.length === 0) {
        console.warn(`   ⚠️ Spare ${spare_id} not found`);
        continue;
      }

      const sparePart = spare[0];

      // 1. Reduce technician inventory (where location_type='technician' and location_id=technicianId)
      console.log(`     Step 1: Reducing technician inventory...`);
      const updateTechResult = await sequelize.query(`
        UPDATE spare_inventory
        SET ${item_type === 'defective' ? 'qty_defective' : 'qty_good'} = 
            ${item_type === 'defective' ? 'qty_defective' : 'qty_good'} - ?,
            updated_at = GETDATE()
        WHERE spare_id = ?
          AND location_type = 'technician'
          AND location_id = ?
      `, {
        replacements: [verified_qty, spare_id, technicianId],
        transaction
      });

      console.log(`     ✓ Technician inventory reduced by ${verified_qty}`);

      // 2. Increase service center inventory (good for unused, defective for defective)
      console.log(`     Step 2: Increasing SC inventory...`);
      const targetQtyField = item_type === 'defective' ? 'qty_defective' : 'qty_good';

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

      if (scInv && scInv.length > 0) {
        // Update existing inventory
        await sequelize.query(`
          UPDATE spare_inventory
          SET ${targetQtyField} = ${targetQtyField} + ?,
              updated_at = GETDATE()
          WHERE spare_id = ?
            AND location_type = 'service_center'
            AND location_id = ?
        `, {
          replacements: [verified_qty, spare_id, serviceCenterId],
          transaction
        });
        console.log(`     ✓ SC inventory updated (${item_type}): +${verified_qty}`);
      } else {
        // Create new inventory record
        const newInvData = {
          qty_good: item_type === 'defective' ? 0 : verified_qty,
          qty_defective: item_type === 'defective' ? verified_qty : 0
        };

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
            newInvData.qty_good,
            newInvData.qty_defective
          ],
          transaction
        });
        console.log(`     ✓ SC inventory created (${item_type}): ${verified_qty}`);
      }

      // Update the return item with verified quantity
      await sequelize.query(`
        UPDATE technician_spare_return_items
        SET verified_qty = ?,
            updated_at = GETDATE()
        WHERE return_id = ? AND spare_id = ?
      `, {
        replacements: [verified_qty, returnId, spare_id],
        transaction
      });
    }

    // Update return status to verified
    const now = new Date();
    await sequelize.query(`
      UPDATE technician_spare_returns
      SET return_status = 'verified',
          verified_date = ?,
          verified_by = ?,
          verified_remarks = ?,
          updated_at = GETDATE()
      WHERE return_id = ?
    `, {
      replacements: [now, userId, verifiedRemarks || null, returnId],
      transaction
    });

    await transaction.commit();

    console.log(`\n✅ Spare return verified successfully`);
    console.log(`   Items verified: ${items.length}`);
    console.log(`   Verified by: User #${userId}`);

    res.json({
      success: true,
      returnId,
      status: 'verified',
      message: 'Spare return verified successfully',
      itemsVerified: items.length
    });

  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error verifying spare return:', error);
    res.status(500).json({ 
      error: 'Failed to verify spare return',
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

    console.log(`🚫 Cancelling spare return request #${returnId}...`);

    const returnReq = await sequelize.query(`
      SELECT return_status FROM technician_spare_returns WHERE return_id = ?
    `, { replacements: [returnId], type: QueryTypes.SELECT, transaction });

    if (!returnReq || returnReq.length === 0) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Return request not found' });
    }

    const currentStatus = returnReq[0].return_status;
    const cancellableStatuses = ['draft', 'submitted'];

    if (!cancellableStatuses.includes(currentStatus)) {
      await transaction.rollback();
      return res.status(400).json({ 
        error: `Cannot cancel return in '${currentStatus}' status. Only draft and submitted can be cancelled.` 
      });
    }

    await sequelize.query(`
      UPDATE technician_spare_returns
      SET return_status = 'cancelled',
          remarks = CONCAT(ISNULL(remarks, ''), ' | Cancelled: ' + ?),
          updated_at = GETDATE()
      WHERE return_id = ?
    `, {
      replacements: [reason || 'No reason provided', returnId],
      transaction
    });

    await transaction.commit();

    console.log(`✅ Return request cancelled successfully`);

    res.json({
      success: true,
      returnId,
      status: 'cancelled',
      message: 'Spare return request cancelled successfully'
    });

  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error cancelling return request:', error);
    res.status(500).json({ 
      error: 'Failed to cancel return request',
      details: error.message 
    });
  }
});

export default router;
