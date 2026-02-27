/**
 * SPARE PARTS WORKFLOW - IMPLEMENTATION GUIDE
 * 
 * This file contains EXACT code changes needed to fix the workflow
 * Copy-paste ready implementations for each fix
 */

// ============================================================================
// FIX 1: CREATE ALLOCATION ENDPOINT (CRITICAL)
// ============================================================================
// File: server/routes/spare-requests.js
// Priority: 🔴 CRITICAL - Do this first
// Time: 1-2 hours

const ALLOCATION_ENDPOINT = `
/**
 * POST /api/spare-requests/:requestId/allocate
 * ASC allocates spares to technician with inventory update
 * 
 * Steps:
 * 1. Verify spare request exists and is in 'submitted' status
 * 2. For each item:
 *    - Validate ASC has available qty
 *    - Create TECH_ISSUE_OUT stock movement (ASC perspective)
 *    - Create TECH_ISSUE_IN stock movement (Tech perspective)
 *    - Update spare_inventory for both locations
 * 3. Update request items with allocated qty
 * 4. Update request status to 'allocated'
 */
router.post('/:requestId/allocate', authenticateToken, async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { requestId } = req.params;
    const { items, allocatedRemarks } = req.body;
    const userId = req.user.id;

    console.log('\\n' + '='.repeat(70));
    console.log('📦 ALLOCATING SPARES TO TECHNICIAN');
    console.log('='.repeat(70));

    // Step 1: Verify request exists
    const [requestData] = await sequelize.query(\`
      SELECT sr.request_id, sr.spare_request_type, sr.requested_source_id, 
             sr.requested_to_id, sr.status_id, s.status_name
      FROM spare_requests sr
      LEFT JOIN statuses s ON sr.status_id = s.status_id
      WHERE sr.request_id = ?
    \`, { 
      replacements: [requestId], 
      type: QueryTypes.SELECT,
      transaction 
    });

    if (!requestData) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Request not found' });
    }

    if (requestData.spare_request_type !== 'TECH_ISSUE') {
      await transaction.rollback();
      return res.status(400).json({ error: 'Only TECH_ISSUE requests can be allocated' });
    }

    const technicianId = requestData.requested_source_id;  // Who requested (Tech)
    const serviceCenterId = requestData.requested_to_id;  // Who allocates (ASC)

    console.log(\`✅ Request verified: Request ID \${requestId}\`);
    console.log(\`   Technician: \${technicianId}\`);
    console.log(\`   Service Center: \${serviceCenterId}\`);

    // Step 2: Process each item
    console.log(\`\\n📋 Processing \${items.length} items...\`);

    for (const item of items) {
      const { spareId, allocatedQty } = item;
      
      console.log(\`\\n   ✓ Spare ID: \${spareId}, Qty: \${allocatedQty}\`);

      // 2a: Validate ASC has inventory
      const [ascInv] = await sequelize.query(\`
        SELECT spare_inventory_id, qty_good FROM spare_inventory
        WHERE spare_id = ? AND location_type = 'service_center' AND location_id = ?
      \`, { 
        replacements: [spareId, serviceCenterId],
        type: QueryTypes.SELECT,
        transaction 
      });

      if (!ascInv || ascInv.qty_good < allocatedQty) {
        await transaction.rollback();
        return res.status(400).json({ 
          error: \`ASC doesn't have \${allocatedQty} qty of spare \${spareId}. Available: \${ascInv?.qty_good || 0}\`
        });
      }

      // 2b: Create TECH_ISSUE_OUT movement (ASC perspective - decreasing)
      await sequelize.query(\`
        INSERT INTO stock_movements (
          spare_id, location_type, location_id, movement_type, quantity, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, GETDATE(), GETDATE())
      \`, {
        replacements: [spareId, 'service_center', serviceCenterId, 'TECH_ISSUE_OUT', allocatedQty],
        transaction
      });

      console.log(\`     ✓ TECH_ISSUE_OUT movement created\`);

      // 2c: Create TECH_ISSUE_IN movement (Tech perspective - increasing)
      await sequelize.query(\`
        INSERT INTO stock_movements (
          spare_id, location_type, location_id, movement_type, quantity, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, GETDATE(), GETDATE())
      \`, {
        replacements: [spareId, 'technician', technicianId, 'TECH_ISSUE_IN', allocatedQty],
        transaction
      });

      console.log(\`     ✓ TECH_ISSUE_IN movement created\`);

      // 2d: Update ASC inventory (decrease good)
      await sequelize.query(\`
        UPDATE spare_inventory
        SET qty_good = qty_good - ?
        WHERE spare_id = ? AND location_type = 'service_center' AND location_id = ?
      \`, {
        replacements: [allocatedQty, spareId, serviceCenterId],
        transaction
      });

      console.log(\`     ✓ ASC inventory: qty_good - \${allocatedQty}\`);

      // 2e: Update/Create Tech inventory (increase good)
      const [techInv] = await sequelize.query(\`
        SELECT spare_inventory_id FROM spare_inventory
        WHERE spare_id = ? AND location_type = 'technician' AND location_id = ?
      \`, {
        replacements: [spareId, technicianId],
        type: QueryTypes.SELECT,
        transaction
      });

      if (techInv) {
        await sequelize.query(\`
          UPDATE spare_inventory
          SET qty_good = qty_good + ?
          WHERE spare_id = ? AND location_type = 'technician' AND location_id = ?
        \`, {
          replacements: [allocatedQty, spareId, technicianId],
          transaction
        });
      } else {
        await sequelize.query(\`
          INSERT INTO spare_inventory (
            spare_id, location_type, location_id, qty_good, qty_defective, qty_in_transit, created_at, updated_at
          ) VALUES (?, ?, ?, ?, 0, 0, GETDATE(), GETDATE())
        \`, {
          replacements: [spareId, 'technician', technicianId, allocatedQty],
          transaction
        });
      }

      console.log(\`     ✓ Tech inventory: qty_good + \${allocatedQty}\`);

      // 2f: Update spare_request_items with allocated qty
      await sequelize.query(\`
        UPDATE spare_request_items
        SET allocated_qty = ?
        WHERE request_id = ? AND spare_id = ?
      \`, {
        replacements: [allocatedQty, requestId, spareId],
        transaction
      });

      console.log(\`     ✓ Request item updated\`);
    }

    // Step 3: Get allocated status ID
    const [allocatedStatus] = await sequelize.query(\`
      SELECT status_id FROM statuses WHERE status_name = 'allocated' LIMIT 1
    \`, {
      type: QueryTypes.SELECT,
      transaction
    });

    // Step 4: Update spare_request status to 'allocated'
    await sequelize.query(\`
      UPDATE spare_requests
      SET status_id = ?, updated_at = GETDATE()
      WHERE request_id = ?
    \`, {
      replacements: [allocatedStatus?.status_id || 2, requestId],
      transaction
    });

    await transaction.commit();

    console.log(\`\\n✅ Allocation completed successfully\`);
    console.log(\`   Technician \${technicianId} allocated \${items.length} spares\`);

    res.json({
      success: true,
      message: 'Spares allocated successfully',
      requestId,
      allocatedItems: items.length,
      status: 'allocated'
    });

  } catch (error) {
    await transaction.rollback();
    console.error('❌ Allocation failed:', error.message);
    res.status(500).json({ 
      error: 'Failed to allocate spares',
      details: error.message 
    });
  }
});
`;

