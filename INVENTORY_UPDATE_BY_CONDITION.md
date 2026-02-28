# Stock Movement & Inventory Update Architecture

## Overview
The inventory system has been refactored to handle **mixed-condition stock movements** properly. A single stock movement can contain both GOOD and DEFECTIVE items, and inventory must be updated accordingly.

## Problem with Old Approach
### Old (Incorrect) Design:
```
stock_movement table had:
  - bucket: 'GOOD' (movement level - single value)
  - bucket_operation: 'TRANSFER_TO_DEFECTIVE'
  - bucket_impact: 'INTERNAL_TRANSFER'
```

**Issue:** Cannot handle movements with mixed conditions:
- 1 good spare + 1 defective spare in same return
- Only one bucket could be set at movement level
- Inventory updates were inaccurate

## New Correct Approach
### Core Principle:
**Inventory updates are based on individual item conditions in `goods_movement_items`, NOT the movement-level bucket**

### Architecture:

#### 1. Stock Movement Table
```sql
stock_movement
├── id (PK)
├── stock_movement_type: 'TECH_RETURN_TO_SC', 'DEFECTIVE_MARKING', etc.
├── reference_type: 'spare_request', 'call_spare_usage'
├── reference_no: Unique identifier
├── source_location_type: 'technician', 'service_center'
├── source_location_id: Technician/SC ID
├── destination_location_type: 'technician', 'service_center', 'service_center'
├── destination_location_id: Target location ID
├── total_qty: Sum of all items in movement
├── status: 'completed', 'pending'
└── ❌ REMOVED: bucket, bucket_operation, bucket_impact
    (These are now determined PER-ITEM in goods_movement_items)
```

#### 2. Goods Movement Items Table
```sql
goods_movement_items
├── movement_id (FK → stock_movement.id)
├── spare_part_id
├── qty: Quantity of this item
├── condition: 'good' or 'defective'  ← Item-level condition!
└── carton_id (if applicable)
```

### Flow Examples:

#### Example 1: Simple Good Condition Return
```
Technician returns 2 units of Spare #100 (both good)

1. Insert into stock_movement:
   - type: 'TECH_RETURN_TO_SC'
   - source: technician(11)
   - destination: service_center(2)
   - total_qty: 2
   - (NO bucket field)
   ✓ Result: movement_id = 126

2. Insert into goods_movement_items:
   - movement_id: 126
   - spare_part_id: 100
   - qty: 2
   - condition: 'good'

3. Update Inventory (based on condition):
   - Technician #11, Spare #100: qty_good -= 2
   - Service Center #2, Spare #100: qty_good += 2
```

#### Example 2: Mixed Condition Return (Real Scenario!)
```
Technician returns 3 units of Spare #100:
  - 2 units in good condition
  - 1 unit defective (not working)

1. Insert into stock_movement:
   - type: 'TECH_RETURN_TO_SC'
   - source: technician(11)
   - destination: service_center(2)
   - total_qty: 3
   ✓ Result: movement_id = 127

2. Insert into goods_movement_items (TWO records):
   Item A:
   - movement_id: 127
   - spare_part_id: 100
   - qty: 2
   - condition: 'good'     ← Separate from defective
   
   Item B:
   - movement_id: 127
   - spare_part_id: 100
   - qty: 1
   - condition: 'defective' ← Separate from good

3. Update Inventory (based on each item's condition):
   - Technician #11, Spare #100: qty_good -= 2, qty_defective -= 1
   - Service Center #2, Spare #100: qty_good += 2, qty_defective += 1
```

## Implementation: Inventory Update Query Pattern

### OLD (Incorrect) Pattern:
```javascript
// WRONG - uses movement.bucket (single value)
if (movement.bucket === 'GOOD') {
  // Update qty_good
} else if (movement.bucket === 'DEFECTIVE') {
  // Update qty_defective
}
```

### NEW (Correct) Pattern:
```javascript
// Get all items in movement with their conditions
SELECT 
  gmi.spare_part_id,
  gmi.qty,
  gmi.condition
FROM goods_movement_items gmi
WHERE gmi.movement_id = ?

// For each item, update based on its condition:
for each item {
  if (item.condition === 'good') {
    UPDATE spare_inventory SET qty_good = qty_good + item.qty
  } else if (item.condition === 'defective') {
    UPDATE spare_inventory SET qty_defective = qty_defective + item.qty
  }
}
```

## Files Updated

### 1. Backend Routes (API Endpoints)

#### `/api/technician-spare-returns/create` (Create Return Request)
- ✅ Creates separate spare_request_items for each condition
- Each item has: spareId, requestedQty, **condition** (good/defective)
- When creating goods_movement_items: uses condition from spare_request_items
- **Location:** `c:\Crm_dashboard\server\routes\technician-spare-returns.js:130-176`

#### `/api/technician-spare-returns/:returnId/receive` (ASC Approve Return)
- ✅ Creates stock_movement WITHOUT bucket columns
- Creates goods_movement_items with condition from spare_request_items
- **Inventory Update** (in verify step):
  - Reads goods_movement_items.condition
  - Updates qty_good OR qty_defective based on condition
