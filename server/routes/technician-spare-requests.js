import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { sequelize } from '../db.js';

const router = express.Router();

/**
 * GET /api/technician-spare-requests/spares
 * Returns all available spare parts for selection in request form
 */
router.get('/spares', authenticateToken, async (req, res) => {
  try {
    const spareParts = await sequelize.query(`
      SELECT DISTINCT
        sp.Id,
        sp.PART,
        sp.DESCRIPTION
      FROM spare_parts sp
      ORDER BY sp.PART ASC
    `, { type: sequelize.QueryTypes.SELECT });

    console.log('✅ Fetched spare parts for form:', spareParts.length);
    res.json({ success: true, data: spareParts });
  } catch (err) {
    console.error('❌ Error fetching spare parts:', err.message);
    res.status(500).json({ error: 'Failed to fetch spare parts', details: err.message });
  }
});

/**
 * GET /api/technician-spare-requests/technicians
 * Returns all technicians assigned to the requesting Service Center
 * Used by Service Center staff to view their technicians
 * NOTE: No longer needed in create flow (technician auto-detects from token)
 */
router.get('/technicians', authenticateToken, async (req, res) => {
  try {
    const serviceCenterId = req.user.centerId || req.user.service_center_id;
    const technicians = await sequelize.query(`
      SELECT DISTINCT
        technician_id,
        name,
        phone
      FROM technicians
      WHERE service_center_id = ?
      ORDER BY name ASC
    `, { replacements: [serviceCenterId], type: sequelize.QueryTypes.SELECT });

    console.log('✅ Fetched technicians for SC:', technicians.length);
    res.json({ success: true, data: technicians });
  } catch (err) {
    console.error('❌ Error fetching technicians:', err.message);
    res.status(500).json({ error: 'Failed to fetch technicians', details: err.message });
  }
});

/**
 * GET /api/technician-spare-requests
 * Returns all spare requests submitted by technicians to this Service Center
 * Only Service Center users can view requests targeted to them
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const serviceCenterId = req.user.centerId || req.user.service_center_id;
    
    console.log('🔍 Fetching spare requests for SC:', serviceCenterId);

    if (!serviceCenterId) {
      return res.status(400).json({ error: 'Service center ID not found' });
    }

    const requests = await sequelize.query(`
      SELECT 
        sr.request_id,
        'REQ-' + CAST(sr.request_id AS VARCHAR) as requestId,
        sr.spare_request_type,
        sr.request_reason,
        COALESCE(t.name, 'Unknown') as technicianName,
        sr.call_id,
        COALESCE(st.status_name, 'pending') as status,
        sr.created_at as createdAt
      FROM spare_requests sr
      LEFT JOIN technicians t ON sr.requested_source_id = t.technician_id
      LEFT JOIN [status] st ON sr.status_id = st.status_id
      WHERE sr.requested_to_id = ?
      ORDER BY sr.created_at DESC
    `, { replacements: [serviceCenterId], type: sequelize.QueryTypes.SELECT });

    console.log('✅ Found:', requests.length, 'requests');

    // Load items for each request
    const data = await Promise.all(requests.map(async (r) => {
      const items = await sequelize.query(`
        SELECT 
          sri.id as spare_request_item_id,
          sri.spare_id,
          sri.requested_qty as quantity_requested,
          COALESCE(sri.approved_qty, 0) as approved_qty,
          COALESCE(sp.PART, 'Unknown') as spare_part_code,
          COALESCE(sp.DESCRIPTION, 'Unknown') as spare_part_name,
          COALESCE(si.qty_good, 0) as qty_good,
          COALESCE(si.qty_defective, 0) as qty_defective,
          COALESCE(si.qty_in_transit, 0) as qty_in_transit,
          (COALESCE(si.qty_good, 0) + COALESCE(si.qty_defective, 0) + COALESCE(si.qty_in_transit, 0)) as total_qty,
          COALESCE(si.qty_good, 0) as available_qty
        FROM spare_request_items sri
        LEFT JOIN spare_parts sp ON sri.spare_id = sp.Id
        LEFT JOIN spare_inventory si ON sri.spare_id = si.spare_id 
          AND si.location_type = 'service_center' 
          AND si.location_id = ?
        WHERE sri.request_id = ?
      `, { replacements: [serviceCenterId, r.request_id], type: sequelize.QueryTypes.SELECT });

      return {
        id: r.request_id,
        requestId: r.requestId,
        spare_request_type: r.spare_request_type,
        request_reason: r.request_reason,
        technicianName: r.technicianName,
        call_id: r.call_id,
        status: r.status,
        createdAt: r.createdAt,
        items: items.map(i => {
          let availabilityStatus = 'not_available';
          if (i.qty_good >= i.quantity_requested) {
            availabilityStatus = 'fully_available';
          } else if (i.qty_good > 0) {
            availabilityStatus = 'partially_available';
          }
          
          return {
            spare_request_item_id: i.spare_request_item_id,
            spare_id: i.spare_id,
            spare_part_code: i.spare_part_code,
            spare_part_name: i.spare_part_name,
            quantity_requested: i.quantity_requested,
            approved_qty: i.approved_qty,
            qty_good: i.qty_good,
            qty_defective: i.qty_defective,
            qty_in_transit: i.qty_in_transit,
            total_qty: i.total_qty,
            available_qty: i.available_qty,
            availability_status: availabilityStatus
          };
        })
      };
    }));

    res.json({ success: true, data, count: data.length });

  } catch (err) {
    console.error('❌ Error:', err);
    console.error('Stack:', err.stack);
    res.status(500).json({ error: 'Failed to fetch requests', details: err.message || err.toString() });
  }
});

/**
 * GET /api/technician-spare-requests/:requestId
 */
