# TAT Tracking API - Complete Postman Testing Guide

## 📋 Prerequisites

Before testing, ensure:
- ✅ Server running on `http://localhost:5000`
- ✅ Valid JWT token (from `/api/auth/login`)
- ✅ Call ID exists (e.g., 456)
- ✅ Technician ID exists (e.g., 501)
- ✅ Spare part ID exists in database (e.g., 100)
- ✅ Spare approval exists for technician (approved_qty > 0)

---

## 🧪 Complete Workflow Test (8 Steps)

### **STEP 1: Get Valid JWT Token**
Needed for all subsequent requests (if API requires authentication)

**Method:** POST  
**URL:** `http://localhost:5000/api/auth/login`

**Body (JSON):**
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
    "name": "John Technician",
    "role": "technician"
  }
}
```

**Action:** Copy the `token` value for use in next requests' Authorization header  
(Header: `Authorization: Bearer <token>`)

---

### **STEP 2: Start TAT Tracking**
⏱️ System automatically records start time

**Method:** POST  
**URL:** `http://localhost:5000/api/technician-tracking/tat-tracking`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <your_jwt_token>
```

**Body (JSON):**
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
    "tat_start_time": "2026-02-27T10:30:00.000Z"
  }
}
```

**Verify:**
- ✅ `tat_start_time` is current time (automatic)
- ✅ `tat_status` = "in_progress"
- Save `id` = 1 for later reference

**What Happened in Database:**
```sql
INSERT INTO tat_tracking (call_id, tat_start_time, tat_status, total_hold_minutes)
VALUES (456, GETDATE(), 'in_progress', 0)
```

---

### **STEP 3: Check TAT Status (Optional - For Verification)**
View current TAT tracking without making changes

**Method:** GET  
**URL:** `http://localhost:5000/api/technician-tracking/tat-tracking/call/456`

**Headers:**
```
Authorization: Bearer <your_jwt_token>
```

**Expected Response:**
```json
{
  "ok": true,
  "data": {
    "id": 1,
    "call_id": 456,
    "ref_call_id": "CALL-2026-001",
    "tat_start_time": "2026-02-27T10:30:00.000Z",
    "tat_end_time": null,
    "tat_status": "in_progress",
    "total_hold_minutes": 0,
    "elapsed_minutes": 5
  }
}
```

**Verify:**
- ✅ `tat_end_time` is NULL (not yet closed)
- ✅ `elapsed_minutes` shows time passed since start
- ✅ `total_hold_minutes` still 0 (no holds yet)

---

### **STEP 4: Create a TAT Hold**
⏸️ System automatically records hold start time (when technician encounters a blocker)

**Method:** POST  
**URL:** `http://localhost:5000/api/technician-tracking/tat-holds`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <your_jwt_token>
```

**Body (JSON):**
```json
{
  "call_id": 456,
  "hold_reason": "Waiting for spare part SKU-2026-001 from service center",
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
    "hold_reason": "Waiting for spare part SKU-2026-001 from service center",
    "hold_start_time": "2026-02-27T10:35:00.000Z",
    "hold_status": "ACTIVE"
  }
}
```

**Verify:**
- ✅ `hold_start_time` is current time (automatic)
- ✅ `hold_status` = "ACTIVE"
- Save `tat_holds_id` = 201 for Step 5

**What Happened in Database:**
```sql
INSERT INTO tat_holds (call_id, hold_reason, hold_start_time, created_by)
VALUES (456, 'Waiting...', GETDATE(), 501)
```

---

### **STEP 5: Resolve the Hold**
✅ System automatically records hold end time + updates TAT total hold minutes

**Method:** PUT  
**URL:** `http://localhost:5000/api/technician-tracking/tat-holds/201/resolve`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <your_jwt_token>
```

**Body (JSON):**
```json
{}
```
OR empty body is fine.

**Expected Response (Status 200):**
```json
{
  "ok": true,
  "message": "TAT hold resolved",
  "data": {
    "tat_holds_id": 201,
    "call_id": 456,
    "hold_reason": "Waiting for spare part SKU-2026-001 from service center",
    "hold_start_time": "2026-02-27T10:35:00.000Z",
    "hold_end_time": "2026-02-27T10:45:00.000Z",
    "hold_duration_minutes": 10,
    "tat_updated": true,
    "message": "Hold resolved. Hold duration (10 minutes) added to TAT's total_hold_minutes"
  }
}
```

**Verify:**
- ✅ `hold_end_time` is current time (automatic)
- ✅ `hold_duration_minutes` = 10 (calculated: 10:45 - 10:35)
- ✅ `tat_updated: true` indicates TAT was updated
- ✅ Message confirms hold duration was added to total_hold_minutes

**What Happened in Database:**
```sql
-- Update 1: Set hold end time
UPDATE tat_holds
SET hold_end_time = GETDATE()
WHERE tat_holds_id = 201

