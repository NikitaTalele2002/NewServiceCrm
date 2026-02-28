# Spare Request API Error Debugging Guide

## Error: "Failed to create spare request"

**Status Code:** 500  
**URL:** `http://localhost:5000/api/technician-sc-spare-requests/create`  
**Method:** POST

---

## Step 1: Check Request Body Format

The most common issue is **incorrect request body structure**.

### ✅ Correct Format:

```json
{
  "spares": [
    {
      "spareId": 1,
      "quantity": 2,
      "reason": "Optional reason"
    },
    {
      "spareId": 3,
      "quantity": 1,
      "reason": "Another spare"
    }
  ],
  "requestReason": "Need spares for call execution",
  "callId": 100,
  "remarks": "Additional remarks"
}
```

### ❌ Common Mistakes:

**Mistake 1: Wrong field names**
```json
{
  "spare": [...],           // WRONG: should be "spares" (plural)
  "reason": "...",          // WRONG: should be "requestReason"
  "callNumber": 100         // WRONG: should be "callId"
}
```

**Mistake 2: Spares not in array**
```json
{
  "spares": {               // WRONG: Spares should be ARRAY, not object
    "spareId": 1,
    "quantity": 2
  }
}
```

**Mistake 3: Empty spares array**
```json
{
  "spares": [],             // WRONG: Must have at least 1 spare
  "requestReason": "..."
}
```

**Mistake 4: Missing required field**
```json
{
  "spares": [...],
  // MISSING "requestReason" - REQUIRED FIELD
  "callId": 100
}
```

---

## Step 2: Verify Authentication

### Check Token in Headers:

**Headers must include:**
```
Authorization: Bearer <your_token_from_login>
Content-Type: application/json
```

### ✅ Test in Postman:

1. Click **Headers** tab
2. Verify this row exists:
   ```
   Authorization | Bearer {{token}}
   ```
3. Verify `{{token}}` is set in your environment (top-right dropdown shows "Local-Dev")

### ❌ If Missing Token:

You'll get **401 Unauthorized** (different error than your current 500)

To get a token:
1. POST to `/api/auth/login`
2. Body:
   ```json
   {
     "username": "technician_user",
     "password": "password123"
   }
   ```
3. Copy the token from response
4. Paste into environment variable `token`

---

## Step 3: Verify Technician Database Record

The error might be: **"Technician profile not found"**

### Check if Technician Record Exists:

```sql
-- SQL Server - Run this query

-- Step 1: Get your user_id from token
SELECT user_id, username, role FROM users WHERE username = 'technician_user';
-- Note the user_id (example: 5)

-- Step 2: Check if technician record exists for this user
SELECT 
  technician_id,
  name,
  user_id,
  service_center_id,
  status
FROM technicians
WHERE user_id = 5;  -- Replace 5 with your user_id
```

**If no results:** You need to create a technician record:

```sql
-- Create technician linked to user
INSERT INTO technicians (user_id, name, service_center_id, status, created_at)
VALUES (
  5,                    -- Your user_id
  'John Technician',    -- Your name
  1,                    -- Service center ID (must exist)
  'active',
  GETDATE()
);
```

---

## Step 4: Verify Service Center Assignment

The error might be: **"Service Center not assigned to this technician"**

### Check Service Center Assignment:

```sql
-- SQL Server
SELECT 
  technician_id,
  name,
  service_center_id
FROM technicians
WHERE technician_id = 1;  -- Replace with your technician_id
```

**If service_center_id is NULL:** Update it:

```sql
UPDATE technicians
SET service_center_id = 1  -- Replace 1 with actual service_center_id
WHERE technician_id = 1;   -- Replace with your technician_id
```

### Find Available Service Centers:

```sql
SELECT asc_id, asc_name FROM service_centers LIMIT 5;
```

---

## Step 5: Verify Spare Parts Exist

The error might be: **"Invalid spares: found X, expected Y"**

### Check if Spare ID is Valid:

```sql
-- SQL Server - Find spare parts
SELECT TOP 10 Id, PART, DESCRIPTION, BRAND
FROM spare_parts
ORDER BY Id ASC;

-- Or search by part number
SELECT Id, PART, DESCRIPTION
FROM spare_parts
WHERE PART LIKE '%motor%'  -- Example search
LIMIT 10;
```

**If you can't find any spares:** This is a data issue - need to populate spare_parts table

---

## Step 6: Full Debugging Checklist

Before testing again, verify ALL of these:

### 📋 Request Body:
```
✓ "spares" is an ARRAY (with [ ])
✓ "spares" has AT LEAST 1 item
✓ Each spare has: spareId (number), quantity (number > 0)
✓ "requestReason" is a string (not empty)
✓ "callId" is a number (optional but if provided, must be valid)
```

### 🔐 Authentication:
```
✓ Authorization header has: Bearer {{token}}
✓ token variable in Postman environment is not empty
✓ Token was obtained from /api/auth/login successfully
```

### 👤 Technician:
```
✓ User account exists in users table
✓ Technician record exists in technicians table with matching user_id
✓ Technician has service_center_id assigned (not NULL)
✓ Technician status is 'active'
```

### 🏥 Service Center:
```
✓ Service center record exists in service_centers table
✓ Service center ID matches technician's service_center_id
✓ Service center has valid asc_id and asc_name
```

### 📦 Spares:
```
✓ Spare part IDs exist in spare_parts table
✓ Spare parts are not deleted/inactive
✓ Each spare has Id, PART, and DESCRIPTION fields
```

---

## Step 7: Complete Test Request (Copy-Paste Ready)

Use this **exact format** in Postman:

### 1. Method & URL
```
Method: [POST]
URL: http://localhost:5000/api/technician-sc-spare-requests/create
```

### 2. Headers Tab
```
Authorization: Bearer {{token}}
Content-Type: application/json
```

### 3. Body Tab (Select: raw → JSON)
```json
{
  "spares": [
    {
      "spareId": 1,
      "quantity": 2
    },
    {
      "spareId": 3,
      "quantity": 1
    }
  ],
  "requestReason": "Need spares for call execution",
  "callId": 100,
  "remarks": "Test request"
}
```

### Expected Response (✓ Success):
```json
{
  "success": true,
  "data": {
    "requestId": 5,
    "requestNumber": "REQ-5",
    "technicianName": "John Technician",
    "serviceCenterName": "ASC - Mumbai",
    "itemCount": 2,
    "totalQuantity": 3,
    "status": "pending"
  },
  "message": "Spare request submitted successfully to Service Center"
}
```

---

## Step 8: Enable Server Logging

To see detailed error messages, check your server logs:

### In Terminal (where server is running):

You should see logs like:
```
🆕 TECHNICIAN SPARE REQUEST TO SERVICE CENTER
============================================================
📋 Request Data: { callId: 100, requestReason: '...', spareCount: 2 }

🔍 Step 1: Verify technician and service center...
✅ Technician verified: John Technician (ID: 1)
✅ Service Center assigned: ASC - Mumbai (ID: 4)

📦 Step 2: Validate spare parts...
✅ All 2 spare parts validated

📊 Step 3: Get status IDs...
✅ Pending status ID: 1

📝 Step 4: Create spare request...
✅ Spare request created: REQ-5

❌ If you see any ERROR messages here - that's your issue!
```

---

## Step 9: Database Query to Find Issue

Run this SQL to check everything:

```sql
-- Check user and technician link
SELECT 
  u.user_id,
  u.username,
  u.role,
  t.technician_id,
  t.name as technician_name,
  t.service_center_id,
  sc.asc_id,
  sc.asc_name
FROM users u
LEFT JOIN technicians t ON u.user_id = t.user_id
LEFT JOIN service_centers sc ON t.service_center_id = sc.asc_id
WHERE u.username = 'technician_user';
```

Expected result:
```
user_id | username          | role         | technician_id | name              | service_center_id | asc_id | asc_name
--------|------------------|--------------|---------------|-------------------|-------------------|--------|------------------
5       | technician_user  | technician   | 1             | John Technician   | 4                 | 4      | ASC - Mumbai
```

**Missing values = Missing data in database**

---

## Step 10: Most Common Fixes

### Issue 1: Empty Details in Error Response

**Cause:** Technician not found in database  
**Fix:**
```sql
INSERT INTO technicians (user_id, name, service_center_id, status, created_at)
VALUES (5, 'Tech Name', 1, 'active', GETDATE());
```

### Issue 2: Invalid Spares Error

**Cause:** Spare ID doesn't exist  
**Fix:** Query spare_parts table first:
```sql
SELECT Id FROM spare_parts LIMIT 5;
-- Use valid IDs only
```

### Issue 3: Missing Request Reason

**Cause:** requestReason field is empty  
**Fix:** Add to request body:
```json
{
  "spares": [...],
  "requestReason": "Need spares for call",  // <-- ADD THIS
  "callId": 100
}
```

### Issue 4: Invalid Spare Array

**Cause:** spares is not an array  
**Fix:** Make sure it's wrapped in [ ]:
```json
{
  "spares": [                // <-- Use [ ] not { }
    {
      "spareId": 1,
      "quantity": 2
    }
  ]
}
```

---

## Step 11: If Still Getting Error

### Option 1: Check Server Console Logs

When you submit the request, **immediately look at the terminal where your server is running**.

Look for lines starting with:
- ❌ (Error messages)
- ⚠️ (Warnings)
- 🆕 (Request start)

These show exactly where the request fails.

### Option 2: Add Console Logging

If server logs don't show details, check the response object in Postman:

Click **Response** tab → Look for:
- `error` field (main error message)
- `details` field (specific error)
- `code` field (database error code if any)

### Option 3: Database Transaction Failure

If you see "Failed to create spare request" with no details, could be:

```sql
-- Common issues:
1. spare_parts table doesn't exist
2. spare_requests table doesn't exist
3. spare_request_items table doesn't exist
4. Database user doesn't have INSERT permission

-- Check if tables exist:
SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_NAME IN ('spare_parts', 'spare_requests', 'spare_request_items');
```

---

## Quick Test Sequence

### 1. Login (get token):
```
POST http://localhost:5000/api/auth/login
Body: {"username": "technician_user", "password": "password123"}
Copy token from response
Save as {{token}} in Postman environment
```

### 2. Get available spares:
```
GET http://localhost:5000/api/technician-sc-spare-requests/spares
Header: Authorization: Bearer {{token}}
✓ Should return list of spare parts
```

### 3. Create spare request:
```
POST http://localhost:5000/api/technician-sc-spare-requests/create
Header: Authorization: Bearer {{token}}
Body: (see Step 7)
✓ Should return requestId and success: true
```

---

## Support Checklist

Before asking for help, verify:

- [ ] Token is valid and in Authorization header
- [ ] Technician record exists in database with service_center_id
- [ ] Spare part IDs exist and are valid
- [ ] Request body has ALL required fields
- [ ] Server is running on port 5000
- [ ] No errors shown in server console logs

---

**If issues persist:**
1. Check server console logs (most important!)
2. Run database verification queries above
3. Share the exact request body and response error
4. Share relevant server console log lines