router.get('/:requestId', authenticateToken, async (req, res) => {
  try {
    const serviceCenterId = req.user.centerId || req.user.service_center_id;
    const { requestId } = req.params;

    const requests = await sequelize.query(`
      SELECT TOP 1
        sr.request_id,
        'REQ-' + CAST(sr.request_id AS VARCHAR) as requestId,
        sr.request_type,
        sr.request_reason,
        COALESCE(t.name, 'Unknown') as technicianName,
        sr.call_id,
        COALESCE(st.status_name, 'pending') as status,
        sr.created_at as createdAt
      FROM spare_requests sr
      LEFT JOIN technicians t ON sr.requested_source_id = t.technician_id
      LEFT JOIN [status] st ON sr.status_id = st.status_id
      WHERE sr.request_id = ? AND sr.requested_to_id = ?
    `, { replacements: [requestId, serviceCenterId], type: sequelize.QueryTypes.SELECT });

    if (!requests.length) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const r = requests[0];
    const items = await sequelize.query(`
      SELECT 
        sri.id as spare_request_item_id,
        sri.spare_id,
        sri.requested_qty as quantity_requested,
        COALESCE(sri.approved_qty, 0) as approved_qty,
        COALESCE(sp.PART, 'Unknown') as spare_part_code,
        COALESCE(sp.DESCRIPTION, 'Unknown') as spare_part_name,
        COALESCE(si.qty_good, 0) as available_qty
      FROM spare_request_items sri
      LEFT JOIN spare_parts sp ON sri.spare_id = sp.Id
      LEFT JOIN spare_inventory si ON sri.spare_id = si.spare_id 
        AND si.location_type = 'service_center' 
        AND si.location_id = ?
      WHERE sri.request_id = ?
    `, { replacements: [serviceCenterId, requestId], type: sequelize.QueryTypes.SELECT });

    res.json({ 
      success: true, 
      data: {
        id: r.request_id,
        requestId: r.requestId,
        request_type: r.request_type,
        request_reason: r.request_reason,
        technicianName: r.technicianName,
        call_id: r.call_id,
        status: r.status,
        createdAt: r.createdAt,
        items: items.map(i => {
          let availabilityStatus = 'not_available';
          if (i.available_qty >= i.quantity_requested) {
            availabilityStatus = 'fully_available';
          } else if (i.available_qty > 0) {
            availabilityStatus = 'partially_available';
          }
          
          return {
            spare_request_item_id: i.spare_request_item_id,
            spare_id: i.spare_id,
            spare_part_code: i.spare_part_code,
            spare_part_name: i.spare_part_name,
            quantity_requested: i.quantity_requested,
            approved_qty: i.approved_qty,
            available_qty: i.available_qty,
            availability_status: availabilityStatus
          };
        })
      }
    });

  } catch (err) {
    console.error('❌ Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch request', details: err.message });
  }
});

