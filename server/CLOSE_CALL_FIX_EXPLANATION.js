/**
 * CLOSE CALL ENDPOINT - FIXES APPLIED
 * 
 * Date: 2026-02-26
 * Issue: When closing a call with spare usage:
 *   ❌ stock_movement NOT created
 *   ❌ goods_movement_items NOT created
 *   ❌ spare_inventory NOT updated
 *   ❌ calls.status NOT properly updated
 *   ❌ used_by_tech_id NULL causing issues
 */

// ============================================================================
// FIXES APPLIED TO: /api/technician-tracking/call/:callId/close
// FILE: server/routes/technician-tracking.js
// ============================================================================

/**
 * FIX #1: Fetch Call Details First
 * PROBLEM: Technician ID was required in request body, but often missing
 * SOLUTION: Fetch call details to get assigned_tech_id if not provided
 * 
 * CODE CHANGE:
 * Before:
 *   const { technician_id } = req.body;  // Could be undefined
 * 
 * After:
 *   // Get call details to extract assigned_tech_id
 *   const callData = await sequelize.query(
 *     `SELECT assigned_tech_id FROM calls WHERE call_id = ?`, ...
 *   );
 *   if (!technician_id && callData.assigned_tech_id) {
 *     technician_id = callData.assigned_tech_id;
 *   }
 */

/**
 * FIX #2: Proper Stock Movement Creation
 * PROBLEM: Was trying to reuse old movement_id instead of creating new one
 * SOLUTION: Always create NEW stock_movement for this specific call closure
 * 
 * CODE CHANGE:
 * Before:
 *   - Tried to get latest movement_id from database
 *   - If not found, created one
 *   - Reference_no was 'CSU-' + call_id
 * 
 * After:
 *   - ALWAYS create new stock_movement
 *   - Reference_no is 'CALL-' + call_id (more specific)
 *   - Includes assigned_to = technician_id
 *   - Bucket = 'DEFECTIVE' (for defective spares)
 *   - Bucket_operation = 'INCREASE'
 *   - total_qty = number of spares used
 */

/**
 * FIX #3: Goods Movement Items Creation (Working Correctly)
 * STATUS: ✅ ALREADY CORRECT
 * DETAILS:
 *   - Creates goods_movement_items for each spare usage
 *   - Uses movement_id from stock_movement
 *   - spare_part_id from call_spare_usage
 *   - qty = used_qty
 *   - condition = 'defective'
 */

/**
 * FIX #4: Handle NULL used_by_tech_id in Inventory Update
 * PROBLEM: If used_by_tech_id is NULL, inventory update fails (no rows matched)
 * SOLUTION: Use technician_id from call as fallback
 * 
 * CODE CHANGE:
 * Before:
 *   UPDATE spare_inventory
 *   WHERE spare_id = ?
 *     AND location_id = usage.used_by_tech_id  -- Could be NULL!
 * 
 * After:
 *   const techId = usage.used_by_tech_id || technician_id;  // Use fallback
 *   UPDATE spare_inventory
 *   WHERE spare_id = ?
 *     AND location_id = techId  -- Never NULL
 */

/**
 * FIX #5: Critical Bug - Update calls.status_id NOT calls.status
 * PROBLEM: Updating wrong column! Database has status_id (foreign key), not status
 * SOLUTION: Update status_id column with proper status_id value
 * 
 * CODE CHANGE:
 * Before:
 *   UPDATE calls
 *   SET status = ?  // ❌ WRONG: Column doesn't exist or is wrong
 *   WHERE call_id = ?
 * 
 * After:
 *   UPDATE calls
 *   SET status_id = ?,  // ✅ CORRECT: Using status_id foreign key
 *       substatus_id = NULL,  // Also clear substatus when closing
 *   WHERE call_id = ?
 * 
 * STATUS VALUES:
 *   - status_id = 8 = "closed" status
 */

/**
 * FIX #6: Clear Substatus When Closing Call
 * PROBLEM: Call still had substatus after closure (assign details lingered)
 * SOLUTION: Set substatus_id to NULL when closing
 * 
 * CODE CHANGE:
 * After:
 *   UPDATE calls
 *   SET status_id = 8,
 *       substatus_id = NULL,  // ✅ Clear substatus
 *   WHERE call_id = ?
 */


// ============================================================================
// TESTING THE FIX
// ============================================================================

