/**
 * TECHNICIAN TO SERVICE CENTER SPARE REQUEST WORKFLOW
 * 
 * Flow:
 * 1. Technician submits spare request to their assigned Service Center
 * 2. Request appears on Service Center's Rental Allocation page (status: pending)
 * 3. Service Center reviews inventory availability
 * 4. Service Center approves/rejects the request
 * 5. If approved: Stock movement is created (SC GOOD → TECH GOOD)
 * 6. Technician receives the allocated spares
 */

import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { sequelize } from '../db.js';
import { QueryTypes } from 'sequelize';

const router = express.Router();

/**
 * POST /api/technician-sc-spare-requests/create
 * Technician submits a spare request to their assigned Service Center
 */
router.post('/create', authenticateToken, async (req, res) => {
  try {
    const requestingUser = req.user;
    const { spares, requestReason, callId, remarks } = req.body;

    console.log('\n' + '='.repeat(60));
    console.log('🆕 TECHNICIAN SPARE REQUEST TO SERVICE CENTER');
    console.log('='.repeat(60));
    console.log('📋 Request Data:', { callId, requestReason, spareCount: spares?.length });

    // Validate input
    if (!spares || !Array.isArray(spares) || spares.length === 0) {
      return res.status(400).json({ error: 'At least one spare must be requested' });
    }

    if (!requestReason) {
      return res.status(400).json({ error: 'Request reason is required' });
    }

    // Get technician details and their assigned service center
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
    `, { replacements: [requestingUser.id], type: QueryTypes.SELECT });

    if (!techDetails || !techDetails.length) {
      return res.status(403).json({ error: 'Technician profile not found' });
    }

    const tech = techDetails[0];
    const technicianId = tech.technician_id;
    const serviceCenterId = tech.service_center_id || tech.asc_id;

    if (!serviceCenterId) {
      return res.status(400).json({ error: 'Service Center not assigned to this technician' });
    }

    console.log(`✅ Technician verified: ${tech.technician_name} (ID: ${technicianId})`);
    console.log(`✅ Service Center assigned: ${tech.asc_name} (ID: ${serviceCenterId})`);

    // Step 1.5: Validate call assignment if callId is provided
    if (callId) {
      console.log('\n🔍 Step 1.5: Validate call assignment...');
      const callAssignment = await sequelize.query(`
        SELECT c.call_id, c.call_number
        FROM calls c
        LEFT JOIN call_technician_assignment cta ON c.call_id = cta.call_id
        WHERE c.call_id = ?
          AND cta.technician_id = ?
          AND c.call_status_id NOT IN (
            SELECT status_id FROM [status] WHERE status_name IN ('closed', 'cancelled')
          )
      `, { replacements: [callId, technicianId], type: QueryTypes.SELECT });

      if (!callAssignment || callAssignment.length === 0) {
        return res.status(403).json({ 
          error: `This technician is not assigned to call ${callId} or the call is closed/cancelled` 
        });
      }
      console.log(`✅ Call ${callId} is assigned to this technician`);
    }

    // Validate spare parts exist
    console.log('\n📦 Step 2: Validate spare parts...');
    const spareIds = spares.map(s => s.spareId);
    const validateSpares = await sequelize.query(`
      SELECT Id, PART, BRAND
      FROM spare_parts
      WHERE Id IN (${spareIds.join(',')})
    `, { type: QueryTypes.SELECT });

    if (validateSpares.length !== spareIds.length) {
      return res.status(400).json({ 
        error: `Invalid spares: found ${validateSpares.length}, expected ${spareIds.length}` 
      });
    }

    console.log(`✅ All ${spares.length} spare parts validated`);

    // Get pending status ID
    console.log('\n📊 Step 3: Get status IDs...');
    const pendingStatus = await sequelize.query(`
      SELECT status_id FROM [status] WHERE status_name = 'pending'
    `, { type: QueryTypes.SELECT });

    if (!pendingStatus.length) {
      return res.status(500).json({ error: 'Pending status not found in system' });
    }

    const statusId = pendingStatus[0].status_id;
    console.log(`✅ Pending status ID: ${statusId}`);

    // Create spare request
    console.log('\n📝 Step 4: Create spare request...');
    const createRequest = await sequelize.query(`
      INSERT INTO spare_requests (
        request_type,
        spare_request_type,
        call_id,
        requested_source_type,
        requested_source_id,
        requested_to_type,
        requested_to_id,
        request_reason,
        status_id,
        created_by,
        created_at,
        updated_at
      )
      OUTPUT inserted.request_id
      VALUES (
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        GETDATE(),
        GETDATE()
      )
    `, { 
      replacements: [
        'TECH_ISSUE',
        'TECH_ISSUE',
        callId || null,
        'technician',
        technicianId,
        'service_center',
        serviceCenterId,
        requestReason,
        statusId,
        requestingUser.id
      ],
      type: QueryTypes.SELECT 
    });

    if (!createRequest.length) {
      return res.status(500).json({ error: 'Failed to create spare request' });
    }

    const requestId = createRequest[0].request_id;
    console.log(`✅ Spare request created: REQ-${requestId}`);

    // Verify the request was actually inserted
    const verifyRequest = await sequelize.query(`
      SELECT TOP 1 request_id, spare_request_type, requested_source_id, requested_to_id, status_id
      FROM spare_requests
      WHERE request_id = ?
    `, { replacements: [requestId], type: QueryTypes.SELECT });

    if (!verifyRequest.length) {
      console.error(`❌ CRITICAL: Request created but not found in database - Request ID: ${requestId}`);
      return res.status(500).json({ error: 'Request created but verification failed. Please contact support.' });
    }

    console.log(`✅ Verification passed: Request ${requestId} found in database`);
    console.log(`   Type: ${verifyRequest[0].spare_request_type}`);
    console.log(`   From: ${verifyRequest[0].requested_source_id} (technician)`);
    console.log(`   To: ${verifyRequest[0].requested_to_id} (service center)`);
    console.log(`   Status ID: ${verifyRequest[0].status_id}`);

    // Create spare request items
    console.log('\n📦 Step 5: Create request items...');
    let totalQty = 0;
    const itemResults = [];

    for (const spare of spares) {
      if (!spare.spareId || !spare.quantity || spare.quantity <= 0) {
        console.warn(`⚠️ Invalid spare: spareId=${spare.spareId}, qty=${spare.quantity}`);
        continue;
      }

      totalQty += spare.quantity;

      try {
        const itemResult = await sequelize.query(`
          INSERT INTO spare_request_items (
            request_id,
            spare_id,
            requested_qty,
            created_at,
            updated_at
          )
          OUTPUT inserted.id
          VALUES (?, ?, ?, GETDATE(), GETDATE())
        `, { 
          replacements: [requestId, spare.spareId, spare.quantity],
          type: QueryTypes.SELECT 
        });

        if (!itemResult.length) {
          console.warn(`⚠️ Failed to create item for spare ${spare.spareId}`);
          continue;
        }

        // Verify item was inserted
        const verifyItem = await sequelize.query(`
          SELECT id, spare_id, requested_qty FROM spare_request_items WHERE id = ?
        `, { replacements: [itemResult[0].id], type: QueryTypes.SELECT });

        if (verifyItem.length) {
          itemResults.push({
            itemId: itemResult[0].id,
            spareId: spare.spareId,
            quantity: spare.quantity
          });
          console.log(`  ✅ Item created & verified: Spare ${spare.spareId}, Qty: ${spare.quantity}, ItemID: ${itemResult[0].id}`);
        } else {
          console.warn(`⚠️ Item created but not found on verification: ${itemResult[0].id}`);
        }
      } catch (itemErr) {
        console.error(`❌ Error creating item for spare ${spare.spareId}:`, itemErr.message);
      }
    }

    console.log(`✅ Total items created: ${itemResults.length}, Total quantity: ${totalQty}`);

    // Return success response
    res.json({
      success: true,
      data: {
        requestId,
        requestNumber: `REQ-${requestId}`,
        technicianName: tech.technician_name,
        serviceCenterName: tech.asc_name,
        requestReason,
        itemCount: itemResults.length,
        totalQuantity: totalQty,
        status: 'pending',
        createdAt: new Date(),
        remarks
      },
      message: 'Spare request submitted successfully to Service Center'
    });

  } catch (err) {
    console.error('❌ Error creating spare request:', err.message);
    console.error('Error Code:', err.code);
    console.error('Error SQL:', err.sql);
    console.error('Stack:', err.stack);
    res.status(500).json({ 
      error: 'Failed to create spare request',
      details: err.message,
      code: err.code
    });
  }
});

/**
 * GET /api/technician-sc-spare-requests/rental-allocation
 * Service Center views pending spare requests (Rental Allocation Page)
 * 
 * ✅ FIXED (Feb 26, 2026): 
 *    - Removed hardcoded technician.service_center_id filter that hid requests
 *    - Added support for 'open' status in default filter (now shows pending + open)
 *    - Requests now visible regardless of technician reassignment
 *    - See RENTAL_ALLOCATION_FIX_SUMMARY.md for details
 * 
 * @query {string} status - Filter by status: 'pending', 'open', 'approved', 'allocated', or custom
 *                          Default: both 'pending' and 'open' (active requests)
 * @query {string} dateFrom - Optional: filter from date
 * @query {string} dateTo - Optional: filter to date
 */
router.get('/rental-allocation', authenticateToken, async (req, res) => {
  try {
    const serviceCenterId = req.user.centerId || req.user.service_center_id;
    const { status = 'pending', dateFrom, dateTo } = req.query;

    console.log('\n' + '='.repeat(60));
    console.log('📋 RENTAL ALLOCATION PAGE - PENDING SPARE REQUESTS');
    console.log('='.repeat(60));
    console.log('🎯 Service Center ID:', serviceCenterId);
    console.log('📊 Filter Status:', status);

    if (!serviceCenterId) {
      return res.status(400).json({ error: 'Service Center ID required' });
    }

    // Map status string to database status filter
    // Default: show pending and open statuses (active requests)
    // 'pending', 'open', 'approved', 'allocated', etc. are allowed
    let statusFilter = '';
    
    if (status && status !== 'all' && status !== 'All') {
      if (status === 'pending') {
        statusFilter = 'AND st.status_name = \'pending\'';
      } else if (status === 'approved') {
        statusFilter = 'AND st.status_name = \'approved\'';
      } else if (status === 'allocated') {
        statusFilter = 'AND st.status_name IN (\'approved\', \'allocated\', \'open\')';
      } else if (status === 'open') {
        statusFilter = 'AND st.status_name = \'open\'';
      } else {
        // Custom status filter
        statusFilter = `AND st.status_name = '${status}'`;
      }
    } else {
      // Default: show both 'pending' and 'open' statuses (main active statuses)
      // This ensures requests created (which have 'open' status) are visible
      statusFilter = 'AND st.status_name IN (\'pending\', \'open\')';
    }

    console.log('📊 Applied status filter:', statusFilter);

    // Get all pending spare requests for this service center
    console.log('\n🔍 Fetching requests from database...');
    const requests = await sequelize.query(`
      SELECT 
        sr.request_id,
        'REQ-' + CAST(sr.request_id AS VARCHAR) as requestNumber,
        t.technician_id,
        t.name as technicianName,
        t.mobile_no as technicianPhone,
        t.service_center_id,
        sr.request_reason as reason,
        sr.spare_request_type as requestType,
        st.status_id,
        st.status_name as status,
        sr.call_id as callId,
        sr.created_at as createdAt,
        sr.created_by as createdBy
      FROM spare_requests sr
      LEFT JOIN technicians t ON sr.requested_source_id = t.technician_id
      LEFT JOIN [status] st ON sr.status_id = st.status_id
      WHERE sr.requested_to_id = ?
        AND sr.requested_source_type = 'technician'
        AND sr.requested_to_type = 'service_center'
        ${statusFilter}
      ORDER BY sr.created_at DESC
    `, { replacements: [serviceCenterId], type: QueryTypes.SELECT });

    console.log(`✅ Found ${requests.length} requests`);

    // Fetch items and inventory for each request
    console.log('\n📦 Loading items and inventory details...');
    const enrichedRequests = await Promise.all(
      requests.map(async (req) => {
        // Get spare request items
        const items = await sequelize.query(`
          SELECT 
            sri.id as itemId,
            sri.spare_id as spareId,
            sri.requested_qty as requestedQty,
            COALESCE(sri.approved_qty, 0) as approvedQty,
            sp.PART as partCode,
            sp.DESCRIPTION as partDescription,
            sp.BRAND as brand
          FROM spare_request_items sri
          LEFT JOIN spare_parts sp ON sri.spare_id = sp.Id
          WHERE sri.request_id = ?
          ORDER BY sri.id
        `, { 
          replacements: [req.request_id], 
          type: QueryTypes.SELECT 
        });

        // Get inventory for this service center separately
        const enrichedItems = await Promise.all(
          items.map(async (item) => {
            try {
              const inventory = await sequelize.query(`
                SELECT 
                  COALESCE(qty_good, 0) as availableQty,
                  COALESCE(qty_defective, 0) as defectiveQty,
                  COALESCE(qty_in_transit, 0) as inTransitQty
                FROM spare_inventory 
                WHERE spare_id = ? 
                  AND location_type = 'service_center'
                  AND location_id = ?
              `, { 
                replacements: [item.spareId, serviceCenterId], 
                type: QueryTypes.SELECT 
              });

              const inv = inventory[0] || { availableQty: 0, defectiveQty: 0, inTransitQty: 0 };
              
              // Determine availability status
              let availabilityStatus = 'not_available';
              if (inv.availableQty >= item.requestedQty) {
                availabilityStatus = 'fully_available';
              } else if (inv.availableQty > 0) {
                availabilityStatus = 'partially_available';
              }

              return {
                itemId: item.itemId,
                spareId: item.spareId,
                partCode: item.partCode || 'N/A',
                partDescription: item.partDescription || 'Unknown',
                brand: item.brand || 'N/A',
                requestedQty: item.requestedQty,
                approvedQty: item.approvedQty,
                availableQty: inv.availableQty,
                defectiveQty: inv.defectiveQty,
                inTransitQty: inv.inTransitQty,
                availability_status: availabilityStatus,
                canFullyApprove: inv.availableQty >= item.requestedQty
              };
            } catch (itemErr) {
              console.error('❌ Error getting inventory for item:', item.itemId, itemErr.message);
              return {
                itemId: item.itemId,
                spareId: item.spareId,
                partCode: item.partCode || 'N/A',
                partDescription: item.partDescription || 'Unknown',
                brand: item.brand || 'N/A',
                requestedQty: item.requestedQty,
                approvedQty: item.approvedQty,
                availableQty: 0,
                defectiveQty: 0,
                inTransitQty: 0,
                availability_status: 'not_available',
                canFullyApprove: false
              };
            }
          })
        );

        return {
          requestId: req.request_id,
          requestNumber: req.requestNumber,
          technicianId: req.technician_id,
          technicianName: req.technicianName || 'Unknown Technician',
          technicianPhone: req.technicianPhone,
          reason: req.reason,
          requestType: req.requestType,
          status: req.status || 'pending',
          callId: req.callId,
          createdAt: req.createdAt,
          items: enrichedItems,
          canApprove: enrichedItems.some(item => item.availableQty >= item.requestedQty)
        };
      })
    );

    console.log(`✅ Enriched ${enrichedRequests.length} requests with items and inventory`);

    // Debug logging for Request 22 if found
    const req22 = enrichedRequests.find(r => r.requestId === 22);
    if (req22) {
      console.log('\n🔍 DEBUG: Request 22 being returned:');
      console.log(`   Items count: ${req22.items.length}`);
      if (req22.items.length > 0) {
        console.log(`   First item: partCode="${req22.items[0].partCode}", qty=${req22.items[0].requestedQty}`);
      }
    }

    res.json({
      success: true,
      data: enrichedRequests,
      summary: {
        totalRequests: enrichedRequests.length,
        approvableRequests: enrichedRequests.filter(r => r.canApprove).length,
        partialRequests: enrichedRequests.filter(r => !r.canApprove && r.items.some(i => i.availableQty > 0)).length
      }
    });

  } catch (err) {
    console.error('❌ Error fetching rental allocation requests:', err.message);
    res.status(500).json({ 
      error: 'Failed to fetch requests',
      details: err.message 
    });
  }
});

/**
 * POST /api/technician-sc-spare-requests/:requestId/approve
 * Service Center approves spare request and creates stock movement
 */
router.post('/:requestId/approve', authenticateToken, async (req, res) => {
  try {
    const serviceCenterId = req.user.centerId || req.user.service_center_id;
    const { requestId } = req.params;
    const { approvedItems, remarks } = req.body;
    const approverId = req.user.id;

    console.log('\n' + '='.repeat(60));
    console.log('✅ APPROVING SPARE REQUEST FROM TECHNICIAN');
    console.log('='.repeat(60));
    console.log('📋 Details:', { requestId, serviceCenterId, approverId });

    if (!serviceCenterId) {
      return res.status(400).json({ error: 'Service Center ID required' });
    }

    if (!approvedItems || !Array.isArray(approvedItems) || approvedItems.length === 0) {
      return res.status(400).json({ error: 'At least one item must be approved' });
    }

    // Step 1: Verify request exists and belongs to this service center
    console.log('\n🔍 Step 1: Verify request...');
    const requestCheck = await sequelize.query(`
      SELECT 
        sr.request_id,
        sr.requested_source_id as technicianId,
        sr.requested_to_id,
        sr.status_id,
        st.status_name as status,
        t.name as technicianName
      FROM spare_requests sr
      LEFT JOIN technicians t ON sr.requested_source_id = t.technician_id
      LEFT JOIN [status] st ON sr.status_id = st.status_id
      WHERE sr.request_id = ?
    `, { replacements: [requestId], type: QueryTypes.SELECT });

    if (!requestCheck.length) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const request = requestCheck[0];
    if (request.requested_to_id !== serviceCenterId) {
      return res.status(403).json({ error: 'Not authorized to approve this request' });
    }

    const technicianId = request.technicianId;
    console.log(`✅ Request verified: REQ-${requestId} from technician ${request.technicianName}`);

    // Step 2: Validate all items and check inventory
    console.log('\n📦 Step 2: Validate items and check inventory...');
    // Handle both spare_request_item_id and itemId field names from frontend
    const itemIds = approvedItems.map(item => item.spare_request_item_id || item.itemId);
    console.log('  📋 Item IDs received:', itemIds);
    
    const itemCheck = await sequelize.query(`
      SELECT 
        sri.id as itemId,
        sri.spare_id as spareId,
        sri.requested_qty as requestedQty,
        sp.PART as partCode,
        sp.DESCRIPTION as partDescription,
        COALESCE(si.qty_good, 0) as availableQty
      FROM spare_request_items sri
      LEFT JOIN spare_parts sp ON sri.spare_id = sp.Id
      LEFT JOIN spare_inventory si ON sri.spare_id = si.spare_id 
        AND si.location_type = 'service_center'
        AND si.location_id = ?
      WHERE sri.id IN (${itemIds.join(',')}) AND sri.request_id = ?
    `, { 
      replacements: [serviceCenterId, requestId], 
      type: QueryTypes.SELECT 
    });

    if (itemCheck.length !== itemIds.length) {
      return res.status(400).json({ 
        error: `Invalid items: expected ${itemIds.length}, found ${itemCheck.length}. Check if request ID matches.` 
      });
    }

    // Validate approval quantities
    console.log('  Checking approval quantities...');
    const approvalMap = {};
    approvedItems.forEach(item => {
      const key = item.spare_request_item_id || item.itemId;
      approvalMap[key] = item.approvedQty || 0;
      console.log(`  ✅ Mapping: ${key} -> ${item.approvedQty}`);
    });

    let insufficientInventory = [];
    let validApprovals = [];
    let totalQty = 0;

    for (const item of itemCheck) {
      // Look up the approved quantity using the item ID
      const approvedQty = approvalMap[item.itemId] || 0;
      
      if (approvedQty > 0) {
        if (approvedQty > item.availableQty) {
          insufficientInventory.push({
            itemId: item.itemId,
            partCode: item.partCode,
            requested: item.requestedQty,
            available: item.availableQty,
            approved: approvedQty,
            message: `Only ${item.availableQty} qty available`
          });
        } else {
          validApprovals.push({
            itemId: item.itemId,
            spareId: item.spareId,
            partCode: item.partCode,
            approvedQty: approvedQty
          });
          totalQty += approvedQty;
        }
      }
    }

    if (insufficientInventory.length > 0) {
      return res.status(400).json({
        error: 'Insufficient inventory for some items',
        details: insufficientInventory
      });
    }

    if (validApprovals.length === 0) {
      return res.status(400).json({ error: 'No valid approvals' });
    }

    console.log(`✅ Inventory validation passed: ${validApprovals.length} items, total qty: ${totalQty}`);

    // Step 3: Get approved status ID
    console.log('\n📊 Step 3: Get status IDs...');
    const approvedStatus = await sequelize.query(`
      SELECT status_id FROM [status] WHERE status_name = 'approved'
    `, { type: QueryTypes.SELECT });

    if (!approvedStatus.length) {
      return res.status(500).json({ error: 'Approved status not found' });
    }

    const approvedStatusId = approvedStatus[0].status_id;
    console.log(`✅ Approved status ID: ${approvedStatusId}`);

    // Step 4: Create stock movement
    console.log('\n📦 Step 4: Create stock movement...');
    const movementResult = await sequelize.query(`
      INSERT INTO stock_movement (
        stock_movement_type,
        bucket,
        bucket_operation,
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
        'TECH_ISSUE_OUT',
        'GOOD',
        'DECREASE',
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
    `, { 
      replacements: [requestId, serviceCenterId, technicianId, totalQty, approverId],
      type: QueryTypes.SELECT 
    });

    if (!movementResult.length) {
      return res.status(500).json({ error: 'Failed to create stock movement' });
    }

    const movementId = movementResult[0].movement_id;
    console.log(`✅ Stock movement created: ID ${movementId}`);

    // Step 5: Process each approved item
    console.log('\n📝 Step 5: Process each item...');
    let processedCount = 0;
    const processedItems = [];

    for (const approval of validApprovals) {
      try {
        const approvedQty = approval.approvedQty;
        
        console.log(`  🔄 Processing item ${approval.itemId} (Spare: ${approval.partCode}, Qty: ${approvedQty})`);

        // 5a. Update spare_request_items with approved_qty
        await sequelize.query(`
          UPDATE spare_request_items
          SET approved_qty = ?, updated_at = GETDATE()
          WHERE id = ?
        `, { replacements: [approvedQty, approval.itemId] });
        console.log(`    ✅ Updated request item`);

        // 5b. Insert into goods_movement_items
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
        `, { replacements: [movementId, approval.spareId, approvedQty] });
        console.log(`    ✅ Created goods movement item`);

        // 5c. Update Service Center inventory (decrease GOOD)
        await sequelize.query(`
          UPDATE spare_inventory
          SET qty_good = qty_good - ?, updated_at = GETDATE()
          WHERE spare_id = ? AND location_type = 'service_center' AND location_id = ?
        `, { replacements: [approvedQty, approval.spareId, serviceCenterId] });
        console.log(`    ✅ Decreased SC inventory`);

        // 5d. Update or create Technician inventory (increase GOOD)
        const techInventory = await sequelize.query(`
          SELECT spare_inventory_id FROM spare_inventory
          WHERE spare_id = ? AND location_type = 'technician' AND location_id = ?
        `, { replacements: [approval.spareId, technicianId], type: QueryTypes.SELECT });

        if (techInventory.length > 0) {
          await sequelize.query(`
            UPDATE spare_inventory
            SET qty_good = qty_good + ?, updated_at = GETDATE()
            WHERE spare_id = ? AND location_type = 'technician' AND location_id = ?
          `, { replacements: [approvedQty, approval.spareId, technicianId] });
        } else {
          await sequelize.query(`
            INSERT INTO spare_inventory (spare_id, location_type, location_id, qty_good, qty_defective, qty_in_transit, created_at, updated_at)
            VALUES (?, 'technician', ?, ?, 0, 0, GETDATE(), GETDATE())
          `, { replacements: [approval.spareId, technicianId, approvedQty] });
        }
        console.log(`    ✅ Increased technician inventory`);

        processedItems.push({
          itemId: approval.itemId,
          spareId: approval.spareId,
          partCode: approval.partCode,
          approvedQty: approvedQty
        });
        processedCount++;

      } catch (itemErr) {
        console.error(`    ❌ Error processing item ${approval.itemId}:`, itemErr.message);
      }
    }

    // Step 6: Update request status to approved
    console.log('\n📊 Step 6: Update request status...');
    await sequelize.query(`
      UPDATE spare_requests
      SET status_id = ?, updated_at = GETDATE()
      WHERE request_id = ?
    `, { replacements: [approvedStatusId, requestId] });
    console.log(`✅ Request status updated to approved`);

    // Step 7: Create approval record
    console.log('\n📋 Step 7: Create approval record...');
    try {
      await sequelize.query(`
        INSERT INTO approvals (
          entity_type,
          entity_id,
          approval_level,
          approver_user_id,
          approver_role,
          approval_status,
          approval_remarks,
          approved_at,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, 'approved', ?, GETDATE(), GETDATE(), GETDATE())
      `, { 
        replacements: [
          'spare_request',
          requestId,
          1,
          approverId,
          'service_center',
          remarks || `Approved by Service Center - ${processedCount} items allocated`
        ]
      });
      console.log(`✅ Approval record created`);
    } catch (approvalErr) {
      console.warn(`⚠️ Could not create approval record:`, approvalErr.message);
    }

    // Success response
    console.log('\n' + '='.repeat(60));
    console.log('✅ APPROVAL COMPLETED SUCCESSFULLY');
    console.log('='.repeat(60));

    res.json({
      success: true,
      data: {
        requestId,
        requestNumber: `REQ-${requestId}`,
        movementId,
        status: 'approved',
        itemsApproved: processedCount,
        totalQuantityApproved: totalQty,
        approvedItems: processedItems
      },
      message: `Spare request approved! ${processedCount} items allocated and ${totalQty} units transferred.`
    });

  } catch (err) {
    console.error('❌ Error during approval:', err.message);
    console.error('Stack:', err.stack);
    res.status(500).json({ 
      error: 'Failed to approve spare request',
      details: err.message 
    });
  }
});