// ============================================================================
// FIX 2: TRACK DEFECTIVE SPARES IN TECH INVENTORY (CRITICAL)
// ============================================================================
// File: server/routes/technician-tracking.js OR routes/calls.js
// Priority: 🔴 CRITICAL
// Time: 30 minutes

const DEFECTIVE_TRACKING = `
/**
 * When marking a call as RESOLVED/COMPLETED:
 * For each spare that was USED in this call, the old/defective part
 * is now in the technician's possession and should be tracked
 */

// Add this function in routes/technician-tracking.js or routes/calls.js:

async function trackDefectiveSparesWhenCallResolved(callId, transaction) {
  try {
    console.log(\`\\n⚠️  Tracking defective spares for call \${callId}...\`);

    // Get technician for this call
    const [callData] = await sequelize.query(\`
      SELECT assigned_tech_id FROM calls WHERE call_id = ?
    \`, {
      replacements: [callId],
      type: QueryTypes.SELECT,
      transaction
    });

    if (!callData?.assigned_tech_id) {
      throw new Error('Call not assigned to any technician');
    }

    const technicianId = callData.assigned_tech_id;

    // Get all spares USED in this call
    const usedSpares = await sequelize.query(\`
      SELECT spare_part_id, used_qty
      FROM call_spare_usage
      WHERE call_id = ? AND used_qty > 0
    \`, {
      replacements: [callId],
      type: QueryTypes.SELECT,
      transaction
    });

    console.log(\`   Found \${usedSpares.length} spares marked as used\`);

    // For each used spare, add to tech's defective inventory
    for (const spare of usedSpares) {
      // Each used spare means one defective was collected and is now with tech
      const defectiveQty = spare.used_qty;

      // Check if tech already has inventory for this spare
      const [techInv] = await sequelize.query(\`
        SELECT spare_inventory_id, qty_defective FROM spare_inventory
        WHERE spare_id = ? AND location_type = 'technician' AND location_id = ?
      \`, {
        replacements: [spare.spare_part_id, technicianId],
        type: QueryTypes.SELECT,
        transaction
      });

      if (techInv) {
        // Update existing inventory
        await sequelize.query(\`
          UPDATE spare_inventory
          SET qty_defective = qty_defective + ?
          WHERE spare_id = ? AND location_type = 'technician' AND location_id = ?
        \`, {
          replacements: [defectiveQty, spare.spare_part_id, technicianId],
          transaction
        });
        console.log(\`   ✓ Spare \${spare.spare_part_id}: defective +\${defectiveQty}\`);
      } else {
        // Create new inventory record with defective qty
        await sequelize.query(\`
          INSERT INTO spare_inventory (
            spare_id, location_type, location_id, qty_good, qty_defective, qty_in_transit, created_at, updated_at
          ) VALUES (?, ?, ?, 0, ?, 0, GETDATE(), GETDATE())
        \`, {
          replacements: [spare.spare_part_id, 'technician', technicianId, defectiveQty],
          transaction
        });
        console.log(\`   ✓ Created spare inventory for spare \${spare.spare_part_id}: defective \${defectiveQty}\`);
      }
    }

    console.log(\`   ✅ Defective tracking complete\`);

  } catch (error) {
    console.error('Error tracking defective spares:', error);
    throw error;
  }
}

// CALL THIS FUNCTION when updating call status to RESOLVED:
// Example in your call status update endpoint:

router.post('/update-status/:callId', authenticateToken, async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { callId } = req.params;
    const { newStatus } = req.body;

    // ... existing status update code ...

    // IMPORTANT: Call this function before committing transaction
    if (newStatus === 'RESOLVED' || newStatus === 'COMPLETED') {
      await trackDefectiveSparesWhenCallResolved(callId, transaction);
    }

    // ... rest of code ...

  } catch (error) {
    await transaction.rollback();
  }
});
`;