/**
 * POST /api/technician-spare-requests/create
 * Creates a new spare request from a technician
 * The technician submits the request, which goes to their assigned Service Center
 */
router.post('/create', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { call_id, request_type, request_reason, items } = req.body;

    console.log('🆕 Technician creating spare request:', { userId, call_id });

    // Validate input
    if (!call_id) {
      return res.status(400).json({ error: 'call_id required' });
    }
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items array required with at least one item' });
    }

    // Validate all items have required fields
    for (const item of items) {
      if (!item.spare_id || !item.quantity || item.quantity < 1) {
        return res.status(400).json({ error: 'Each item must have spare_id and quantity >= 1' });
      }
    }

    // Step 1: Get technician details from user_id
    console.log('🔍 Step 1: Get technician details...');
    const techDetails = await sequelize.query(`
      SELECT 
        technician_id,
        service_center_id,
        name
      FROM technicians
      WHERE user_id = ?
    `, { replacements: [userId], type: sequelize.QueryTypes.SELECT });

    if (!techDetails.length) {
      return res.status(400).json({ error: 'Technician record not found. User must be assigned as a technician.' });
    }

    const { technician_id, service_center_id } = techDetails[0];
    console.log(`✅ Found technician ${technician_id} assigned to Service Center ${service_center_id}`);

    // Get pending status ID
    const pendingStatus = await sequelize.query(`
      SELECT status_id FROM [status] WHERE status_name = 'pending'
    `, { replacements: [], type: sequelize.QueryTypes.SELECT });

    if (!pendingStatus.length) {
      return res.status(500).json({ error: 'System error: pending status not found' });
    }

    const pendingStatusId = pendingStatus[0].status_id;

    // Create spare_request record
    console.log('📝 Creating spare_request record...');
    const requestResult = await sequelize.query(`
      INSERT INTO spare_requests (
        request_type,
        spare_request_type,
        request_reason,
        requested_source_id,
        requested_source_type,
        requested_to_id,
        requested_to_type,
        status_id,
        created_by,
        created_at,
        updated_at
      )
      OUTPUT inserted.request_id
      VALUES (
        ?,
        'TECH_ISSUE',
        ?,
        ?,
        'technician',
        ?,
        'service_center',
        ?,
        ?,
        GETDATE(),
        GETDATE()
      )
    `, { replacements: [request_type || 'spare_request', request_reason || '', technician_id, service_center_id, pendingStatusId, userId], type: sequelize.QueryTypes.SELECT });

    const requestId = requestResult && requestResult[0] ? requestResult[0].request_id : null;

    if (!requestId) {
      return res.status(500).json({ error: 'Failed to create request - no request_id returned' });
    }

    console.log('✅ Request created with ID:', requestId);

    // Update spare_requests to set call_id if table has that column
    try {
      await sequelize.query(`
        UPDATE spare_requests SET call_id = ? WHERE request_id = ?
      `, { replacements: [call_id, requestId] });
    } catch (e) {
      console.log('⚠️ Note: call_id column might not exist or update failed, continuing...');
    }

    // Create spare_request_items records
    console.log('📦 Creating spare_request_items...');
    for (const item of items) {
      await sequelize.query(`
        INSERT INTO spare_request_items (
          request_id,
          spare_id,
          requested_qty,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, GETDATE(), GETDATE())
      `, { replacements: [requestId, item.spare_id, item.quantity] });
      
      console.log(`  ✅ Item created: spare_id=${item.spare_id}, qty=${item.quantity}`);
    }

    console.log('✅ All items created successfully');

    res.json({ 
      success: true, 
      message: 'Spare request created successfully!',
      data: { 
        requestId: requestId,
        requestRef: 'REQ-' + requestId
      }
    });

  } catch (err) {
    console.error('❌ Error creating request:', err.message);
    console.error('Stack:', err.stack);
    res.status(500).json({ 
      error: 'Failed to create spare request', 
      details: err.message
    });
  }
});

/**
 * POST /api/technician-spare-requests/:requestId/approve
 * Creates stock movements and updates inventories
 * Transfers spares from ASC inventory to technician inventory
 */
