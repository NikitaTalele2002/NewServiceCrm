# How to Close Call - Complete Step-by-Step Guide

## 🎯 Overview: What Happens When You Close a Call

When you call the **Close Call endpoint**, the system automatically:

1. ✅ Gets all spares used during the call
2. ✅ Creates a **stock movement** (GOOD → DEFECTIVE)
3. ✅ Creates **goods movement items** (one per spare)
4. ✅ Updates **technician inventory** (qty_good--, qty_defective++)
5. ✅ Updates **call status** to CLOSED
6. ✅ Completes **TAT tracking** with end time

**Everything happens automatically - no manual steps!**

---

## 📋 Prerequisites - Have Ready Before Closing

Before you can close a call, you must have already:

### 1️⃣ Started TAT Tracking
```
POST /api/technician-tracking/tat-tracking
{
  "call_id": 456
}
```
✅ This sets `tat_start_time`

### 2️⃣ Recorded All Spares Used
```
POST /api/technician-tracking/spare-consumption
{
  "call_id": 456,
  "spare_part_id": 100,
  "used_qty": 1,
  ...
}
```
✅ This records what spares were used (used_qty > 0)

**⚠️ Important:** Only spares with `used_qty > 0` will trigger stock movement when you close the call

### 3️⃣ Resolved Any Holds (Optional)
```
PUT /api/technician-tracking/tat-holds/:hold_id/resolve
```
✅ This updates total_hold_minutes in TAT

---

## 🔴 THE MAIN STEP: Close the Call

### Endpoint
```
POST /api/technician-tracking/call/:call_id/close
```

### URL Structure
```
http://localhost:5000/api/technician-tracking/call/456/close
```

Replace `456` with your actual call_id

---

## 📝 Complete API Request

### Method
```
POST
```

### Headers
```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

### Request Body
```json
{
  "call_id": 456,
  "technician_id": 501
}
```

**Field Explanations:**
- **call_id**: The call you're closing (from URL and body)
- **technician_id**: Who is closing this call (tech ID)
- ✅ **status field no longer needed** - Always closes with status_id=8 (CLOSED)

---

## ✅ Step-by-Step Execution in Postman

### Step 1: Open Postman

### Step 2: Create New Request
Click **+** tab to create new request

### Step 3: Set Method to POST
Dropdown at top left → Select **POST**

### Step 4: Enter URL
```
http://localhost:5000/api/technician-tracking/call/456/close
```

### Step 5: Add Headers
Click **Headers** tab

Add these headers:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
```

**To get the bearer token:**
1. First call: `POST /api/auth/login`
2. Get token from response
3. Copy it to Authorization header

### Step 6: Add Request Body
Click **Body** tab
Select **raw**
Select **JSON** from dropdown

Paste this:
```json
{
  "call_id": 456,
  "technician_id": 501
}
```

### Step 7: Click SEND

⏳ Wait for response...

---

## 📊 Expected Success Response (Status 200)

```json
{
  "ok": true,
  "message": "Call closed and spare movements processed",
  "call_id": 456,
  "data": {
    "call_id": 456,
    "status_id": 8,
    "status_name": "CLOSED",
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

### ✅ Verify This Response Has:

- [ ] **"ok": true** - Request succeeded
- [ ] **"status_id": 8** - Call is closed (status_id=8)
- [ ] **"status_name": "CLOSED"** - Status name for reference
- [ ] **"stock_movement_created": true** - Stock movement was created
- [ ] **"stock_movement_id": 5001** - Has an ID (note this)
- [ ] **"total_spares_used": 2** - Two spares were used
- [ ] **"total_qty_processed": 3** - Total 3 units moved (1+2)
- [ ] **"inventory_updates": 2** - Two spares' inventory updated
- [ ] **"tat_end_time"** - Is populated with timestamp
- [ ] **"tat_status": "completed"** - TAT is marked complete

---

## 🖥️ Server Console Output (What You Should See)

When you send the close call request, check the server console (where you ran `npm run dev`).

You should see:

```
========================================================================
📋 CLOSING CALL - PROCESSING SPARE USAGE
========================================================================
Call ID: 456
Technician ID: 501
New Status: CLOSED (status_id=8)

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

6️⃣ Updating call status to CLOSED (status_id=8)...
   ✅ Call status updated to CLOSED (status_id=8)