// ============================================================================
// FIX 3: ADD STOCK MOVEMENTS IN VERIFICATION (CRITICAL)
// ============================================================================
// File: server/routes/technician-spare-returns.js
// Priority: 🔴 CRITICAL
// Find existing verify endpoint (line ~575) and modify it
// Time: 45 minutes

const STOCK_MOVEMENTS_IN_VERIFICATION = `
// In the verify endpoint: router.post('/:returnId/verify', ...)
// After inventory is updated, ADD THIS CODE:

// Create stock movements for audit trail
console.log(\`\\n📊 Step 3: Creating stock movements for audit trail...\`);

for (const item of items) {
  const { spare_id, item_type, verified_qty } = item;
  
  // Different movement types based on item type:
  // - If defective: TECH_RETURN_DEFECTIVE (single movement type)
  // - If unused: Could be TECH_RETURN_EXCESS or similar (define your optional movement type)

  if (item_type === 'defective') {
    // Defective spare being returned from tech to ASC
    await sequelize.query(\`
      INSERT INTO stock_movements (
        spare_id, location_type, location_id, movement_type, quantity, remarks, created_at, updated_at
      ) VALUES (?, ?, ?, 'TECH_RETURN_DEFECTIVE', ?, ?, GETDATE(), GETDATE())
    \`, {
      replacements: [
        spare_id,
        'technician',  // Movement from technician perspective
        technicianId,
        verified_qty,
        'Defective spare returned from technician'
      ],
      transaction
    });
    console.log(\`     ✓ Movement created: TECH_RETURN_DEFECTIVE (\${verified_qty} qty)\`);
  } else if (item_type === 'unused') {
    // Unused spare being returned - could create TECH_RETURN_UNUSED movement
    // (Optional: depends if you want to track unused separately)
    await sequelize.query(\`
      INSERT INTO stock_movements (
        spare_id, location_type, location_id, movement_type, quantity, remarks, created_at, updated_at
      ) VALUES (?, ?, ?, 'TECH_RETURN_UNUSED', ?, ?, GETDATE(), GETDATE())
    \`, {
      replacements: [
        spare_id,
        'technician',
        technicianId,
        verified_qty,
        'Unused spare returned from technician'
      ],
      transaction
    });
    console.log(\`     ✓ Movement created: TECH_RETURN_UNUSED (\${verified_qty} qty)\`);
  }
}

console.log(\`   ✅ Stock movements created for audit trail\`);
`;

