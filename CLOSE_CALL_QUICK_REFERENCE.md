# Close Call API - Quick Reference Card

## 🎯 The One Request You Need

### Close Call Endpoint

```
POST http://localhost:5000/api/technician-tracking/call/456/close
```

Replace `456` with your `call_id`

---

## 📋 Request Details

### Method
```
POST
```

### Headers
```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

### Body
```json
{
  "call_id": 456,
  "technician_id": 501,
  "status": "CLOSED"
}
```

---

## ✅ Expected Response

```json
{
  "ok": true,
  "message": "Call closed and spare movements processed",
  "call_id": 456,
  "data": {
    "status": "CLOSED",
    "spare_movements": {
      "stock_movement_created": true,
      "stock_movement_id": 5001,
      "total_spares_used": 2,
      "total_qty_processed": 3,
      "inventory_updates": 2
    },
    "tat_tracking": {
      "tat_end_time": "2026-02-28T11:00:00.000Z",
      "tat_status": "completed"
    }
  }
}
```

---

## ✅ Success Checklist

- [ ] Status Code = **200** (not 400, 404, 500)
- [ ] **"ok": true**
- [ ] **"status": "CLOSED"**
- [ ] **"stock_movement_created": true**
- [ ] **"stock_movement_id"** has a number (5001, etc)
- [ ] **"total_qty_processed"** > 0
- [ ] **"inventory_updates"** > 0
- [ ] **"tat_end_time"** is populated
- [ ] **"tat_status": "completed"**

---

## 🎬 Postman Instructions (5 Steps)

### 1. Create New Request
Click **+** tab

### 2. Set Method to POST
Dropdown → **POST**

### 3. Enter URL
```
http://localhost:5000/api/technician-tracking/call/456/close
```

### 4. Add Headers & Body

**Headers Tab:**
```
Authorization: Bearer eyJhbGciOi... (your token)
Content-Type: application/json
```

**Body Tab (raw JSON):**
```json
{
  "call_id": 456,
  "technician_id": 501,
  "status": "CLOSED"
}
```

### 5. Click SEND
Wait for response...

---

## 🔄 What Happens Automatically

When you send the request, system does ALL this automatically:

```
✅ Step 1: Gets all spares used (used_qty > 0)
✅ Step 2: Creates stock_movement (GOOD → DEFECTIVE)
✅ Step 3: Creates goods_movement_items (1 per spare)
✅ Step 4: Updates spare_inventory (qty_good--, qty_defective++)
✅ Step 5: Sets TAT tat_end_time
✅ Step 6: Updates call status to CLOSED

Response: {"ok": true, "status": "CLOSED", ...}
```

---

## 📊 What Changed in Database

### Stock Movement Created
```
From: Technician GOOD inventory
To: Technician DEFECTIVE inventory
Type: DEFECTIVE_MARKING
Quantity: Total of all used spares
Status: completed
```

### Spare Inventory Updated
```
Example:
  Spare 100: qty_good 10 → 9 (decreased by 1)
  Spare 100: qty_defective 5 → 6 (increased by 1)
  
  Spare 101: qty_good 8 → 6 (decreased by 2)
  Spare 101: qty_defective 3 → 5 (increased by 2)
```

### Call Status Updated
```
Before: status = 'OPEN'
After: status = 'CLOSED'
```

### TAT Tracking Completed
```
Before: tat_end_time = NULL, tat_status = 'in_progress'
After: tat_end_time = NOW, tat_status = 'completed'
```

---

## ❌ Common Errors & Fixes

| Error | Fix |
|-------|-----|
| 404 - Call not found | Use valid call_id that exists |
| 401 - Unauthorized | Update JWT token (get fresh from login) |
| 500 - Missing spare data | Record spare consumption first (used_qty > 0) |
| 400 - Missing fields | Include all 3 fields in body (call_id, technician_id, status) |

---

## 🔍 Verify in Database (5 SQL Queries)

After getting response, run these to verify:

### 1. Stock Movement
```sql
SELECT id, stock_movement_type, bucket, destination_bucket, total_qty 
FROM stock_movement 
WHERE reference_no = 'CALL-456'
ORDER BY created_at DESC;
```
Should show: `id, DEFECTIVE_MARKING, GOOD, DEFECTIVE, 3`

### 2. Goods Items
```sql
SELECT movement_id, spare_part_id, qty, condition 
FROM goods_movement_items 
WHERE movement_id IN (SELECT id FROM stock_movement WHERE reference_no = 'CALL-456');
```
Should show items with condition='defective'

### 3. Spare Inventory
```sql
SELECT spare_id, qty_good, qty_defective 
FROM spare_inventory 
WHERE location_id = 501 AND spare_id IN (100, 101);
```
Should show: good decreased, defective increased

### 4. Call Status
```sql
SELECT call_id, status FROM calls WHERE call_id = 456;
```
Should show: status = 'CLOSED'

### 5. TAT Completed
```sql
SELECT call_id, tat_start_time, tat_end_time, tat_status 
FROM tat_tracking 
WHERE call_id = 456;
```
Should show: tat_end_time populated, tat_status='completed'

---

## 📋 Prerequisites (Before Closing)

You must do these BEFORE closing the call:

✅ **Started TAT:** `POST /tat-tracking` (sets tat_start_time)

✅ **Recorded Spares:** `POST /spare-consumption` (with used_qty > 0)
   - Spare 100: used_qty=1
   - Spare 101: used_qty=2
   - etc.

✅ **Have JWT Token:** From `POST /auth/login`

---

## 🎯 One Minute Summary

1. **Have:** Valid call_id, technician_id, JWT token
2. **Send:** `POST /call/:call_id/close` with body containing call_id, technician_id, "CLOSED"
3. **Get:** Response with status 200 and "ok": true
4. **Verify:** SQL queries show stock movement, inventory updated, call closed

**Done!** Stock movement from GOOD to DEFECTIVE happened automatically. ✅

---

## 📁 Full Documentation

- **Detailed Guide:** [HOW_TO_CLOSE_CALL_API.md](c:\Crm_dashboard\HOW_TO_CLOSE_CALL_API.md)
- **Complete Testing:** [COMPLETE_TESTING_GUIDE.md](c:\Crm_dashboard\COMPLETE_TESTING_GUIDE.md)
- **Stock Movement Details:** [STOCK_MOVEMENT_VERIFICATION.md](c:\Crm_dashboard\STOCK_MOVEMENT_VERIFICATION.md)