/**
 * TEST ENDPOINT: POST /api/technician-tracking/call/:callId/close
 * 
 * Request:
 * {
 *   "technician_id": 7,  // Optional, will be fetched from call if not provided
 *   "status": "closed"   // or "CLOSED"
 * }
 * 
 * Response on Success:
 * {
 *   "ok": true,
 *   "message": "Call closed and spare movements processed successfully",
 *   "callId": 15,
 *   "data": {
 *     "call_id": 15,
 *     "status_id": 8,
 *     "status_name": "closed",
 *     "technician_id": 7,
 *     "spare_movements": {
 *       "stock_movements_created": 1,
 *       "goods_movement_items_created": 1,
 *       "inventory_updates": 1,
 *       "total_usages": 1
 *     }
 *   }
 * }
 */


// ============================================================================
// VERIFICATION QUERIES
// ============================================================================

/**
 * QUERY 1: Verify call status was updated correctly
 * SELECT call_id, status_id, substatus_id FROM calls WHERE call_id = 15;
 * Expected: call_id=15, status_id=8, substatus_id=NULL
 */

/**
 * QUERY 2: Verify stock_movement was created
 * SELECT * FROM stock_movement 
 * WHERE reference_type = 'call_spare_usage' AND reference_no = 'CALL-15';
 * Expected: 1 record with stock_movement_type='DEFECTIVE_SPARE_REPLACEMENT'
 */

/**
 * QUERY 3: Verify goods_movement_items was created
 * SELECT *  FROM goods_movement_items 
 * WHERE movement_id IN (SELECT movement_id FROM stock_movement WHERE reference_no = 'CALL-15');
 * Expected: 1 record with spare_part_id=2, qty=1, condition='defective'
 */

/**
 * QUERY 4: Verify spare_inventory was updated
 * SELECT * FROM spare_inventory 
 * WHERE spare_id = 2 AND location_type = 'technician' AND location_id = 7;
 * Expected: qty_defective increased by 1 (or new record created with qty_defective=1)
 */


// ============================================================================
// COMPLETE WORKFLOW NOW:
// ============================================================================

/**
 * When calling: POST /api/technician-tracking/call/:callId/close
 * 
 * STEP 1: Fetch call details ✅
 *   - Get assigned_tech_id
 *   - Get current status_id
 * 
 * STEP 2: Get spare usage records ✅
 *   - Get all call_spare_usage records
 *   - For each record with used_qty > 0
 * 
 * STEP 3: Create stock_movement ✅
 *   - NEW movement for this closure
 *   - Type: DEFECTIVE_SPARE_REPLACEMENT
 *   - Bucket: DEFECTIVE, Operation: INCREASE
 * 
 * STEP 4: Create goods_movement_items ✅
 *   - One record per spare used
 *   - Links to stock_movement via movement_id
 *   - Condition: defective
 * 
 * STEP 5: Update spare_inventory ✅
 *   - Increase qty_defective for each spare used
 *   - Uses technician_id (with fallback to assigned_tech_id)
 * 
 * STEP 6: Update calls.status_id ✅ FIXED!
 *   - Set status_id = 8 (closed)
 *   - Set substatus_id = NULL
 * 
 * STEP 7: Commit transaction ✅
 */


// ============================================================================
// BACKWARD COMPATIBILITY
// ============================================================================

/**
 * The fix is backward compatible:
 * 
 * OLD REQUEST:
 * POST /api/technician-tracking/call/15/close
 * { "technician_id": 7, "status": "CLOSED" }
 * 
 * NEW REQUEST (also works):
 * POST /api/technician-tracking/call/15/close
 * { "technician_id": 7, "status": "closed" }
 * 
 * MINIMAL REQUEST (technician_id auto-fetched):
 * POST /api/technician-tracking/call/15/close
 * { "status": "closed" }
 */


// ============================================================================  
// SUMMARY
// ============================================================================

/**
 * BEFORE FIX: ❌
 * - stock_movement NOT created
 * - goods_movement_items NOT created  
 * - spare_inventory NOT updated
 * - calls.status NOT updated
 * - Technician inventory unchanged
 * 
 * AFTER FIX: ✅
 * - stock_movement CREATED (NEW record for each closure)
 * - goods_movement_items CREATED (for each spare used)
 * - spare_inventory UPDATED (defective qty increases)
 * - calls.status_id UPDATED (status_id=8, substatus_id=NULL)
 * - Technician inventory UPDATED (defective spares tracked)
 * - Transaction SAFE (all or nothing)
 */