/**
 * POST /api/technician-sc-spare-requests/:requestId/reject
 * Service Center rejects spare request
 */
router.post('/:requestId/reject', authenticateToken, async (req, res) => {
  try {
    const serviceCenterId = req.user.centerId || req.user.service_center_id;
    const { requestId } = req.params;
    const { reason } = req.body;
    const approverId = req.user.id;

    console.log('\n' + '='.repeat(60));
    console.log('❌ REJECTING SPARE REQUEST');
    console.log('='.repeat(60));

    if (!reason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    // Verify request exists and belongs to this service center
    const requestCheck = await sequelize.query(`
      SELECT request_id, requested_to_id FROM spare_requests
      WHERE request_id = ?
    `, { replacements: [requestId], type: QueryTypes.SELECT });

    if (!requestCheck.length) {
      return res.status(404).json({ error: 'Request not found' });
    }

    if (requestCheck[0].requested_to_id !== serviceCenterId) {
      return res.status(403).json({ error: 'Not authorized to reject this request' });
    }

    // Get rejected status ID
    const rejectedStatus = await sequelize.query(`
      SELECT status_id FROM [status] WHERE status_name = 'rejected'
    `, { type: QueryTypes.SELECT });

    const rejectedStatusId = rejectedStatus.length ? rejectedStatus[0].status_id : 5; // Fallback

    // Update request status
    await sequelize.query(`
      UPDATE spare_requests
      SET status_id = ?, updated_at = GETDATE()
      WHERE request_id = ?
    `, { replacements: [rejectedStatusId, requestId] });

    console.log(`✅ Request status updated to rejected`);

    // Create rejection record
    try {
      await sequelize.query(`
        INSERT INTO approvals (
          entity_type,
          entity_id,
          approval_level,
          approver_user_id,
          approval_status,
          approval_remarks,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, 'rejected', ?, GETDATE(), GETDATE())
      `, { 
        replacements: ['spare_request', requestId, 1, approverId, reason]
      });
      console.log(`✅ Rejection record created`);
    } catch (approvalErr) {
      console.warn(`⚠️ Could not create rejection record:`, approvalErr.message);
    }

    res.json({
      success: true,
      data: {
        requestId,
        status: 'rejected',
        reason
      },
      message: 'Spare request rejected successfully'
    });

  } catch (err) {
    console.error('❌ Error during rejection:', err.message);
    res.status(500).json({ 
      error: 'Failed to reject spare request',
      details: err.message 
    });
  }
});

/**
 * GET /api/technician-sc-spare-requests/service-center/inventory
 * Service Center views inventory allocated to all their technicians
 */
router.get('/service-center/inventory', authenticateToken, async (req, res) => {
  try {
    const serviceCenterId = req.user.centerId || req.user.service_center_id;

    console.log('\n' + '='.repeat(60));
    console.log('📦 TECHNICIAN INVENTORY FOR SERVICE CENTER');
    console.log('='.repeat(60));
    console.log('🎯 Service Center ID:', serviceCenterId);

    if (!serviceCenterId) {
      return res.status(400).json({ error: 'Service Center ID required' });
    }

    // Get all technicians assigned to this service center
    const technicians = await sequelize.query(`
      SELECT 
        t.technician_id,
        t.name as technicianName,
        t.mobile_no as technicianPhone
      FROM technicians t
      WHERE t.service_center_id = ?
      ORDER BY t.name
    `, { 
      replacements: [serviceCenterId], 
      type: QueryTypes.SELECT 
    });

    console.log(`✅ Found ${technicians.length} technicians for service center ${serviceCenterId}`);

    // For each technician, get their inventory
    const technicianInventory = await Promise.all(
      technicians.map(async (tech) => {
        try {
          const inventory = await sequelize.query(`
            SELECT 
              si.spare_id as spareId,
              sp.PART as partCode,
              sp.DESCRIPTION as partDescription,
              sp.BRAND as brand,
              COALESCE(si.qty_good, 0) as qtyGood,
              COALESCE(si.qty_defective, 0) as qtyDefective,
              COALESCE(si.qty_in_transit, 0) as qtyInTransit,
              (COALESCE(si.qty_good, 0) + COALESCE(si.qty_defective, 0) + COALESCE(si.qty_in_transit, 0)) as totalQty
            FROM spare_inventory si
            LEFT JOIN spare_parts sp ON si.spare_id = sp.Id
            WHERE si.location_type = 'technician'
              AND si.location_id = ?
              AND (COALESCE(si.qty_good, 0) + COALESCE(si.qty_defective, 0) + COALESCE(si.qty_in_transit, 0)) > 0
            ORDER BY sp.PART
          `, { 
            replacements: [tech.technician_id], 
            type: QueryTypes.SELECT 
          });

          return {
            technician_id: tech.technician_id,
            technicianName: tech.technicianName,
            technicianPhone: tech.technicianPhone,
            inventory: inventory
          };
        } catch (err) {
          console.warn(`⚠️ Error fetching inventory for technician ${tech.technician_id}:`, err.message);
          return {
            technician_id: tech.technician_id,
            technicianName: tech.technicianName,
            technicianPhone: tech.technicianPhone,
            inventory: []
          };
        }
      })
    );

    console.log(`✅ Inventory loaded for ${technicianInventory.length} technicians`);

    res.json({
      success: true,
      serviceCenterId,
      technicians: technicianInventory,
      totalTechnicians: technicians.length
    });

  } catch (err) {
    console.error('❌ Error fetching technician inventory:', err.message);
    res.status(500).json({ 
      error: 'Failed to fetch technician inventory',
      details: err.message 
    });
  }
});

/**
 * GET /api/technician-sc-spare-requests/:requestId
 * Fetch details of a specific spare request with items and inventory
 */
router.get('/:requestId', authenticateToken, async (req, res) => {
  try {
    const { requestId } = req.params;
    const serviceCenterId = req.user.centerId || req.user.service_center_id;

    console.log('\n' + '='.repeat(60));
    console.log('📋 FETCH REQUEST DETAILS');
    console.log('='.repeat(60));
    console.log('🎯 Request ID:', requestId);
    console.log('🔐 Service Center ID:', serviceCenterId);

    // Get main request details
    const mainRequest = await sequelize.query(`
      SELECT 
        sr.request_id,
        'REQ-' + CAST(sr.request_id AS VARCHAR) as requestNumber,
        t.technician_id,
        t.name as technicianName,
        t.mobile_no as technicianPhone,
        sr.request_reason as reason,
        sr.spare_request_type as requestType,
        st.status_id,
        st.status_name as status,
        sr.call_id as callId,
        sr.created_at as createdAt,
        sr.created_by as createdBy
      FROM spare_requests sr
      LEFT JOIN technicians t ON sr.requested_source_id = t.technician_id
      LEFT JOIN [status] st ON sr.status_id = st.status_id
      WHERE sr.request_id = ?
        AND sr.requested_source_type = 'technician'
        AND sr.requested_to_type = 'service_center'
        AND sr.requested_to_id = ?
    `, { 
      replacements: [requestId, serviceCenterId], 
      type: QueryTypes.SELECT 
    });

    if (!mainRequest || mainRequest.length === 0) {
      console.log('❌ Request not found or access denied');
      return res.status(404).json({ 
        error: 'Request not found or you do not have access to this request' 
      });
    }

    const request = mainRequest[0];
    console.log(`✅ Request found: ${request.requestNumber} (Status: ${request.status})`);

    // Get spare request items with inventory
    console.log('\n📦 Loading items and inventory...');
    const items = await sequelize.query(`
      SELECT 
        sri.id as spare_request_item_id,
        sri.spare_id as spareId,
        sri.requested_qty as quantity_requested,
        COALESCE(sri.approved_qty, 0) as approved_qty,
        sp.PART as spare_part_code,
        sp.DESCRIPTION as spare_part_name,
        sp.BRAND as brand
      FROM spare_request_items sri
      LEFT JOIN spare_parts sp ON sri.spare_id = sp.Id
      WHERE sri.request_id = ?
      ORDER BY sri.id
    `, { 
      replacements: [requestId], 
      type: QueryTypes.SELECT 
    });

    console.log(`✅ Found ${items.length} items`);

    // Enrich items with inventory information
    const enrichedItems = await Promise.all(
      items.map(async (item) => {
        try {
          const inventory = await sequelize.query(`
            SELECT 
              COALESCE(qty_good, 0) as available_qty,
              COALESCE(qty_defective, 0) as defectiveQty,
              COALESCE(qty_in_transit, 0) as inTransitQty
            FROM spare_inventory 
            WHERE spare_id = ? 
              AND location_type = 'service_center'
              AND location_id = ?
          `, { 
            replacements: [item.spareId, serviceCenterId], 
            type: QueryTypes.SELECT 
          });

          const inv = inventory.length > 0 ? inventory[0] : { available_qty: 0 };
          return {
            ...item,
            available_qty: inv.available_qty || 0,
            defectiveQty: inv.defectiveQty || 0,
            inTransitQty: inv.inTransitQty || 0
          };
        } catch (err) {
          console.warn(`⚠️ Error fetching inventory for spare ${item.spareId}:`, err.message);
          return {
            ...item,
            available_qty: 0,
            defectiveQty: 0,
            inTransitQty: 0
          };
        }
      })
    );

    console.log('✅ Items enriched with inventory data');

    res.json({
      success: true,
      data: {
        ...request,
        requestId: request.request_id,
        items: enrichedItems
      }
    });

  } catch (err) {
    console.error('❌ Error fetching request details:', err.message);
    res.status(500).json({ 
      error: 'Failed to fetch request details',
      details: err.message 
    });
  }
});

export default router;
