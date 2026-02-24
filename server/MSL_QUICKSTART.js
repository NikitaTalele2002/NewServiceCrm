/**
 * MSL System - Quick Start Guide & Testing
 * Shows how to use the MSL auto-generation system
 */

console.log(`
╔══════════════════════════════════════════════════════════════════╗
║  SPARE REQUEST MSL AUTO-GENERATION SYSTEM - QUICK START          ║
╚══════════════════════════════════════════════════════════════════╝

🎯 System Overview:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This system automatically generates spare requests when inventory falls 
below the Minimum Stock Level (MSL) threshold for each spare part and 
location.

📦 Inventory Data Structure:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

spare_inventory:
  ├─ spare_id: 2-11 (spare parts)
  ├─ location_type: 'service_center' | 'warehouse'
  ├─ location_id: 1, 2 (SC1, SC2)
  ├─ qty_good: Current good quantity (5-20 units)
  ├─ qty_defective: Defective quantity
  └─ qty_in_transit: In transit quantity

spare_part_msl:
  ├─ spare_part_id: 2-11
  ├─ city_tier_id: 1-3 (Tier 1 Metro, Tier 2 City, Tier 3 Town)
  ├─ minimum_stock_level_qty: Safe minimum (10-20 units)
  ├─ maximum_stock_level_qty: Replenishment target (50-100 units)
  ├─ effective_from: When MSL becomes active
  ├─ effective_to: When MSL expires (NULL = ongoing)
  └─ is_active: true/false flag

✅ What Was Implemented:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. ✅ MSL Check Service (mslCheckService.js)
   └─ Functions:
      ├─ checkMSLRequirement(spareId, locationId, currentQty)
      │  └─ Checks if item needs replenishment
      ├─ autoGenerateSpareRequest(spareId, locationId, currentQty, userId)
      │  └─ Creates request if item below MSL
      └─ scanAndAutoGenerateRequests(userId)
         └─ Scans all service centers and generates requests

2. ✅ New API Endpoints
   └─ POST /api/spare-requests/scan-msl
      └─ Triggers full inventory scan and auto-generation
   └─ POST /api/spare-requests/check-msl
      └─ Checks single item MSL status

3. ✅ Setup Scripts
   └─ migrations/insert_msl_data.js
      └─ Creates sample MSL data for all spare parts
   └─ adjust_msl_values.js
      └─ Updates MSL thresholds (for testing)
   └─ run_msl_demo.js
      └─ Complete workflow demonstration

🔄 Auto-Generation Flow:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

For each service center inventory item:

  1. Get current quantity (qty_good)
  2. Find matching MSL rule
     └─ Match by: spare_part_id + city_tier_id
  3. Compare with threshold
     └─ IF qty_good <= minimum_stock_level_qty THEN
        ┌─ Calculate shortage: maximum_stock_level_qty - qty_good
        ├─ Create SpareRequest (type: CFU)
        ├─ Create SpareRequestItem (quantity: shortage)
        └─ Status: pending (auto-generated)

📋 Sample Data After Setup:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Current Inventory:
┌────────┬──────────────────┬──────┐
│ Spare  │ Location         │ Qty  │
├────────┼──────────────────┼──────┤
│ 2      │ Service Center 1 │ 6    │ ← Below MSL (min:10)
│ 3      │ Service Center 1 │ 6    │ ← Below MSL (min:10)
│ 5      │ Service Center 1 │ 5    │ ← Below MSL (min:10)
│ 6      │ Service Center 1 │ 20   │ ← Above MSL (min:10)
│ 2      │ Service Center 2 │ 3    │ ← Below MSL (min:10)
│ 4      │ Service Center 2 │ 2    │ ← Below MSL (min:10)
└────────┴──────────────────┴──────┘

Auto-Requests Generated:
┌────┬──────────┬─────┬──────┬────────────┐
│ ID │ Spare ID │ Loc  │ Qty  │ Shortage   │
├────┼──────────┼─────┼──────┼────────────┤
│ 14 │ 2        │ SC1  │ 6    │ 44 units   │
│ 15 │ 3        │ SC1  │ 6    │ 44 units   │
│ 16 │ 5        │ SC1  │ 5    │ 45 units   │
│ 17 │ 2        │ SC2  │ 3    │ 47 units   │
│ 18 │ 4        │ SC2  │ 2    │ 48 units   │
└────┴──────────┴─────┴──────┴────────────┘

🚀 How To Use:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Step 1: Insert MSL Data
  $ node server/migrations/insert_msl_data.js
  Creates 30 MSL records (10 spares × 3 city tiers)

Step 2: Verify Setup (Optional)
  $ node server/run_msl_demo.js
  Shows current inventory vs MSL thresholds

Step 3: Trigger Auto-Generation
  Option A - Via API:
    POST http://localhost:5000/api/spare-requests/scan-msl
    Header: Authorization: Bearer <token>
  
  Option B - Via Script:
    $ node server/run_msl_demo.js

Step 4: Check Specific Item
  POST http://localhost:5000/api/spare-requests/check-msl
  Body: {
    "spareId": 2,
    "locationId": 1,
    "currentQuantity": 6
  }

⚙️  Configuration:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Adjust MSL thresholds in insert_msl_data.js:

  const mslConfig = {
    'Tier 1 - Metro': { min: 20, max: 100 },   // High demand areas
    'Tier 2 - City': { min: 15, max: 75 },     // Medium demand
    'Tier 3 - Town': { min: 10, max: 50 }      // Lower demand
  };

Or update existing values:
  $ node server/adjust_msl_values.js

📝 Important Notes:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Only service_center inventory is scanned
✓ Warehouse inventory is managed separately
✓ Request type is always 'CFU' (Consignment Fill-Up)
✓ Destination is always 'branch' (plant)
✓ Auto-generated requests have status 'pending'
✓ Service centers MUST have city_tier_id populated

🔍 Verify City Tier Assignment:
  SELECT service_center_id, city_tier_id FROM service_centers;
  
  If NULL, update:
  UPDATE service_centers SET city_tier_id = 1 WHERE city_tier_id IS NULL;

📂 Files Created/Modified:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Created:
  ✅ server/services/mslCheckService.js
  ✅ server/migrations/insert_msl_data.js
  ✅ server/run_msl_demo.js
  ✅ server/adjust_msl_values.js
  ✅ server/MSL_AUTO_GENERATION_GUIDE.md

Modified:
  ✅ server/routes/spareRequests.js (new endpoints)
  ✅ server/models/SpareRequest.js (request_type field added)
  ✅ server/constants/requestTypeConstants.js (legacy mapping)

🎓 Next Steps:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Test the system with demo script
2. Integrate into order management UI
3. Set up scheduled scans using cron/jobs
4. Add approval workflow for auto-generated requests
5. Monitor MSL effectiveness and adjust thresholds

📞 For Help:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

See: server/MSL_AUTO_GENERATION_GUIDE.md for complete documentation

╚══════════════════════════════════════════════════════════════════╝
`);