// ============================================================================
// FIX 4: ADD INVENTORY VALIDATION (HIGH PRIORITY)
// ============================================================================
// File: server/routes/spare-requests.js + technician-spare-returns.js
// Priority: 🟠 HIGH
// Time: 1 hour

const INVENTORY_VALIDATION = `
// ============ IN ALLOCATION ENDPOINT ============
// Before allocating spares, validate ASC has them

async function validateASCInventory(items, serviceCenterId, transaction) {
  for (const item of items) {
    const { spareId, allocatedQty } = item;
    
    const [ascInv] = await sequelize.query(\`
      SELECT qty_good FROM spare_inventory
      WHERE spare_id = ? AND location_type = 'service_center' AND location_id = ?
    \`, {
      replacements: [spareId, serviceCenterId],
      type: QueryTypes.SELECT,
      transaction
    });

    const availableQty = ascInv?.qty_good || 0;
    if (availableQty < allocatedQty) {
      throw new Error(
        \`Insufficient inventory for spare \${spareId}. \\n\` +
        \`Requested: \${allocatedQty}, Available: \${availableQty}\`
      );
    }
  }
}

// ============ IN RETURN SUBMISSION ============
// Before accepting return, validate tech has the spares

async function validateTechInventory(items, technicianId, transaction) {
  const techInv = await sequelize.query(\`
    SELECT qty_good, qty_defective FROM spare_inventory
    WHERE location_type = 'technician' AND location_id = ?
    LIMIT 1
  \`, {
    replacements: [technicianId],
    type: QueryTypes.SELECT,
    transaction
  });

  for (const item of items) {
    const { spareId, itemType, requestedQty } = item;

    if (itemType === 'unused') {
      if (!techInv || techInv.qty_good < requestedQty) {
        throw new Error(
          \`Tech doesn't have \${requestedQty} unused spares. \\n\` +
          \`Available: \${techInv?.qty_good || 0}\`
        );
      }
    } else if (itemType === 'defective') {
      if (!techInv || techInv.qty_defective < requestedQty) {
        throw new Error(
          \`Tech doesn't have \${requestedQty} defective spares. \\n\` +
          \`Available: \${techInv?.qty_defective || 0}\`
        );
      }
    }
  }
}

// Use these in your endpoints:
router.post('/:requestId/allocate', authenticateToken, async (req, res) => {
  try {
    const { items } = req.body;
    // ... existing code ...
    
    // VALIDATE before proceeding
    await validateASCInventory(items, serviceCenterId, transaction);
    
    // ... rest of allocation code ...
  }
});

router.post('/create', authenticateToken, async (req, res) => {
  try {
    const { items } = req.body;
    // ... existing code ...
    
    // VALIDATE before creating return
    await validateTechInventory(items, technicianId, transaction);
    
    // ... rest of creation code ...
  }
});
`;