router.post('/:requestId/approve', authenticateToken, async (req, res) => {
  try {
    const serviceCenterId = req.user.centerId || req.user.service_center_id;
    const { requestId } = req.params;
    const { approvedItems } = req.body;
    const approverId = req.user.id;

    console.log('🔍 Approval request:', { requestId, serviceCenterId, approverId, approvedItems });

    // Validate input
    if (!approvedItems || !approvedItems.length) {
      return res.status(400).json({ error: 'approvedItems required' });
    }

    if (!approverId) {
      return res.status(400).json({ error: 'Approver ID not found' });
    }

    // Verify request exists and belongs to this service center
    const requestCheck = await sequelize.query(`
      SELECT sr.request_id, sr.requested_to_id, sr.requested_source_id, sr.requested_source_type, sr.status_id
      FROM spare_requests sr
      WHERE sr.request_id = ?
    `, { replacements: [requestId], type: sequelize.QueryTypes.SELECT });

    if (!requestCheck.length) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const request = requestCheck[0];
    if (request.requested_to_id !== serviceCenterId) {
      return res.status(403).json({ error: 'Not authorized to approve this request' });
    }

    console.log('✅ Request verified:', request);

    // Get technician ID from requested_source_id
    const technicianId = request.requested_source_id;
    if (!technicianId) {
      return res.status(400).json({ error: 'Technician ID not found in request' });
    }

    // Get approved status ID
    const approvedStatus = await sequelize.query(`
      SELECT status_id FROM [status] WHERE status_name = 'approved'
    `, { replacements: [], type: sequelize.QueryTypes.SELECT });

    if (!approvedStatus.length) {
      return res.status(500).json({ error: 'System error: approved status not found' });
    }

    const approvedStatusId = approvedStatus[0].status_id;
    console.log('✅ Approved status found:', approvedStatusId);

    // Validate all items exist and get spare_id
    const itemIds = approvedItems.map(item => item.spare_request_item_id);
    const itemCheck = await sequelize.query(`
      SELECT id, spare_id, requested_qty FROM spare_request_items 
      WHERE id IN (${itemIds.join(',')}) AND request_id = ?
    `, { replacements: [requestId], type: sequelize.QueryTypes.SELECT });

    if (itemCheck.length !== itemIds.length) {
      return res.status(400).json({ error: `Invalid items: expected ${itemIds.length}, found ${itemCheck.length}` });
    }

    console.log('✅ All items valid');

    // Calculate total quantity
    let totalQty = 0;
    approvedItems.forEach(item => {
      if (item.approvedQty > 0) {
        totalQty += item.approvedQty;
      }
    });

    // CREATE ONE SINGLE STOCK MOVEMENT FOR ALL ITEMS
    console.log('📦 Creating single stock movement for all approved items...');
    console.log('📊 Total items to process:', approvedItems.length);
    console.log('📊 Total quantity:', totalQty);
    
    const movementResult = await sequelize.query(`
      INSERT INTO stock_movement (
        movement_type,
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
      OUTPUT inserted.movement_id
      VALUES (
        'transfer',
        'spare_request',
        'REQ-' + CAST(? AS VARCHAR),
        'service_center',
        ?,
        'technician',
        ?,
        ?,
        GETDATE(),
        ?,
        'completed',
        GETDATE(),
        GETDATE()
      )
    `, { replacements: [requestId, serviceCenterId, technicianId, totalQty, approverId], type: sequelize.QueryTypes.SELECT });

    const movementId = movementResult && movementResult[0] ? movementResult[0].movement_id : null;
    
    if (!movementId) {
      return res.status(500).json({ error: 'Failed to create stock movement' });
    }

    console.log(`✅ Single stock movement created with ID: ${movementId}`);
    
    const processedItems = [];
    const failedItems = [];

    // NOW PROCESS EACH ITEM - UPDATE INVENTORY AND CREATE GOODS_MOVEMENT_ITEMS
    for (const item of approvedItems) {
      if (item.approvedQty <= 0) {
        console.log(`⏭️ Skipping item ${item.spare_request_item_id}: approved qty is 0`);
        continue;
      }
      
      try {
        const itemSpareId = itemCheck.find(ic => ic.id === item.spare_request_item_id).spare_id;
        const requestedQty = itemCheck.find(ic => ic.id === item.spare_request_item_id).requested_qty;
        
        console.log(`\n  🔄 Processing item ${item.spare_request_item_id} (spare_id: ${itemSpareId}, qty: ${item.approvedQty})`);

        // 1. Update spare_request_items with approved_qty
        console.log(`    1️⃣ Updating spare_request_items: approved_qty = ${item.approvedQty}`);
        await sequelize.query(`
          UPDATE spare_request_items 
          SET approved_qty = ?, updated_at = GETDATE()
          WHERE id = ?
        `, { replacements: [item.approvedQty, item.spare_request_item_id] });

        // 2. Insert into goods_movement_items (using the single movement_id)
        console.log(`    2️⃣ Creating goods_movement_items entry for movement ${movementId}`);
        await sequelize.query(`
          INSERT INTO goods_movement_items (
            movement_id,
            spare_part_id,
            qty,
            condition,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, 'good', GETDATE(), GETDATE())
        `, { replacements: [movementId, itemSpareId, item.approvedQty] });
        console.log(`    ✅ Goods movement item created for spare_part_id: ${itemSpareId}, qty: ${item.approvedQty}`);

        // 3. Update ASC inventory (decrease)
        console.log(`    3️⃣ Updating ASC inventory: -${item.approvedQty}`);
        await sequelize.query(`
          UPDATE spare_inventory 
          SET qty_good = qty_good - ?, updated_at = GETDATE()
          WHERE spare_id = ? AND location_type = 'service_center' AND location_id = ?
        `, { replacements: [item.approvedQty, itemSpareId, serviceCenterId] });

        // 4. Update or create technician inventory (increase)
        console.log(`    4️⃣ Updating technician inventory: +${item.approvedQty}`);
        
        // Check if technician inventory exists
        const techInventory = await sequelize.query(`
          SELECT spare_inventory_id FROM spare_inventory
          WHERE spare_id = ? AND location_type = 'technician' AND location_id = ?
        `, { replacements: [itemSpareId, technicianId], type: sequelize.QueryTypes.SELECT });

        if (techInventory.length > 0) {
          // Update existing inventory
          await sequelize.query(`
            UPDATE spare_inventory 
            SET qty_good = qty_good + ?, updated_at = GETDATE()
            WHERE spare_id = ? AND location_type = 'technician' AND location_id = ?
          `, { replacements: [item.approvedQty, itemSpareId, technicianId] });
        } else {
          // Create new technician inventory record
          await sequelize.query(`
            INSERT INTO spare_inventory (spare_id, location_type, location_id, qty_good, qty_defective, created_at, updated_at)
            VALUES (?, 'technician', ?, ?, 0, GETDATE(), GETDATE())
          `, { replacements: [itemSpareId, technicianId, item.approvedQty] });
        }

        console.log(`    ✅ Item ${item.spare_request_item_id} processed successfully`);
        processedItems.push(item.spare_request_item_id);

      } catch (itemErr) {
        console.error(`    ❌ Error processing item ${item.spare_request_item_id}:`, itemErr.message);
        failedItems.push({ itemId: item.spare_request_item_id, error: itemErr.message });
      }
    }

    // 5. Update request status to approved
    console.log('\n📝 Updating request status to approved...');
    await sequelize.query(`
      UPDATE spare_requests 
      SET status_id = ?, updated_at = GETDATE()
      WHERE request_id = ?
    `, { replacements: [approvedStatusId, requestId] });

    console.log('✅ Request status updated');
    // 6. Create approval record for the request
    console.log('\\n📝 Creating approval record...');
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
        VALUES (?, ?, ?, ?, 'approved', ?, GETDATE(), GETDATE(), GETDATE())
      `, { replacements: ['spare_request', requestId, 1, approverId, `Approved by ASC - ${approvedItems.length} items approved`] });
      console.log(`✅ Created approval record for request ${requestId}`);
    } catch (approvalErr) {
      console.warn(`⚠️ Warning: Could not create approval record: ${approvalErr.message}`);
    }
    console.log(`\n📊 Summary: Processed ${processedItems.length} items successfully`);
    if (failedItems.length > 0) {
      console.log(`⚠️ Failed items: ${failedItems.length}`);
      failedItems.forEach(f => console.log(`   - Item ${f.itemId}: ${f.error || f.reason}`));
    }

    res.json({ 
      success: true, 
      message: 'Spares approved successfully! Stock movements created.',
      approvedCount: approvedItems.length,
      processedCount: processedItems.length,
      failedCount: failedItems.length,
      failedItems: failedItems.length > 0 ? failedItems : undefined,
      status: 'approved'
    });

  } catch (err) {
    console.error('❌ Error during approval:', err.message);
    console.error('Stack:', err.stack);
    res.status(500).json({ 
      error: 'Failed to approve', 
      details: err.message
    });
  }
});

/**
 * POST /api/technician-spare-requests/:requestId/reject
 */
router.post('/:requestId/reject', authenticateToken, async (req, res) => {
  try {
    const { requestId } = req.params;
    const { reason } = req.body;

    if (!reason) return res.status(400).json({ error: 'Reason required' });

    console.log('✅ Rejecting request:', requestId);

    // Get items
    const items = await sequelize.query(`
      SELECT id FROM spare_request_items WHERE request_id = ?
    `, { replacements: [requestId], type: sequelize.QueryTypes.SELECT });

    // Create rejection record
    try {
      await sequelize.query(`
        INSERT INTO approvals (entity_type, entity_id, approval_level, approver_user_id, approval_status, approval_remarks, approved_at, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'rejected', ?, GETDATE(), GETDATE(), GETDATE())
      `, { replacements: ['spare_request', requestId, 1, req.user.id, reason] });
      console.log(`✅ Created rejection record for request ${requestId}`);
    } catch (approvalErr) {
      console.warn(`⚠️ Warning: Could not create rejection record: ${approvalErr.message}`);
    }

    // Update status
    await sequelize.query(`
      UPDATE spare_requests SET status_id = (SELECT status_id FROM [status] WHERE status_name = 'rejected')
      WHERE request_id = ?
    `, { replacements: [requestId] });

    res.json({ success: true, message: 'Rejected' });

  } catch (err) {
    console.error('❌ Error:', err.message);
    res.status(500).json({ error: 'Failed to reject', details: err.message });
  }
});

/**
 * GET /api/technician-spare-requests/service-center/inventory
 * Get all technician inventory for a service center
 */
router.get('/service-center/inventory', authenticateToken, async (req, res) => {
  try {
    const serviceCenterId = req.user.centerId || req.user.service_center_id;
    
    if (!serviceCenterId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    console.log('📋 Fetching technician inventory for service center:', serviceCenterId);

    // Get all technicians for this service center
    const technicians = await sequelize.query(`
      SELECT 
        technician_id as Id,
        name as Name,
        email as Email,
        mobile_no as MobileNo
      FROM technicians
      WHERE service_center_id = ?
      ORDER BY name
    `, { replacements: [serviceCenterId], type: sequelize.QueryTypes.SELECT });

    console.log(`Found ${technicians.length} technicians`);

    // For each technician, get their inventory
    const result = [];
    
    for (const tech of technicians) {
      const inventory = await sequelize.query(`
        SELECT 
          si.spare_inventory_id,
          si.spare_id,
          sp.PART,
          sp.DESCRIPTION,
          si.qty_good,
          si.qty_defective,
          (si.qty_good + si.qty_defective) as total_qty,
          si.created_at,
          si.updated_at
        FROM spare_inventory si
        LEFT JOIN spare_parts sp ON si.spare_id = sp.Id
        WHERE si.location_type = 'technician' 
        AND si.location_id = ?
        AND si.qty_good > 0
        ORDER BY sp.PART
      `, { replacements: [tech.Id], type: sequelize.QueryTypes.SELECT });

      result.push({
        technician_id: tech.Id,
        technician_name: tech.Name,
        technician_email: tech.Email,
        technician_mobile: tech.MobileNo,
        inventory: inventory
      });
    }

    console.log(`✅ Retrieved inventory for ${result.length} technicians`);

    res.json({ 
      success: true, 
      service_center_id: serviceCenterId,
      technicians: result,
      total_technicians: result.length
    });

  } catch (err) {
    console.error('❌ Error fetching technician inventory:', err.message);
    res.status(500).json({ error: 'Failed to fetch inventory', details: err.message });
  }
});

export default router;