-- Update 2: Add hold duration to TAT tracking
UPDATE tat_tracking
SET total_hold_minutes = ISNULL(total_hold_minutes, 0) + 10
WHERE call_id = 456
```

---

### **STEP 6: Record Spare Consumption** (Optional - If Spares Used)
Track which spares were used during the call

**Method:** POST  
**URL:** `http://localhost:5000/api/technician-tracking/spare-consumption`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <your_jwt_token>
```

**Body (JSON):**
```json
{
  "call_id": 456,
  "spare_part_id": 100,
  "used_qty": 1,
  "returned_qty": 4,
  "used_by_tech_id": 501,
  "remarks": "Replaced defective motor with spare"
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
    "remarks": "Replaced defective motor with spare"
  }
}
```

**Verify:**
- ✅ `usage_status` = "PARTIAL" (some returned)
- ✅ `defective_tracked: true` (used_qty > 0)
- ✅ `issued_qty_source` shows the approval request
- Save `usage_id` for reference

**What Happened in Database:**
```sql
-- Record usage
INSERT INTO call_spare_usage (call_id, spare_part_id, issued_qty, used_qty, returned_qty)
VALUES (456, 100, 5, 1, 4)

-- Track defective part in technician inventory
UPDATE spare_inventory
SET qty_good = qty_good - 1,
    qty_defective = qty_defective + 1
WHERE spare_id = 100 AND location_type = 'technician' AND location_id = 501
```

---

### **STEP 7: Close the Call**
🏁 System automatically records TAT end time + calculates total TAT minutes

**Method:** POST  
**URL:** `http://localhost:5000/api/technician-tracking/call/456/close`

**Headers:**
```
Content-Type: application/json
Authorization: Bearer <your_jwt_token>
```

**Body (JSON):**
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
      "total_spares_used": 1,
      "total_qty_processed": 1,
      "inventory_updates": 1
    },
    "tat_tracking": {
      "message": "TAT end time set to current time (call closure time)",
      "tat_end_time": "2026-02-27T11:00:00.000Z",
      "tat_status": "completed"
    }
  }
}
```

**Verify:**
- ✅ `tat_end_time` is current time (automatic)
- ✅ `tat_status` = "completed"
- ✅ `stock_movement_created: true` (spares tracked)
- ✅ `status` = "CLOSED"

**What Happened in Database:**
```sql
-- Set TAT end time
UPDATE tat_tracking
SET tat_end_time = GETDATE(),
    tat_status = 'completed'
WHERE call_id = 456

-- Update call status
UPDATE calls
SET status = 'CLOSED'
WHERE call_id = 456

-- Create stock movement for defective tracking
INSERT INTO stock_movement (...)
VALUES (...)
```

---

### **STEP 8: View Final Summary**
✅ Get complete picture of the entire call lifecycle

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
      "count": 1,
      "consumed": 1,
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
        }
      ]
    },
    "tat": {
      "id": 1,
      "tat_start_time": "2026-02-27T10:30:00.000Z",
      "tat_end_time": "2026-02-27T11:00:00.000Z",
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
          "hold_reason": "Waiting for spare part SKU-2026-001 from service center",
          "hold_start_time": "2026-02-27T10:35:00.000Z",
          "hold_end_time": "2026-02-27T10:45:00.000Z",
          "hold_duration_minutes": 10,
          "hold_status": "RESOLVED"
        }
      ]
    }
  }
}
```

