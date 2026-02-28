# Complete Testing Guide - TAT Tracking + Stock Movement

## 📋 Test Prerequisites

Before starting, ensure you have:

✅ Server running: `npm run dev` in `C:\Crm_dashboard\server`  
✅ Postman installed (or use browser's REST client)  
✅ Valid test data (call_id, technician_id, spare_part_id)  
✅ Database accessible  

---

## 🔧 Step 1: Prepare Test Data

### 1a. Get JWT Token
First, you need an authentication token.

**Method:** POST  
**URL:** `http://localhost:5000/api/auth/login`

**Body:**
```json
{
  "user_id": 501,
  "password": "your_password"
}
```

**Expected Response:**
```json
{
  "ok": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "user_id": 501,
    "name": "Technician Name",
    "role": "technician"
  }
}
```

**Action:** 
- Copy the `token` value
- Use it in all subsequent requests
- Header: `Authorization: Bearer <your_token>`

---

### 1b. Verify Test Data Exists

Run these SQL queries to ensure you have valid data:

**Query 1: Check Call Exists**
```sql
SELECT TOP 1 call_id, ref_call_id, status, assigned_tech_id
FROM calls
WHERE call_id = 456 OR status = 'OPEN'
ORDER BY call_id DESC;
```
💾 Note the `call_id` and `assigned_tech_id` for testing

**Query 2: Check Technician Exists**
```sql
SELECT TOP 1 user_id, name, role
FROM users
WHERE user_id = 501 OR role = 'technician'
ORDER BY user_id DESC;
```
💾 Note the `user_id`

**Query 3: Check Spare Part Exists**
```sql
SELECT TOP 3 Id, PART, DESCRIPTION
FROM spare_parts
WHERE Id IN (100, 101, 102)
   OR PART LIKE '%COMPR%';
```
💾 Note the `Id` (spare_part_id)

**Query 4: Check Spare Approval Exists**
```sql
SELECT TOP 1
  sr.request_id,
  sr.requested_by_id,
  sri.spare_part_id,
  sri.approved_qty,
  sr.request_status
FROM spare_requests sr
INNER JOIN spare_request_items sri ON sr.request_id = sri.request_id
WHERE sr.requested_by_id = 501
  AND sri.approved_qty > 0
  AND sr.request_status = 'approved'
ORDER BY sr.created_date DESC;
```
💾 Note: This confirms spares are available for the technician

---

## 🧪 Test Execution (8 Steps)

### TEST STEP 1: Start TAT Tracking

**Method:** POST  
**URL:** `http://localhost:5000/api/technician-tracking/tat-tracking`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

**Body:**
```json
{
  "call_id": 456
}
```

**Expected Response (Status 200):**
```json
{
  "ok": true,
  "message": "TAT tracking started",
  "id": 1,
  "data": {
    "call_id": 456,
    "tat_status": "in_progress",
    "tat_start_time": "2026-02-28T10:30:00.000Z"
  }
}
```

**✅ Verification:**
- [ ] Response status = 200
- [ ] `ok` = true
- [ ] `tat_status` = "in_progress"
- [ ] `tat_start_time` is populated with current timestamp

**Console Check:**
Server should log:
```
✅ TAT tracking started for call 456
```

---

### TEST STEP 2: Record Spare Consumption

Simulate technician using spares to fix the call.

**Method:** POST  
**URL:** `http://localhost:5000/api/technician-tracking/spare-consumption`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

**Body (Example 1 - First Spare):**
```json
{
  "call_id": 456,
  "spare_part_id": 100,
  "used_qty": 1,
  "returned_qty": 4,
  "used_by_tech_id": 501,
  "remarks": "Replaced defective motor"
}
```

**Expected Response (Status 200):**
```json
{
  "ok": true,
  "message": "Spare consumption recorded successfully with defective tracking",
  "usage_id": 1,
  "data": {
    "call_id": 456,
    "spare_part_id": 100,
    "spare_name": "COMPRESSOR",
    "issued_qty": 5,
    "issued_qty_source": "Request 50 (approved)",
    "used_qty": 1,
    "returned_qty": 4,
    "usage_status": "PARTIAL",
    "technician_id": 501,
    "defective_tracked": true,
    "remarks": "Replaced defective motor"
  }
}
```

**✅ Verification:**
- [ ] Response status = 200
- [ ] `ok` = true
- [ ] `usage_status` = "PARTIAL" or "USED"
- [ ] `defective_tracked` = true
- [ ] `issued_qty_source` shows approval reference

**Now Record 2nd Spare (Optional):**

**Body (Example 2 - Second Spare):**
```json
{
  "call_id": 456,
  "spare_part_id": 101,
  "used_qty": 2,
  "returned_qty": 3,
  "used_by_tech_id": 501,
  "remarks": "Replaced defective pump"
}
```

**Expected Response:** Similar to above, but for spare 101

**Console Check:**
```
✅ Spare consumption recorded
   Spare 100: 1 unit USED
   Spare 101: 2 units USED
```

---

### TEST STEP 3: Create a TAT Hold

Simulate technician encountering a blocker (waiting for spare, part arrival, etc).

**Method:** POST  
**URL:** `http://localhost:5000/api/technician-tracking/tat-holds`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

**Body:**
```json
{
  "call_id": 456,
  "hold_reason": "Waiting for spare part from service center",
  "created_by": 501
}
```

**Expected Response (Status 200):**
```json
{
  "ok": true,
  "message": "TAT hold recorded",
  "tat_holds_id": 201,
  "data": {
    "call_id": 456,
    "hold_reason": "Waiting for spare part from service center",
    "hold_start_time": "2026-02-28T10:35:00.000Z",
    "hold_status": "ACTIVE"
  }
}
```

**✅ Verification:**
- [ ] Response status = 200
- [ ] `ok` = true
- [ ] `hold_status` = "ACTIVE"
- [ ] `hold_start_time` is populated
- [ ] Save `tat_holds_id` (use in next step)

**Console Check:**
```
⏸️ TAT HOLD CREATED
Call ID: 456
Hold Reason: Waiting for spare part from service center
```

---

### TEST STEP 4: Resolve the Hold

Simulate issue being resolved (spare arrived, part fixed, etc).

**Method:** PUT  
**URL:** `http://localhost:5000/api/technician-tracking/tat-holds/201/resolve`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

**Body:** (empty)
```json
{}
```

**Expected Response (Status 200):**
```json
{
  "ok": true,
  "message": "TAT hold resolved",
  "data": {
    "tat_holds_id": 201,
    "call_id": 456,
    "hold_reason": "Waiting for spare part from service center",
    "hold_start_time": "2026-02-28T10:35:00.000Z",
    "hold_end_time": "2026-02-28T10:45:00.000Z",
    "hold_duration_minutes": 10,
    "tat_updated": true,
    "message": "Hold resolved. Hold duration (10 minutes) added to TAT's total_hold_minutes"
  }
}
```

**✅ Verification:**
- [ ] Response status = 200
- [ ] `ok` = true
- [ ] `hold_end_time` is populated (automatic)
- [ ] `hold_duration_minutes` = 10 (calculated)
- [ ] `tat_updated` = true (TAT was updated)
- [ ] Message confirms hold duration added to TAT

**Console Check:**
```
⏸️ RESOLVING TAT HOLD
Hold ID: 201
Hold Duration: 10 minutes
Call ID: 456

✅ TAT tracking updated:
   Total Hold Minutes: 10
   Elapsed Minutes: 15
```

---

### TEST STEP 5: Create Additional Hold (Optional)

To test multiple holds tracking:

**Method:** POST  
**URL:** `http://localhost:5000/api/technician-tracking/tat-holds`

**Body:**
```json
{
  "call_id": 456,
  "hold_reason": "Waiting for customer confirmation",
  "created_by": 501
}
```

**Expected Response:**
```json
{
  "ok": true,
  "tat_holds_id": 202,
  ...
}
```

**Save the new `tat_holds_id` = 202**

---

### TEST STEP 6: Resolve Second Hold (Optional)

**Method:** PUT  
**URL:** `http://localhost:5000/api/technician-tracking/tat-holds/202/resolve`

**Body:** `{}`

**Expected:** Similar to Step 4, but different hold_id and duration

**Result:** total_hold_minutes will accumulate (10 + new_hold_duration)

---

### TEST STEP 7: Close the Call ⭐ MAIN TEST

This triggers all stock movement and TAT completion.

**Method:** POST  
**URL:** `http://localhost:5000/api/technician-tracking/call/456/close`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
Content-Type: application/json
```

**Body:**
```json
{
  "call_id": 456,
  "technician_id": 501,
  "status": "CLOSED"
}
```

**Expected Response (Status 200):**
```json
{
  "ok": true,
  "message": "Call closed and spare movements processed",
  "call_id": 456,
  "data": {
    "call_id": 456,
    "status": "CLOSED",
    "spare_movements": {
      "stock_movement_created": true,
      "stock_movement_id": 5001,
      "total_spares_used": 2,
      "total_qty_processed": 3,
      "inventory_updates": 2
    },
    "tat_tracking": {
      "message": "TAT end time set to current time (call closure time)",
      "tat_end_time": "2026-02-28T11:00:00.000Z",
      "tat_status": "completed"
    }
  }
}
```

**✅ Verification:**
- [ ] Response status = 200
- [ ] `ok` = true
- [ ] `status` = "CLOSED"
- [ ] `stock_movement_created` = true
- [ ] `stock_movement_id` is populated
- [ ] `total_qty_processed` = 3 (total of all used qty)
- [ ] `inventory_updates` = 2 (one per spare)
- [ ] `tat_end_time` is populated
- [ ] `tat_status` = "completed"

**Console Check (MOST IMPORTANT 👀):**
```
========================================================================
📋 CLOSING CALL - PROCESSING SPARE USAGE
========================================================================
Call ID: 456
Technician ID: 501
New Status: CLOSED

1️⃣ Getting spare usage records...
   Found 2 spare usage record(s) with used_qty > 0
   Total used quantity: 3
   Technician ID: 501

2️⃣ Creating SINGLE stock movement (technician internal transfer)...
   ✅ Stock movement created: ID=5001
      Movement: GOOD → DEFECTIVE (technician inventory)
      Type: DEFECTIVE_MARKING | Operation: TRANSFER_TO_DEFECTIVE
      Quantity: 3 | Technician: 501

3️⃣ Creating goods movement items...
   ✅ Goods item created: spare_id=100, qty=1
   ✅ Goods item created: spare_id=101, qty=2

4️⃣ Updating spare inventory...
   ✅ Inventory updated: spare_id=100, qty_good-=1, qty_defective+=1
   ✅ Inventory updated: spare_id=101, qty_good-=2, qty_defective+=2

5️⃣ Updating TAT tracking - Setting tat_end_time...
   ✅ TAT tracking completed:
      Start Time: 2026-02-28T10:30:00.000Z
      End Time: 2026-02-28T11:00:00.000Z
      Total TAT: 30 minutes

6️⃣ Updating call status to CLOSED...
   ✅ Call status updated to CLOSED

✅ CALL CLOSED SUCCESSFULLY
```

---

### TEST STEP 8: View Complete Summary

Get complete picture of the call lifecycle.

**Method:** GET  
**URL:** `http://localhost:5000/api/technician-tracking/summary/456`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Expected Response (Status 200):**
```json
{
  "ok": true,
  "call_id": 456,
  "summary": {
    "spares": {
      "count": 2,
      "consumed": 2,
      "partial": 0,
      "unused": 0,
      "details": [
        {
          "usage_id": 1,
          "spare_part_id": 100,
          "spare_name": "COMPRESSOR",
          "brand": "EMERSON",
          "issued_qty": 5,
          "used_qty": 1,
          "returned_qty": 4,
          "usage_status": "PARTIAL"
        },
        {
          "usage_id": 2,
          "spare_part_id": 101,
          "spare_name": "PUMP",
          "brand": "GRUNDFOS",
          "issued_qty": 5,
          "used_qty": 2,
          "returned_qty": 3,
          "usage_status": "PARTIAL"
        }
      ]
    },
    "tat": {
      "id": 1,
      "tat_start_time": "2026-02-28T10:30:00.000Z",
      "tat_end_time": "2026-02-28T11:00:00.000Z",
      "tat_status": "completed",
      "total_hold_minutes": 10,
      "elapsed_minutes": 30,
      "status_label": "Resolved"
    },
    "holds": {
      "count": 1,
      "active": 0,
      "resolved": 1,
      "details": [
        {
          "tat_holds_id": 201,
          "hold_reason": "Waiting for spare part from service center",
          "hold_start_time": "2026-02-28T10:35:00.000Z",
          "hold_end_time": "2026-02-28T10:45:00.000Z",
          "hold_duration_minutes": 10,
          "hold_status": "RESOLVED"
        }
      ]
    }
  }
}
```

**✅ Verification:**
- [ ] Response status = 200
- [ ] `ok` = true
- [ ] 2 spares consumed
- [ ] TAT: start=10:30, end=11:00, total=30 minutes
- [ ] Hold: duration=10 minutes, status=RESOLVED
- [ ] total_hold_minutes = 10
- [ ] Actual work time = 30 - 10 = 20 minutes

---

## 🗄️ Database Verification Queries

After completing all test steps, run these SQL queries to verify data integrity:

### Query 1: Verify TAT Tracking

```sql
SELECT 
  id,
  call_id,
  tat_start_time,
  tat_end_time,
  tat_status,
  total_hold_minutes,
  DATEDIFF(MINUTE, tat_start_time, tat_end_time) as total_tat_minutes
FROM tat_tracking
WHERE call_id = 456;
```

**Expected Result:**
```
id  call_id  tat_start_time           tat_end_time             tat_status  total_hold_minutes  total_tat_minutes
1   456      2026-02-28 10:30:00.000  2026-02-28 11:00:00.000  completed   10                  30
```

✅ Checks:
- tat_end_time is populated
- tat_status = 'completed'
- total_hold_minutes = 10
- total_tat_minutes = 30

---

### Query 2: Verify Hold Tracking

```sql
SELECT 
  tat_holds_id,
  call_id,
  hold_reason,
  hold_start_time,
  hold_end_time,
  DATEDIFF(MINUTE, hold_start_time, hold_end_time) as hold_duration_minutes
FROM tat_holds
WHERE call_id = 456
ORDER BY tat_holds_id;
```

**Expected Result:**
```
tat_holds_id  call_id  hold_reason                                hold_start_time         hold_end_time           hold_duration_minutes
201           456      Waiting for spare part from service center  2026-02-28 10:35:00    2026-02-28 10:45:00    10
```

✅ Checks:
- hold_end_time is populated
- hold_duration_minutes calculated correctly
- Matches TAT's total_hold_minutes

---

### Query 3: Verify Stock Movement Created

```sql
SELECT TOP 1
  id,
  stock_movement_type,
  bucket,
  destination_bucket,
  bucket_operation,
  reference_type,
  reference_no,
  source_location_type,
  source_location_id,
  destination_location_type,
  destination_location_id,
  total_qty,
  status,
  created_at
FROM stock_movement
WHERE reference_no = 'CALL-456'
ORDER BY created_at DESC;
```

**Expected Result:**
```
id    stock_movement_type  bucket  destination_bucket  bucket_operation        reference_type     reference_no  source_location_type  source_location_id  destination_location_type  destination_location_id  total_qty  status     created_at
5001  DEFECTIVE_MARKING    GOOD    DEFECTIVE           TRANSFER_TO_DEFECTIVE  call_spare_usage    CALL-456      technician            501                 technician                 501                      3          completed  2026-02-28 11:00:00
```

✅ Checks:
- stock_movement_type = 'DEFECTIVE_MARKING'
- bucket = 'GOOD', destination_bucket = 'DEFECTIVE'
- bucket_operation = 'TRANSFER_TO_DEFECTIVE'
- total_qty = 3 (sum of all used spares)
- status = 'completed'

---

### Query 4: Verify Goods Movement Items

```sql
SELECT 
  id,
  movement_id,
  spare_part_id,
  qty,
  condition
FROM goods_movement_items
WHERE movement_id IN (
  SELECT id FROM stock_movement WHERE reference_no = 'CALL-456'
);
```

**Expected Result:**
```
id  movement_id  spare_part_id  qty  condition
1   5001         100            1    defective
2   5001         101            2    defective
```

✅ Checks:
- One item per spare
- qty = used_qty
- condition = 'defective'
- All linked to same movement_id

---

### Query 5: Verify Spare Inventory Updated

```sql
SELECT 
  spare_id,
  location_type,
  location_id,
  qty_good,
  qty_defective,
  (qty_good + qty_defective) as total_qty,
  updated_at
FROM spare_inventory
WHERE location_type = 'technician'
  AND location_id = 501
ORDER BY updated_at DESC;
```

**Expected Result (showing recent updates):**
```
spare_id  location_type  location_id  qty_good  qty_defective  total_qty  updated_at
100       technician     501          9         6              15         2026-02-28 11:00:00
101       technician     501          6         5              11         2026-02-28 11:00:00
```

✅ Checks:
- qty_good decreased (100: 10→9, 101: 8→6)
- qty_defective increased (100: 5→6, 101: 3→5)
- Totals match expectation

---

### Query 6: Verify Call Closure

```sql
SELECT 
  call_id,
  ref_call_id,
  status,
  assigned_tech_id,
  updated_at
FROM calls
WHERE call_id = 456;
```

**Expected Result:**
```
call_id  ref_call_id  status  assigned_tech_id  updated_at
456      CALL-2026-001  CLOSED  501               2026-02-28 11:00:00
```

✅ Checks:
- status = 'CLOSED'
- updated_at = recent timestamp

---

### Query 7: Verify Spare Consumption Records

```sql
SELECT 
  usage_id,
  call_id,
  spare_part_id,
  issued_qty,
  used_qty,
  returned_qty,
  usage_status
FROM call_spare_usage
WHERE call_id = 456
ORDER BY usage_id;
```

**Expected Result:**
```
usage_id  call_id  spare_part_id  issued_qty  used_qty  returned_qty  usage_status
1         456      100            5           1         4             PARTIAL
2         456      101            5           2         3             PARTIAL
```

✅ Checks:
- Records match what was posted
- usage_status = PARTIAL (some returned)
- Totals: used=3, returned=7, issued=10

---

## 📊 Summary Verification

After running all 8 test steps and 7 SQL queries:

### TAT Tracking
```
✅ tat_start_time: 10:30 (automatic)
✅ tat_end_time: 11:00 (automatic on close)
✅ total_tat_minutes: 30 (calculated)
✅ total_hold_minutes: 10 (accumulated from holds)
✅ actual_work_time: 20 (30 - 10)
```

### Stock Movement
```
✅ Stock movement created: ID=5001
✅ Movement type: DEFECTIVE_MARKING
✅ Direction: GOOD → DEFECTIVE
✅ Operation: TRANSFER_TO_DEFECTIVE
✅ Quantity: 3 (all spares combined)
```

### Inventory
```
✅ Spare 100: Good 10→9 (-1), Defective 5→6 (+1)
✅ Spare 101: Good 8→6 (-2), Defective 3→5 (+2)
✅ Location: Always technician (501)
```

### Call Status
```
✅ Call status: CLOSED
✅ Technician: 501
✅ Timestamp: Updated to closure time
```

---

## ✅ Final Checklist

Before marking test as PASSED:

| Component | Check | Status |
|-----------|-------|--------|
| TAT Start | tat_start_time populated | ☐ |
| TAT End | tat_end_time populated | ☐ |
| Hold Created | hold_start_time populated | ☐ |
| Hold Resolved | hold_end_time populated | ☐ |
| Hold Duration | Calculated correctly | ☐ |
| TAT Calculations | total_hold_minutes accumulated | ☐ |
| Stock Movement | Created with correct bucket fields | ☐ |
| Goods Items | One per spare with defective condition | ☐ |
| Inventory Good | Decreased by used_qty | ☐ |
| Inventory Defective | Increased by used_qty | ☐ |
| Call Status | Updated to CLOSED | ☐ |
| All Timestamps | Are recent and correct | ☐ |
| No Errors | All responses status 200 | ☐ |

**When all checked: ✅ TESTING COMPLETE & PASSED** 🎉