✅ CALL CLOSED SUCCESSFULLY
```

**✅ If you see all these messages → Stock movement happened successfully!**

---

## 📊 What Actually Happened in Database

### 1. Stock Movement Created

**Table: stock_movement**

```sql
id: 5001
stock_movement_type: 'DEFECTIVE_MARKING'
bucket: 'GOOD'
destination_bucket: 'DEFECTIVE'
bucket_operation: 'TRANSFER_TO_DEFECTIVE'
reference_type: 'call_spare_usage'
reference_no: 'CALL-456'
source_location_type: 'technician'
source_location_id: 501
destination_location_type: 'technician'
destination_location_id: 501
total_qty: 3
status: 'completed'
created_at: 2026-02-28 11:00:00
```

**Meaning:** 3 spares moved from technician's GOOD bucket to DEFECTIVE bucket

---

### 2. Goods Movement Items Created

**Table: goods_movement_items**

```
Movement ID: 5001, Spare 100, Qty: 1, Condition: defective
Movement ID: 5001, Spare 101, Qty: 2, Condition: defective
```

**Meaning:** Each spare tracked individually

---

### 3. Technician Inventory Updated

**Table: spare_inventory**

**Before:**
```
Spare 100: qty_good=10, qty_defective=5
Spare 101: qty_good=8,  qty_defective=3
```

**After:**
```
Spare 100: qty_good=9,  qty_defective=6  ← Used 1
Spare 101: qty_good=6,  qty_defective=5  ← Used 2
```

**Meaning:** Good stock decreased, defective stock increased

---

### 4. Call Status Updated

**Table: calls**

**Before:**
```
call_id: 456
status: 'OPEN'
```

**After:**
```
call_id: 456
status: 'CLOSED'
updated_at: 2026-02-28 11:00:00
```

---

### 5. TAT Tracking Completed

**Table: tat_tracking**

**Before:**
```
tat_start_time: 2026-02-28 10:30:00
tat_end_time: NULL
tat_status: 'in_progress'
```

**After:**
```
tat_start_time: 2026-02-28 10:30:00
tat_end_time: 2026-02-28 11:00:00
tat_status: 'completed'
```

---

## 🔍 Verify Everything in Database

After closing the call, run these SQL queries:

### Query 1: Check Stock Movement Created
```sql
SELECT TOP 1
  id,
  stock_movement_type,
  bucket,
  destination_bucket,
  bucket_operation,
  reference_no,
  total_qty,
  status
FROM stock_movement
WHERE reference_no = 'CALL-456'
ORDER BY created_at DESC;
```

**Should see:**
```
id: 5001
stock_movement_type: DEFECTIVE_MARKING
bucket: GOOD
destination_bucket: DEFECTIVE
bucket_operation: TRANSFER_TO_DEFECTIVE
reference_no: CALL-456
total_qty: 3
status: completed
```

✅ If you see this → Stock movement successful!

---

### Query 2: Check Goods Movement Items
```sql
SELECT 
  movement_id,
  spare_part_id,
  qty,
  condition
FROM goods_movement_items
WHERE movement_id = 5001;
```

**Should see:**
```
movement_id: 5001, spare_part_id: 100, qty: 1, condition: defective
movement_id: 5001, spare_part_id: 101, qty: 2, condition: defective
```

✅ If you see this → Items tracked correctly!

---

### Query 3: Check Spare Inventory Updated
```sql
SELECT 
  spare_id,
  location_type,
  location_id,
  qty_good,
  qty_defective
FROM spare_inventory
WHERE location_id = 501
  AND spare_id IN (100, 101);
```

**Should see:**
```
spare_id: 100, location_type: technician, location_id: 501, qty_good: 9, qty_defective: 6
spare_id: 101, location_type: technician, location_id: 501, qty_good: 6, qty_defective: 5
```

✅ If you see this → Inventory updated correctly!

---

### Query 4: Check Call Status
```sql
SELECT call_id, status, updated_at
FROM calls
WHERE call_id = 456;
```

**Should see:**
```
call_id: 456
status: CLOSED
updated_at: 2026-02-28 11:00:00 (recent timestamp)
```

✅ If you see this → Call closed successfully!

---

### Query 5: Check TAT Completed
```sql
SELECT 
  id,
  call_id,
  tat_start_time,
  tat_end_time,
  tat_status,
  DATEDIFF(MINUTE, tat_start_time, tat_end_time) as total_tat_minutes