- **Location:** `c:\Crm_dashboard\server\routes\technician-spare-returns.js:505-620`

#### `/api/technician-spare-returns/:returnId/verify` (ASC Verify Return)
- ✅ Inventory updates based on goods_movement_items.condition
- For each item, checks condition and updates correct qty bucket
- **Location:** `c:\Crm_dashboard\server\routes\technician-spare-returns.js:722-805`

#### `/api/technician-tracking/call/:id/close` (Close Call - Mark Defective)
- ✅ Creates stock_movement WITHOUT bucket columns
- Creates goods_movement_items with condition: 'defective'
- **Location:** `c:\Crm_dashboard\server\routes\technician-tracking.js:978-1085`

### 2. Frontend Components

#### `c:\Crm_dashboard\client\src\components\ReturnApprovalForm.jsx`
- ✅ Displays condition badge for each item (Good/Defective)
- Shows condition visually before approval
- **Lines:** 139-144 (condition column added to table)

#### `c:\Crm_dashboard\client\src\components\RentalReturn.css`
- ✅ Added styling for condition badges
- `.condition-badge` class for visual differentiation
- **Lines:** 575-594

#### `c:\Crm_dashboard\client\src\services\rentalReturnService.js`
- ✅ Updated submitReturns to separate items by condition
- Creates two items if both good and defective quantities exist
- **Location:** 188-238

## Database Schema

### stock_movement (Revised)
```sql
CREATE TABLE stock_movement (
    id INT PRIMARY KEY IDENTITY,
    stock_movement_type VARCHAR(50),        -- TECH_RETURN_TO_SC, DEFECTIVE_MARKING
    reference_type VARCHAR(50),             -- spare_request, call_spare_usage
    reference_no VARCHAR(100),
    source_location_type VARCHAR(50),       -- technician, service_center
    source_location_id INT,
    destination_location_type VARCHAR(50),  -- technician, service_center
    destination_location_id INT,
    total_qty INT,
    movement_date DATETIME,
    created_by INT,
    status VARCHAR(50),
    created_at DATETIME,
    updated_at DATETIME
    -- ❌ REMOVED: bucket, bucket_operation, bucket_impact
);
```

### goods_movement_items (Key Table)
```sql
CREATE TABLE goods_movement_items (
    id INT PRIMARY KEY IDENTITY,
    movement_id INT FOREIGN KEY -> stock_movement.id,
    spare_part_id INT FOREIGN KEY -> spare_parts.id,
    qty INT,
    condition VARCHAR(50),      -- ✅ KEY FIELD: 'good' or 'defective'
    carton_id INT FOREIGN KEY,
    created_at DATETIME,
    updated_at DATETIME
);
```

## Testing the New System

### Test Case: Mixed Condition Return
```javascript
// 1. Technician submits return with mixed conditions
POST /api/technician-spare-returns/create
{
  items: [
    { spareId: 100, requestedQty: 2, condition: 'good' },
    { spareId: 100, requestedQty: 1, condition: 'defective' }
  ]
}
// Result: Request 113 created ✓

// 2. Check spare_request_items
SELECT * FROM spare_request_items WHERE request_id = 113
// Should show 2 items (one good, one defective) ✓

// 3. ASC Approves return
POST /api/technician-spare-returns/113/receive

// 4. Check goods_movement_items
SELECT * FROM goods_movement_items WHERE movement_id = 126
// Should show 2 items with different conditions ✓

// 5. Check inventory after verify
SELECT qty_good, qty_defective 
FROM spare_inventory 
WHERE spare_id = 100 AND location_id = 2
// qty_good += 2, qty_defective += 1 ✓
```

## FAQ

### Q: What if a movement has no items?
A: total_qty should be 0. Only movements with items should be created.

### Q: Can I still use bucket field?
A: No. It's been removed from all new movements. Historical data may still have it, but ignore it during inventory updates.

### Q: How do I determine inventory changes per item?
A: Query `goods_movement_items` table for the movement, grouped by spare_id and condition, then update accordingly.

### Q: What if goods_movement_items.condition is NULL?
A: Default to 'good'. But this shouldn't happen with the updated code - always set condition explicitly.

## Rollout Checklist

- [x] Remove bucket columns from stock_movement inserts in technician-tracking.js
- [x] Remove bucket columns from stock_movement inserts in technician-spare-returns.js
- [x] Update inventory logic to use goods_movement_items.condition
- [x] Add condition column to spare_request_items
- [x] Update frontend to collect condition from technician
- [x] Add condition badges to approval form
- [x] Test with mixed good/defective return
- [ ] Review all other stock_movement creation endpoints
- [ ] Update inventory calculation reports/queries

## Related Files

- Inventory Model: `c:\Crm_dashboard\server\models\SpareInventory.js`
- Stock Movement Model: `c:\Crm_dashboard\server\models\StockMovement.js`
- Goods Movement Items Model: `c:\Crm_dashboard\server\models\GoodsMovementItems.js`
- Test for verification: `c:\Crm_dashboard\server\verify_goods_movement_items.js`