// ============================================================================
// FIX 5: HANDLE CONDITION_ON_RECEIPT (MEDIUM PRIORITY)
// ============================================================================
// File: server/routes/technician-spare-returns.js
// Priority: 🟠 MEDIUM
// Modify the verify endpoint (around line 600-700)
// Time: 30 minutes

const CONDITION_HANDLING = `
// In the verify endpoint, when updating inventory, check condition:

console.log(\`\\n🔍 Processing items with condition checks...\`);

for (const item of items) {
  const { spare_id, item_type, verified_qty, condition_on_receipt } = item;

  console.log(\`   Item Spare \${spare_id}:\`);
  console.log(\`     - Type: \${item_type}\`);
  console.log(\`     - Condition: \${condition_on_receipt}\`);

  // Determine where the spare should go based on condition
  let finalDestination = null;

  if (condition_on_receipt === 'damaged') {
    // Damaged spares should NOT go to good inventory
    // Options: 
    // 1. Go to scrap (don't add to inventory)
    // 2. Go to defective bucket (for later repair/analysis)
    // 3. Go to separate 'damaged' bucket
    
    console.log(\`     ⚠️  Item received in DAMAGED condition\`);
    console.log(\`     → NOT adding to inventory\`);
    console.log(\`     → Consider: log to damage report / scrap tracking\`);
    
    // Option: Add to a 'damaged' log for warehouse team
    await sequelize.query(\`
      INSERT INTO damaged_spare_log (
        spare_id, return_id, qty, reason, created_at
      ) VALUES (?, ?, ?, 'Damaged on receipt', GETDATE())
    \`, {
      replacements: [spare_id, returnId, verified_qty],
      transaction
    });
    
    finalDestination = 'damaged';

  } else if (condition_on_receipt === 'defective') {
    // Defective spares go to defective bucket
    console.log(\`     ✓ Item in DEFECTIVE condition → Adding to defective bucket\`);
    finalDestination = 'defective';

  } else if (condition_on_receipt === 'good' || !condition_on_receipt) {
    // Good condition
    if (item_type === 'defective') {
      // Item marked as defective in return, goes to defective bucket
      console.log(\`     ✓ Item marked as DEFECTIVE → Adding to defective bucket\`);
      finalDestination = 'defective';
    } else {
      // Unused good spares go to good bucket
      console.log(\`     ✓ Item in GOOD condition → Adding to good bucket\`);
      finalDestination = 'good';
    }
  }

  // Now update ASC inventory based on final destination
  const ascInv = await sequelize.query(\`
    SELECT spare_inventory_id FROM spare_inventory
    WHERE spare_id = ? AND location_type = 'service_center' AND location_id = ?
  \`, {
    replacements: [spare_id, serviceCenterId],
    type: QueryTypes.SELECT,
    transaction
  });

  if (finalDestination !== 'damaged') {
    // Add to inventory
    const targetField = finalDestination === 'defective' ? 'qty_defective' : 'qty_good';
    
    if (ascInv) {
      await sequelize.query(\`
        UPDATE spare_inventory
        SET \${targetField} = \${targetField} + ?
        WHERE spare_id = ? AND location_type = 'service_center' AND location_id = ?
      \`, {
        replacements: [verified_qty, spare_id, serviceCenterId],
        transaction
      });
    } else {
      await sequelize.query(\`
        INSERT INTO spare_inventory (
          spare_id, location_type, location_id, qty_good, qty_defective, qty_in_transit, created_at, updated_at
        ) VALUES (
          ?,?,?,
          \${finalDestination === 'good' ? verified_qty : 0},
          \${finalDestination === 'defective' ? verified_qty : 0},
          0, GETDATE(), GETDATE()
        )
      \`, {
        replacements: [spare_id, 'service_center', serviceCenterId],
        transaction
      });
    }
  }
}

console.log(\`   ✅ Condition handling complete\`);
`;