**Verify Complete Lifecycle:**
- ✅ TAT: Start=10:30, End=11:00, Total=30 minutes
- ✅ Hold: Start=10:35, End=10:45, Duration=10 minutes
- ✅ Actual Work Time = 30 - 10 = 20 minutes (excluding hold)
- ✅ Spares: 1 consumed, 4 returned
- ✅ Call Status: CLOSED

---

## 📊 Summary of Test Results

| Step | Operation | Auto-Set Timestamp | Status |
|------|-----------|-------------------|--------|
| 2 | TAT Start | ✅ `tat_start_time=10:30` | ✅ PASS |
| 4 | Hold Start | ✅ `hold_start_time=10:35` | ✅ PASS |
| 5 | Hold Resolve | ✅ `hold_end_time=10:45` + Duration=10min | ✅ PASS |
| 6 | Spare Record | ✅ Defective tracking active | ✅ PASS |
| 7 | Call Close | ✅ `tat_end_time=11:00` + Total=30min | ✅ PASS |
| 8 | Summary | ✅ All data consistent | ✅ PASS |

---

## ⚠️ Common Errors & Solutions

### **Error 1: "Spare part ID XX does not exist"**
**Cause:** spare_part_id doesn't exist in database  
**Solution:** Verify spare_part_id in database
```sql
SELECT TOP 10 Id, PART, DESCRIPTION FROM spare_parts
```

### **Error 2: "No approved spare request found"**
**Cause:** No approved spare request for this technician  
**Solution:** Create and approve a spare request first
```sql
SELECT * FROM spare_requests 
WHERE requested_by_id = 501 
  AND request_status = 'approved'
```

### **Error 3: "TAT hold not found"**
**Cause:** Invalid hold_id in PUT request  
**Solution:** Use correct hold_id from Step 4 response

### **Error 4: "Call XX not found"**
**Cause:** Invalid call_id  
**Solution:** Use valid call_id that exists in calls table

### **Error 5: Status 500 "Transaction Failed"**
**Cause:** Database constraint violation or missing table  
**Solution:** Check server logs for detailed error message

---

## 🎯 Expected Calculations

After completing workflow:

**Total TAT Time:**
```
= tat_end_time - tat_start_time
= 11:00 - 10:30
= 30 minutes
```

**Total Hold Time:**
```
= sum of all hold_duration_minutes
= 10 minutes
```

**Actual Work Time:**
```
= total_tat_minutes - total_hold_minutes
= 30 - 10
= 20 minutes
```

---

## 🔍 Verification Queries

Run these SQL queries to verify data correctness:

**1. Check TAT Tracking:**
```sql
SELECT id, call_id, tat_start_time, tat_end_time, tat_status,
       DATEDIFF(MINUTE, tat_start_time, tat_end_time) as total_tat_minutes,
       total_hold_minutes
FROM tat_tracking
WHERE call_id = 456
```

**2. Check Holds:**
```sql
SELECT tat_holds_id, call_id, hold_reason, hold_start_time, hold_end_time,
       DATEDIFF(MINUTE, hold_start_time, hold_end_time) as hold_duration_minutes,
       hold_status = CASE WHEN hold_end_time IS NULL THEN 'ACTIVE' ELSE 'RESOLVED' END
FROM tat_holds
WHERE call_id = 456
```

**3. Check Spare Consumption:**
```sql
SELECT usage_id, call_id, spare_part_id, issued_qty, used_qty, returned_qty, usage_status
FROM call_spare_usage
WHERE call_id = 456
```

**4. Check Call Status:**
```sql
SELECT call_id, status, assigned_tech_id, created_at, updated_at
FROM calls
WHERE call_id = 456
```

---

## ✅ Final Checklist

Before declaring complete:

- [ ] All 8 steps executed successfully
- [ ] No errors in any response
- [ ] All timestamps are automatic (system-set)
- [ ] Total TAT = 30 minutes (in this example)
- [ ] Total Hold = 10 minutes
- [ ] Calculated Work Time = 20 minutes
- [ ] Call Status = CLOSED
- [ ] Spare Consumption recorded
- [ ] Summary endpoint shows all data consistently
- [ ] Database verification queries return correct data

**✅ READY FOR PRODUCTION!**