FROM tat_tracking
WHERE call_id = 456;
```

**Should see:**
```
id: 1
call_id: 456
tat_start_time: 2026-02-28 10:30:00
tat_end_time: 2026-02-28 11:00:00
tat_status: completed
total_tat_minutes: 30
```

✅ If you see this → TAT completed successfully!

---

## ❌ Common Errors & Solutions

### Error 1: Status 404 - "Call not found"
**Cause:** Invalid call_id in URL  
**Solution:** Check call_id exists in database
```sql
SELECT call_id, status FROM calls WHERE call_id = 456;
```

### Error 2: Status 500 - "Cannot read property 'spare_part_id'"
**Cause:** No spare_consumption records exist for this call  
**Solution:** First record spares:
```sql
SELECT call_id, spare_part_id, used_qty 
FROM call_spare_usage 
WHERE call_id = 456 AND used_qty > 0;
```

### Error 3: Status 400 - "Missing required fields"
**Cause:** Request body missing call_id or technician_id  
**Solution:** Include both fields in body:
```json
{
  "call_id": 456,
  "technician_id": 501,
  "status": "CLOSED"
}
```

### Error 4: Status 401 - "Unauthorized"
**Cause:** Invalid or missing JWT token  
**Solution:** Get fresh token from login
```
POST /api/auth/login
{
  "user_id": 501,
  "password": "your_password"
}
```

### Error 5: No stock movement created
**Cause:** No spares with used_qty > 0  
**Solution:** Check spare_consumption records:
```sql
SELECT call_id, spare_part_id, used_qty 
FROM call_spare_usage 
WHERE call_id = 456;
```
Ensure `used_qty > 0`

---

## 📋 Complete Workflow Example

Here's the **complete sequence** from start to finish:

### Step 1: Get JWT Token
```
POST /api/auth/login
Body: { "user_id": 501, "password": "password" }
Response: { "token": "eyJ..." }
```
💾 Save token

### Step 2: Start TAT
```
POST /api/technician-tracking/tat-tracking
Body: { "call_id": 456 }
✅ tat_start_time = NOW
```

### Step 3: Record Spares Used
```
POST /api/technician-tracking/spare-consumption
Body: { "call_id": 456, "spare_part_id": 100, "used_qty": 1, ... }
✅ Recorded spare 100, used 1 unit
```

```
POST /api/technician-tracking/spare-consumption
Body: { "call_id": 456, "spare_part_id": 101, "used_qty": 2, ... }
✅ Recorded spare 101, used 2 units
```

### Step 4: Create Hold (Optional)
```
POST /api/technician-tracking/tat-holds
Body: { "call_id": 456, "hold_reason": "Waiting for spare", ... }
✅ hold_start_time = NOW
```

### Step 5: Resolve Hold (Optional)
```
PUT /api/technician-tracking/tat-holds/:hold_id/resolve
✅ hold_end_time = NOW
✅ total_hold_minutes updated in TAT
```

### Step 6: CLOSE THE CALL 🎯
```
POST /api/technician-tracking/call/456/close
Body: { "call_id": 456, "technician_id": 501, "status": "CLOSED" }

✅ Stock movement created
✅ Goods movement items created
✅ Spare inventory updated
✅ Call status set to CLOSED
✅ TAT end_time set
✅ TAT status set to completed
```

### Step 7: View Summary
```
GET /api/technician-tracking/summary/456
✅ See complete call lifecycle with all data
```

---

## ✅ Final Checklist - Call Closure

Before you close a call, ensure:

- [ ] TAT tracking started (tat_start_time set)
- [ ] At least 1 spare consumption recorded (used_qty > 0)
- [ ] Any holds have been resolved
- [ ] You have valid JWT token
- [ ] You know the call_id and technician_id

When closing, verify:

- [ ] API response status = 200
- [ ] "ok": true in response
- [ ] "status": "CLOSED" in response
- [ ] "stock_movement_created": true
- [ ] "stock_movement_id" has value
- [ ] Server console shows all 6 steps
- [ ] SQL queries confirm all updates

---

## 🎯 Summary

**To close a call and trigger stock movement:**

1. **GET JWT token** from login endpoint
2. **POST** to `/api/technician-tracking/call/456/close`
3. **Include body:**
   ```json
   {
     "call_id": 456,
     "technician_id": 501,
     "status": "CLOSED"
   }
   ```
4. **System automatically:**
   - ✅ Creates stock movement (GOOD → DEFECTIVE)
   - ✅ Creates goods movement items
   - ✅ Updates technician inventory
   - ✅ Closes the call
   - ✅ Completes TAT tracking

**Status 200 + "ok": true = Success!** 🎉