// ============================================================================
// FIX 6: ADD CALL OWNERSHIP VALIDATION (LOW PRIORITY)
// ============================================================================
// File: server/routes/spare-return-requests.js
// Priority: 🟡 LOW
// Time: 15 minutes

const CALL_VALIDATION = `
// In createReturnRequest function or POST /spare-return-requests endpoint:
// Add this validation when call_id is provided

// Get technician details
const [techDetails] = await sequelize.query(\`
  SELECT technician_id, service_center_id FROM technicians WHERE user_id = ?
\`, {
  replacements: [userId],
  type: QueryTypes.SELECT,
  transaction
});

const technicianId = techDetails.technician_id;

// If call_id provided, validate it's assigned to this technician
if (callId) {
  const [callData] = await sequelize.query(\`
    SELECT call_id, assigned_tech_id, assigned_asc_id 
    FROM calls 
    WHERE call_id = ? AND assigned_tech_id = ? AND assigned_asc_id = ?
  \`, {
    replacements: [callId, technicianId, techDetails.service_center_id],
    type: QueryTypes.SELECT,
    transaction
  });

  if (!callData) {
    await transaction.rollback();
    return res.status(403).json({ 
      error: 'Call \${callId} is not assigned to you' 
    });
  }
}
`;

// ============================================================================
// EXPORT ALL FIXES
// ============================================================================

module.exports = {
  FIX_1_ALLOCATION_ENDPOINT: ALLOCATION_ENDPOINT,
  FIX_2_DEFECTIVE_TRACKING: DEFECTIVE_TRACKING,
  FIX_3_STOCK_MOVEMENTS: STOCK_MOVEMENTS_IN_VERIFICATION,
  FIX_4_INVENTORY_VALIDATION: INVENTORY_VALIDATION,
  FIX_5_CONDITION_HANDLING: CONDITION_HANDLING,
  FIX_6_CALL_VALIDATION: CALL_VALIDATION,

  implementationOrder: [
    { priority: 1, name: 'Allocation Endpoint', time: '1-2 hours', file: 'routes/spare-requests.js' },
    { priority: 2, name: 'Defective Tracking', time: '30 minutes', file: 'routes/technician-tracking.js' },
    { priority: 3, name: 'Stock Movements', time: '45 minutes', file: 'routes/technician-spare-returns.js' },
    { priority: 4, name: 'Inventory Validation', time: '1 hour', file: 'routes/spare-requests.js + technician-spare-returns.js' },
    { priority: 5, name: 'Condition Handling', time: '30 minutes', file: 'routes/technician-spare-returns.js' },
    { priority: 6, name: 'Call Validation', time: '15 minutes', file: 'routes/spare-return-requests.js' }
  ],

  totalTime: '4-5 hours'
};
