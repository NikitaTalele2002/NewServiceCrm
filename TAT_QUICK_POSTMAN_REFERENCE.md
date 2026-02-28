# TAT Tracking API - Quick Postman Copy-Paste Guide

## Base URL
```
http://localhost:5000
```

## Auth Header (for all requests)
```
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json
```

---

## 1️⃣ LOGIN - Get JWT Token

**Method:** `POST`  
**URL:** `http://localhost:5000/api/auth/login`

**Body:**
```json
{
  "user_id": 501,
  "password": "your_password"
}
```

---

## 2️⃣ START TAT

**Method:** `POST`  
**URL:** `http://localhost:5000/api/technician-tracking/tat-tracking`

**Body:**
```json
{
  "call_id": 456
}
```

💾 **Save Response:** `id` value for reference

---

## 3️⃣ CHECK TAT STATUS (Optional)

**Method:** `GET`  
**URL:** `http://localhost:5000/api/technician-tracking/tat-tracking/call/456`

**Body:** (none)

---

## 4️⃣ CREATE HOLD

**Method:** `POST`  
**URL:** `http://localhost:5000/api/technician-tracking/tat-holds`

**Body:**
```json
{
  "call_id": 456,
  "hold_reason": "Waiting for spare part arrival",
  "created_by": 501
}
```

💾 **Save Response:** `tat_holds_id` value (use in next step)

---

## 5️⃣ RESOLVE HOLD

**Method:** `PUT`  
**URL:** `http://localhost:5000/api/technician-tracking/tat-holds/201/resolve`

**Body:** (empty)
```json
{}
```

---

## 6️⃣ RECORD SPARE CONSUMPTION (Optional)

**Method:** `POST`  
**URL:** `http://localhost:5000/api/technician-tracking/spare-consumption`

**Body:**
```json
{
  "call_id": 456,
  "spare_part_id": 100,
  "used_qty": 1,
  "returned_qty": 4,
  "used_by_tech_id": 501,
  "remarks": "Replaced defective part"
}
```

---

## 7️⃣ CLOSE CALL

**Method:** `POST`  
**URL:** `http://localhost:5000/api/technician-tracking/call/456/close`

**Body:**
```json
{
  "call_id": 456,
  "technician_id": 501,
  "status": "CLOSED"
}
```

---

## 8️⃣ VIEW SUMMARY

**Method:** `GET`  
**URL:** `http://localhost:5000/api/technician-tracking/summary/456`

**Body:** (none)

---

## 📝 Test Data Values

Replace these with your actual values:

```
call_id: 456              ← Use actual call ID
technician_id: 501        ← Use actual tech ID
spare_part_id: 100        ← Use actual spare ID from database
tat_holds_id: 201         ← From Step 4 response
JWT_TOKEN: (from login)   ← Use your token
```

---

## 🎯 Expected Timeline in Responses

```
Step 2: tat_start_time = NOW (e.g., 10:30:00)
Step 4: hold_start_time = NOW (e.g., 10:35:00)
Step 5: hold_end_time = NOW (e.g., 10:45:00) ✅ AUTOMATIC
Step 7: tat_end_time = NOW (e.g., 11:00:00) ✅ AUTOMATIC
Step 8: Verify all timestamps and calculations
```

---

## ✅ Success Indicators

| Step | Success Looks Like |
|------|-------------------|
| 2 | `"ok": true`, `"tat_status": "in_progress"` |
| 4 | `"ok": true`, `"hold_status": "ACTIVE"` |
| 5 | `"ok": true`, `"hold_end_time": <timestamp>`, `"tat_updated": true` |
| 6 | `"ok": true`, `"defective_tracked": true` |
| 7 | `"ok": true`, `"status": "CLOSED"`, `"tat_end_time": <timestamp>` |
| 8 | `"ok": true`, all summary data populated |

---

## 🚨 If Test Fails

1. Check server is running: `npm run dev`
2. Check JWT token is valid and not expired
3. Check call_id exists in database
4. Check technician_id exists in database
5. Check spare_part_id exists in database
6. Check database connection working
7. Check server logs for detailed error message

