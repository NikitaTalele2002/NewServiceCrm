/**
 * SQL VERIFICATION SCRIPT
 * Run these queries to verify the close call fix is working
 */

-- ============================================================================
-- 1. CHECK CURRENT CALL STATUS (should show status_id and substatus_id)
-- ============================================================================
SELECT 
  call_id,
  status_id,
  substatus_id,
  status, -- This column should NOT be used (incorrect)
  created_at,
  updated_at
FROM calls 
WHERE call_id = 15;

-- Expected Result:
-- call_id=15, status_id=8 (closed), substatus_id=NULL


-- ============================================================================
-- 2. CHECK SPARE USAGE FOR THIS CALL
-- ============================================================================
SELECT 
  usage_id,
  call_id,
  spare_part_id,
  issued_qty,
  used_qty,
  returned_qty,
  usage_status,
  used_by_tech_id,
  created_at
FROM call_spare_usage
WHERE call_id = 15;

-- Expected Result:
-- usage_id=25, call_id=15, spare_part_id=2, issued_qty=2, used_qty=1, returned_qty=1, usage_status=PARTIAL, used_by_tech_id=NULL


-- ============================================================================
-- 3. CHECK STOCK_MOVEMENT WAS CREATED FOR CALL CLOSURE
-- ============================================================================
SELECT 
  movement_id,
  reference_type,
  reference_no,
  source_location_type,
  destination_location_type,
  total_qty,
  stock_movement_type,
  bucket,
  bucket_operation,
  status,
  created_at
FROM stock_movement
WHERE reference_type = 'call_spare_usage'
  AND reference_no = 'CALL-15'
ORDER BY movement_id DESC;

-- Expected Result:
-- Should have at least 1 record with stock_movement_type='DEFECTIVE_SPARE_REPLACEMENT'


-- ============================================================================
-- 4. CHECK GOODS_MOVEMENT_ITEMS WAS CREATED
-- ============================================================================
SELECT 
  item_id,
  movement_id,
  spare_part_id,
  qty,
  condition,
  created_at
FROM goods_movement_items
WHERE movement_id IN (
  SELECT movement_id FROM stock_movement
  WHERE reference_type = 'call_spare_usage' AND reference_no = 'CALL-15'
)
ORDER BY item_id DESC;

-- Expected Result:
-- Should have 1 record: spare_part_id=2, qty=1, condition='defective'


-- ============================================================================
-- 5. CHECK SPARE_INVENTORY WAS UPDATED (TECHNICIAN'S DEFECTIVE QTY INCREASED)
-- ============================================================================
SELECT 
  inventory_id,
  spare_id,
  location_type,
  location_id,
  qty_good,
  qty_defective,
  qty_damaged,
  created_at,
  updated_at
FROM spare_inventory
WHERE spare_id = 2
  AND location_type = 'technician'
ORDER BY created_at DESC;

-- Expected Result:
-- Should have a record showing qty_defective increased by 1 (used_qty)


-- ============================================================================
-- 6. FULL VERIFICATION QUERY (ALL COMPONENTS)
-- ============================================================================
-- Check all related data for call_id=15
SELECT 
  'CALLS' AS table_name,
  c.call_id,
  c.status_id,
  c.substatus_id,
  s.status_name,
  csu.usage_id,
  csu.spare_part_id,
  csu.used_qty
FROM calls c
LEFT JOIN call_spare_usage csu ON c.call_id = csu.call_id
LEFT JOIN status s ON c.status_id = s.status_id
WHERE c.call_id = 15;

-- Then check stock movement:
SELECT 
  'STOCK_MOVEMENT' AS table_name,
  COUNT(*) as count,
  movement_id
FROM stock_movement
WHERE reference_no = 'CALL-15'
GROUP BY movement_id;

-- Then check goods_movement_items:
SELECT 
  'GOODS_MOVEMENT_ITEMS' AS table_name,
  COUNT(*) as count
FROM goods_movement_items
WHERE movement_id IN (
  SELECT movement_id FROM stock_movement WHERE reference_no = 'CALL-15'
);

-- Then check spare_inventory:
SELECT 
  'SPARE_INVENTORY' AS table_name,
  COUNT(*) as count,
  SUM(qty_defective) as total_defective,
  SUM(qty_good) as total_good
FROM spare_inventory
WHERE spare_id = 2 AND location_type = 'technician';


-- ============================================================================
-- 7. TIMELINE CHECK (Verify all timestamps are recent)
-- ============================================================================
PRINT '=== CREATION TIMESTAMPS (Should all be recent) ===';

SELECT 'call_spare_usage' as entity, created_at FROM call_spare_usage WHERE call_id = 15
UNION ALL
SELECT 'stock_movement', created_at FROM stock_movement WHERE reference_no = 'CALL-15'
UNION ALL
SELECT 'goods_movement_items', created_at FROM goods_movement_items 
  WHERE movement_id IN (SELECT movement_id FROM stock_movement WHERE reference_no = 'CALL-15')
UNION ALL
SELECT 'spare_inventory', created_at FROM spare_inventory WHERE spare_id = 2 AND location_type = 'technician'
ORDER BY created_at DESC;


-- ============================================================================
-- KEY FIXES APPLIED:
-- ============================================================================
-- ✅ 1. Fixed stock_movement creation for specific call closure
-- ✅ 2. Fixed goods_movement_items creation with proper movement_id
-- ✅ 3. Fixed spare_inventory update to use technician_id from call
-- ✅ 4. Fixed calls.status_id update (was incorrectly using calls.status)
-- ✅ 5. Added handling for NULL used_by_tech_id (uses assigned_tech_id instead)
-- ✅ 6. Set substatus_id to NULL when closing call
-- ============================================================================
