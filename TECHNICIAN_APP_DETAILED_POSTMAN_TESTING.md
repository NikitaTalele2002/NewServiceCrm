# Technician App APIs - Detailed Postman Testing Instructions

**Complete Step-by-Step Guide for Testing All 20 APIs**

**Status:** Ready for Testing  
**Date:** February 27, 2026  
**Port:** 5000 (NOT 3000)  
**Base URL:** `http://localhost:5000`

---

## Table of Contents

1. [Authentication (1 API)](#section-1-authentication)
2. [Spare Request to Service Center (2 APIs)](#section-2-spare-request-to-service-center)
3. [Spare Return to Service Center (3 APIs)](#section-3-spare-return-to-service-center)
4. [Spare Consumption Tracking (3 APIs)](#section-4-spare-consumption-tracking)
5. [TAT Tracking (3 APIs)](#section-5-tat-tracking)
6. [TAT Holds Management (4 APIs)](#section-6-tat-holds-management)
7. [Call Management (2 APIs)](#section-7-call-management)
8. [Spare Tracking History (2 APIs)](#section-8-spare-tracking-history)

---

## SECTION 1: AUTHENTICATION

### Step 1: Test Login - Get Token

#### 1.1 Login with Credentials

1. **Click Collection Request**
   ```
   Collections
   └── Technician App APIs
       └── 1. Authentication
           └── 1.1 Login ← Click
   ```

2. **View Request**
   ```
   Method: [POST] ▼
   URL: {{SERVER_URL}}/api/auth/login
   
   Headers:
   ├── Content-Type: application/json
   
   Body (raw JSON):
   {
     "username": "technician_user",
     "password": "password123"
   }
   ```

3. **Update Credentials (if needed)**
   - Replace `technician_user` with actual username
   - Replace `password123` with actual password
   - Check your database for valid technician credentials

4. **Click "Send"** button (top right)

5. **View Response**
   ```
   ✓ Status: 200 OK
   
   Response Body:
   {
     "success": true,
     "message": "Login successful",
     "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
     "user": {
       "id": 1,
       "username": "technician_user",
       "role": "technician"
     }
   }
   ```

6. **Copy Token from Response**
   - Highlight entire token value (long string starting with "eyJ...")
   - Right-click → Copy
   - Or: Ctrl+C

7. **Save Token to Environment Variable**
   - Click Gear Icon ⚙️ (top right)
   - Click "Manage Environments"
   - Find "Local-Dev" environment
   - In `token` row → paste in "Current Value" column
   - Click Save button
   - Close environment panel

8. **Verify Token is Set**
   - Top-right dropdown should show "Local-Dev"
   - All subsequent requests will use `Bearer {{token}}`

**Test Cases:**
```
✓ Test 1: Valid username/password → Returns token (Status 200)
✓ Test 2: Invalid username → Error (Status 401)
✓ Test 3: Invalid password → Error (Status 401)
✓ Test 4: Missing username → Error (Status 400)
```

---

## SECTION 2: SPARE REQUEST TO SERVICE CENTER (RENTAL ALLOCATION)

### Step 2: Create Spare Request

1. **Click Collection Request**
   ```
   Collections
   └── Technician App APIs
       └── 2. Spare Request to Service Center
           └── 2.1 Create Spare Request ← Click
   ```

2. **View Request**
   ```
   Method: [POST] ▼
   URL: {{SERVER_URL}}/api/technician-sc-spare-requests/create
   
   Headers:
   ├── Authorization: Bearer {{token}}
   ├── Content-Type: application/json
   
   Body (raw JSON):
   {
     "spares": [
       {
         "spareId": 1,
         "quantity": 2,
         "reason": "Replacement during call"
       },
       {
         "spareId": 3,
         "quantity": 1,
         "reason": "Additional stock"
       }
     ],
     "requestReason": "Need spares for call execution",
     "callId": 100,
     "remarks": "Urgent request"
   }
   ```

3. **Update Request Values (Important)**
   - `spareId`: Replace 1, 3 with valid spare IDs from your database
   - `callId`: Replace 100 with actual call ID assigned to you
   - `quantity`: Adjust quantity as needed
   - `requestReason` and `remarks`: Optional, can be customized

4. **Verify Authorization Header**
   - Click "Headers" tab
   - Verify: `Authorization: Bearer {{token}}`
   - This uses the token you saved earlier

5. **Click "Send"** button

6. **View Response**
   ```
   ✓ Status: 200 OK
   
   Response Body:
   {
     "success": true,
     "message": "Spare request created successfully",
     "requestId": 5,
     "requestNumber": "REQ-5",
     "totalItems": 2
   }
   ```

7. **Save Request ID for Next Test**
   - Note the `requestId`: 5 (your number will be different)
   - Copy this number → Paste in Postman environment variable `requestId`
   - You'll use this in next request (Get Request Details)

**Test Cases:**
```
✓ Test 1: Valid spares and callId → Request created (Status 200)
✓ Test 2: Missing spares array → Error (Status 400)
✓ Test 3: Zero quantity → Error (Status 400)
✓ Test 4: Invalid spareId → Error (Status 400)
✓ Test 5: No Authorization token → Error (Status 401)
```

---

### Step 3: Get Spare Request Details

1. **Click Collection Request**
   ```
   Collections
   └── Technician App APIs
       └── 2. Spare Request to Service Center
           └── 2.2 Get Request Details ← Click
   ```

2. **View Request**
   ```
   Method: [GET] ▼
   URL: {{SERVER_URL}}/api/technician-sc-spare-requests/{{requestId}}
   
   Headers:
   ├── Authorization: Bearer {{token}}
   ├── Content-Type: application/json
   
   Body: (None - GET requests don't have body)
   ```

3. **Update Request ID**
   - URL shows: `/{{requestId}}`
   - {{requestId}} automatically replaced from environment variable
   - Or manually replace with: `/5`
   - Example URL: `http://localhost:5000/api/technician-sc-spare-requests/5`

4. **Click "Send"** button

5. **View Response**
   ```
   ✓ Status: 200 OK
   
   Response Body:
   {
     "success": true,
     "requestId": 5,
     "request": {
       "request_id": 5,
       "request_number": "REQ-5",
       "requested_source_id": 1,
       "service_center_id": 4,
       "status_name": "pending",
       "created_at": "2026-02-27T10:00:00Z",
       "items": [
         {
           "spare_id": 1,
           "spare_code": "SP001",
           "spare_name": "Compressor Unit",
           "requested_qty": 2
         },
         {
           "spare_id": 3,
           "spare_code": "SP003",
           "spare_name": "Condenser Coil",
           "requested_qty": 1
         }
       ]
     }
   }
   ```

**Test Cases:**
```
✓ Test 1: Valid requestId → Returns details (Status 200)
✓ Test 2: Invalid requestId (9999) → Not Found (Status 404)
✓ Test 3: No token → Unauthorized (Status 401)
```

---

## SECTION 3: SPARE RETURN TO SERVICE CENTER

### Step 4: Create Spare Return Request

1. **Click Collection Request**
   ```
   Collections
   └── Technician App APIs
       └── 3. Spare Return to Service Center
           └── 3.1 Create Return Request ← Click
   ```

2. **View Request**
   ```
   Method: [POST] ▼
   URL: {{SERVER_URL}}/api/technician-spare-returns/create
   
   Headers:
   ├── Authorization: Bearer {{token}}
   ├── Content-Type: application/json
   
   Body (raw JSON):
   {
     "callId": 100,
     "items": [
       {
         "spareId": 1,
         "qty_good": 1,
         "qty_defective": 1,
         "remarks": "Used 1 unit, 1 defective"
       },
       {
         "spareId": 3,
         "qty_good": 1,
         "qty_defective": 0,
         "remarks": "Not needed"
       }
     ],
     "requestReason": "Returning unused and defective spares",
     "remarks": "Call completed"
   }
   ```

3. **Update Request Values**
   - `callId`: Same as previous request (100)
   - `spareId`: Match spares from previous request
   - `qty_good`: Number of good spares to return
   - `qty_defective`: Number of defective spares to return
   - Ensure qty_good + qty_defective <= qty_requested from step 2

4. **Click "Send"** button

5. **View Response**
   ```
   ✓ Status: 200 OK
   
   Response Body:
   {
     "success": true,
     "message": "Spare return request created successfully",
     "requestId": 101,
     "totalItems": 2
   }
   ```

6. **Save Return ID**
   - Note the `requestId`: 101
   - Update environment variable: `returnId = 101`

**Test Cases:**
```
✓ Test 1: Valid defective & good items → Return created (Status 200)
✓ Test 2: All good items (defective=0) → Created (Status 200)
✓ Test 3: Missing callId → Error (Status 400)
✓ Test 4: Empty items array → Error (Status 400)
```

---

### Step 5: Get All Return Requests

1. **Click Collection Request**
   ```
   Collections
   └── Technician App APIs
       └── 3. Spare Return to Service Center
           └── 3.2 Get All Returns ← Click
   ```

2. **View Request**
   ```
   Method: [GET] ▼
   URL: {{SERVER_URL}}/api/technician-spare-returns/
   
   Headers:
   ├── Authorization: Bearer {{token}}
   ├── Content-Type: application/json
   
   Body: (None)
   ```

3. **Click "Send"** button

4. **View Response**
   ```
   ✓ Status: 200 OK
   
   Response Body:
   {
     "success": true,
     "data": [
       {
         "request_id": 101,
         "request_number": "RET-101",
         "call_id": 100,
         "status": "Pending",
         "created_at": "2026-02-27T10:30:00Z",
         "items_count": 2
       },
       {
         "request_id": 102,
         "request_number": "RET-102",
         "call_id": 105,
         "status": "Pending",
         "created_at": "2026-02-27T11:00:00Z",
         "items_count": 1
       }
     ],
     "count": 2
   }
   ```

**Test Cases:**
```
✓ Test 1: With return records → Returns list (Status 200)
✓ Test 2: No returns yet → Returns empty array (Status 200)
✓ Test 3: No token → Unauthorized (Status 401)
```

---

### Step 6: Get Specific Return Request Details

1. **Click Collection Request**
   ```
   Collections
   └── Technician App APIs
       └── 3. Spare Return to Service Center
           └── 3.3 Get Return Details ← Click
   ```

2. **View Request**
   ```
   Method: [GET] ▼
   URL: {{SERVER_URL}}/api/technician-spare-returns/{{returnId}}
   
   Headers:
   ├── Authorization: Bearer {{token}}
   ├── Content-Type: application/json
   
   Body: (None)
   ```

3. **Update Return ID**
   - URL shows: `/{{returnId}}`
   - Uses environment variable `returnId = 101`
   - Manually: `/101`

4. **Click "Send"** button

5. **View Response**
   ```
   ✓ Status: 200 OK
   
   Response Body:
   {
     "success": true,
     "data": {
       "request_id": 101,
       "request_number": "RET-101",
       "call_id": 100,
       "status": "Pending",
       "items": [
         {
           "request_item_id": 45,
           "spare_id": 1,
           "spare_code": "SP001",
           "spare_name": "Compressor Unit",
           "qty_requested": 2,
           "qty_good": 1,
           "qty_defective": 1,
           "remarks": "Used 1 unit, 1 defective"
         }
       ]
     }
   }
   ```

**Test Cases:**
```
✓ Test 1: Valid returnId → Returns details (Status 200)
✓ Test 2: Invalid returnId (9999) → Not Found (Status 404)
```

---

## SECTION 4: SPARE CONSUMPTION TRACKING

### Step 7: Log Spare Usage

1. **Click Collection Request**
   ```
   Collections
   └── Technician App APIs
       └── 4. Spare Consumption Tracking
           └── 4.1 Log Spare Usage ← Click
   ```

2. **View Request**
   ```
   Method: [POST] ▼
   URL: {{SERVER_URL}}/api/technician-tracking/spare-consumption
   
   Headers:
   ├── Authorization: Bearer {{token}}
   ├── Content-Type: application/json
   
   Body (raw JSON):
   {
     "callId": 100,
     "spare_part_id": 1,
     "used_qty": 2,
     "remarks": "Replaced faulty unit"
   }
   ```

3. **Update Request Values**
   - `callId`: Same as previous (100)
   - `spare_part_id`: Spare ID (1)
   - `used_qty`: Quantity used (1-5)
   - `remarks`: Optional notes

4. **Click "Send"** button

5. **View Response**
   ```
   ✓ Status: 200 OK
   
   Response Body:
   {
     "success": true,
     "message": "Spare consumption logged successfully",
     "consumptionId": 42,
     "spareId": 1,
     "usedQty": 2
   }
   ```

**Test Cases:**
```
✓ Test 1: Valid spare usage → Logged (Status 200)
✓ Test 2: Zero quantity → Error (Status 400)
✓ Test 3: Negative quantity → Error (Status 400)
✓ Test 4: Missing callId → Error (Status 400)
```

---

### Step 8: Get All Spare Consumption History

1. **Click Collection Request**
   ```
   Collections
   └── Technician App APIs
       └── 4. Spare Consumption Tracking
           └── 4.2 Get Consumption History ← Click
   ```

2. **View Request**
   ```
   Method: [GET] ▼
   URL: {{SERVER_URL}}/api/technician-tracking/spare-consumption
   
   Headers:
   ├── Authorization: Bearer {{token}}
   ├── Content-Type: application/json
   
   Body: (None)
   ```

3. **Click "Send"** button

4. **View Response**
   ```
   ✓ Status: 200 OK
   
   Response Body:
   {
     "success": true,
     "data": [
       {
         "consumption_id": 42,
         "call_id": 100,
         "spare_id": 1,
         "spare_code": "SP001",
         "spare_name": "Compressor Unit",
         "used_qty": 2,
         "usage_date": "2026-02-27T10:15:00Z",
         "remarks": "Replaced faulty unit"
       },
       {
         "consumption_id": 43,
         "call_id": 100,
         "spare_id": 3,
         "spare_code": "SP003",
         "spare_name": "Condenser Coil",
         "used_qty": 1,
         "usage_date": "2026-02-27T10:20:00Z"
       }
     ],
     "count": 2
   }
   ```

---

### Step 9: Get Spares Used in Specific Call

1. **Click Collection Request**
   ```
   Collections
   └── Technician App APIs
       └── 4. Spare Consumption Tracking
           └── 4.3 Get Spares for Call ← Click
   ```

2. **View Request**
   ```
   Method: [GET] ▼
   URL: {{SERVER_URL}}/api/technician-tracking/spare-consumption/call/{{callId}}
   
   Headers:
   ├── Authorization: Bearer {{token}}
   ├── Content-Type: application/json
   
   Body: (None)
   ```

3. **Update Call ID**
   - URL shows: `/call/{{callId}}`
   - Uses environment variable `callId = 100`
   - Or manually: `/call/100`

4. **Click "Send"** button

5. **View Response**
   ```
   ✓ Status: 200 OK
   
   Response Body:
   {
     "success": true,
     "callId": 100,
     "data": [
       {
         "consumption_id": 42,
         "spare_id": 1,
         "spare_code": "SP001",
         "spare_name": "Compressor Unit",
         "used_qty": 2
       }
     ],
     "count": 1
   }
   ```

---

## SECTION 5: TAT (TURNAROUND TIME) TRACKING

### Step 10: Create TAT Record

1. **Click Collection Request**
   ```
   Collections
   └── Technician App APIs
       └── 5. TAT Tracking
           └── 5.1 Create TAT Record ← Click
   ```

2. **View Request**
   ```
   Method: [POST] ▼
   URL: {{SERVER_URL}}/api/technician-tracking/tat-tracking
   
   Headers:
   ├── Authorization: Bearer {{token}}
   ├── Content-Type: application/json
   
   Body (raw JSON):
   {
     "callId": 100,
     "startTime": "2026-02-27T10:00:00Z",
     "endTime": "2026-02-27T11:30:00Z",
     "delayMinutes": 0,
     "remarks": "Call completed on time"
   }
   ```

3. **Update Request Values**
   - `callId`: Same as previous (100)
   - `startTime`: When call started (ISO 8601 format)
   - `endTime`: When call ended
   - `delayMinutes`: Delay if any (0 if on time)
   - Use current date: YYYY-MM-DD (replace 2026-02-27 with today's date)

4. **Click "Send"** button

5. **View Response**
   ```
   ✓ Status: 200 OK
   
   Response Body:
   {
     "success": true,
     "message": "TAT record created successfully",
     "tatId": 23,
     "totalTime": "1 hour 30 minutes"
   }
   ```

**Test Cases:**
```
✓ Test 1: Valid times → TAT created (Status 200)
✓ Test 2: endTime before startTime → Error (Status 400)
✓ Test 3: Missing startTime → Error (Status 400)
✓ Test 4: Invalid date format → Error (Status 400)
```

---

### Step 11: Get All TAT Records

1. **Click Collection Request**
   ```
   Collections
   └── Technician App APIs
       └── 5. TAT Tracking
           └── 5.2 Get All TAT Records ← Click
   ```

2. **View Request**
   ```
   Method: [GET] ▼
   URL: {{SERVER_URL}}/api/technician-tracking/tat-tracking
   
   Headers:
   ├── Authorization: Bearer {{token}}
   ├── Content-Type: application/json
   
   Body: (None)
   ```

3. **Click "Send"** button

4. **View Response**
   ```
   ✓ Status: 200 OK
   
   Response Body:
   {
     "success": true,
     "data": [
       {
         "tat_id": 23,
         "call_id": 100,
         "start_time": "2026-02-27T10:00:00Z",
         "end_time": "2026-02-27T11:30:00Z",
         "total_minutes": 90,
         "delay_minutes": 0,
         "remarks": "Call completed on time"
       }
     ],
     "count": 1
   }
   ```

---

### Step 12: Get TAT for Specific Call

1. **Click Collection Request**
   ```
   Collections
   └── Technician App APIs
       └── 5. TAT Tracking
           └── 5.3 Get TAT for Call ← Click
   ```

2. **View Request**
   ```
   Method: [GET] ▼
   URL: {{SERVER_URL}}/api/technician-tracking/tat-tracking/call/{{callId}}
   
   Headers:
   ├── Authorization: Bearer {{token}}
   ├── Content-Type: application/json
   
   Body: (None)
   ```

3. **Update Call ID**
   - URL shows: `/call/{{callId}}`
   - Uses environment variable `callId = 100`

4. **Click "Send"** button

5. **View Response**
   ```
   ✓ Status: 200 OK
   
   Response Body:
   {
     "success": true,
     "callId": 100,
     "data": {
       "tat_id": 23,
       "call_id": 100,
       "start_time": "2026-02-27T10:00:00Z",
       "end_time": "2026-02-27T11:30:00Z",
       "total_minutes": 90
     }
   }
   ```

---

## SECTION 6: TAT HOLDS MANAGEMENT

### Step 13: Create TAT Hold

1. **Click Collection Request**
   ```
   Collections
   └── Technician App APIs
       └── 6. TAT Holds Management
           └── 6.1 Create TAT Hold ← Click
   ```

2. **View Request**
   ```
   Method: [POST] ▼
   URL: {{SERVER_URL}}/api/technician-tracking/tat-holds
   
   Headers:
   ├── Authorization: Bearer {{token}}
   ├── Content-Type: application/json
   
   Body (raw JSON):
   {
     "callId": 100,
     "holdReason": "Waiting for spare parts",
     "remarks": "Expected delivery in 2 hours"
   }
   ```

3. **Update Request Values**
   - `callId`: Same as previous (100)
   - `holdReason`: Reason for hold (required)
   - `remarks`: Additional notes (optional)

4. **Click "Send"** button

5. **View Response**
   ```
   ✓ Status: 200 OK
   
   Response Body:
   {
     "success": true,
     "message": "TAT hold created successfully",
     "holdId": 67,
     "callId": 100,
     "status": "Active"
   }
   ```

6. **Save Hold ID**
   - Note the `holdId`: 67
   - Update environment variable: `holdId = 67`

**Test Cases:**
```
✓ Test 1: Valid hold reason → Hold created (Status 200)
✓ Test 2: Missing holdReason → Error (Status 400)
✓ Test 3: Invalid callId → Error (Status 400)
```

---

### Step 14: Get All TAT Holds

1. **Click Collection Request**
   ```
   Collections
   └── Technician App APIs
       └── 6. TAT Holds Management
           └── 6.2 Get All TAT Holds ← Click
   ```

2. **View Request**
   ```
   Method: [GET] ▼
   URL: {{SERVER_URL}}/api/technician-tracking/tat-holds
   
   Headers:
   ├── Authorization: Bearer {{token}}
   ├── Content-Type: application/json
   
   Body: (None)
   ```

3. **Click "Send"** button

4. **View Response**
   ```
   ✓ Status: 200 OK
   
   Response Body:
   {
     "success": true,
     "data": [
       {
         "hold_id": 67,
         "call_id": 100,
         "hold_reason": "Waiting for spare parts",
         "status": "Active",
         "created_at": "2026-02-27T10:45:00Z",
         "resolved_at": null,
         "remarks": "Expected delivery in 2 hours"
       }
     ],
     "count": 1
   }
   ```

---

### Step 15: Get Holds for Specific Call

1. **Click Collection Request**
   ```
   Collections
   └── Technician App APIs
       └── 6. TAT Holds Management
           └── 6.3 Get Holds for Call ← Click
   ```

2. **View Request**
   ```
   Method: [GET] ▼
   URL: {{SERVER_URL}}/api/technician-tracking/tat-holds/call/{{callId}}
   
   Headers:
   ├── Authorization: Bearer {{token}}
   ├── Content-Type: application/json
   
   Body: (None)
   ```

3. **Update Call ID**
   - URL shows: `/call/{{callId}}`
   - Uses environment variable `callId = 100`

4. **Click "Send"** button

5. **View Response**
   ```
   ✓ Status: 200 OK
   
   Response Body:
   {
     "success": true,
     "callId": 100,
     "data": [
       {
         "hold_id": 67,
         "hold_reason": "Waiting for spare parts",
         "status": "Active",
         "created_at": "2026-02-27T10:45:00Z"
       }
     ],
     "count": 1
   }
   ```

---

### Step 16: Resolve TAT Hold

1. **Click Collection Request**
   ```
   Collections
   └── Technician App APIs
       └── 6. TAT Holds Management
           └── 6.4 Resolve TAT Hold ← Click
   ```

2. **View Request**
   ```
   Method: [PUT] ▼
   URL: {{SERVER_URL}}/api/technician-tracking/tat-holds/{{holdId}}/resolve
   
   Headers:
   ├── Authorization: Bearer {{token}}
   ├── Content-Type: application/json
   
   Body (raw JSON):
   {
     "resolveNotes": "Spare parts received, resuming work"
   }
   ```

3. **Update Hold ID**
   - URL shows: `/{{holdId}}/resolve`
   - Uses environment variable `holdId = 67`
   - Or manually: `/67/resolve`

4. **Update Resolve Notes**
   - Customize the `resolveNotes` message if desired

5. **Click "Send"** button

6. **View Response**
   ```
   ✓ Status: 200 OK
   
   Response Body:
   {
     "success": true,
     "message": "TAT hold resolved successfully",
     "holdId": 67,
     "status": "Resolved"
   }
   ```

**Test Cases:**
```
✓ Test 1: Valid holdId → Hold resolved (Status 200)
✓ Test 2: Invalid holdId (9999) → Not Found (Status 404)
✓ Test 3: Already resolved hold → Error (Status 400)
```

---

## SECTION 7: CALL MANAGEMENT

### Step 17: Close Call

1. **Click Collection Request**
   ```
   Collections
   └── Technician App APIs
       └── 7. Call Management
           └── 7.1 Close Call ← Click
   ```

2. **View Request**
   ```
   Method: [POST] ▼
   URL: {{SERVER_URL}}/api/technician-tracking/call/{{callId}}/close
   
   Headers:
   ├── Authorization: Bearer {{token}}
   ├── Content-Type: application/json
   
   Body (raw JSON):
   {
     "closureReason": "Issue resolved",
     "remarks": "All spares installed and tested successfully"
   }
   ```

3. **Update Request Values**
   - `callId`: Same as previous (100)
   - `closureReason`: Why call is closed (required)
   - `remarks`: Additional details (optional)

4. **Click "Send"** button

5. **View Response**
   ```
   ✓ Status: 200 OK
   
   Response Body:
   {
     "success": true,
     "message": "Call closed successfully",
     "callId": 100,
     "status": "closed",
     "closedAt": "2026-02-27T12:00:00Z"
   }
   ```

**Test Cases:**
```
✓ Test 1: Valid closure reason → Call closed (Status 200)
✓ Test 2: Missing closureReason → Error (Status 400)
✓ Test 3: Already closed call → Error (Status 400)
```

---

### Step 18: Get Call Summary

1. **Click Collection Request**
   ```
   Collections
   └── Technician App APIs
       └── 7. Call Management
           └── 7.2 Get Call Summary ← Click
   ```

2. **View Request**
   ```
   Method: [GET] ▼
   URL: {{SERVER_URL}}/api/technician-tracking/summary/{{callId}}
   
   Headers:
   ├── Authorization: Bearer {{token}}
   ├── Content-Type: application/json
   
   Body: (None)
   ```

3. **Update Call ID**
   - URL shows: `/summary/{{callId}}`
   - Uses environment variable `callId = 100`

4. **Click "Send"** button

5. **View Response**
   ```
   ✓ Status: 200 OK
   
   Response Body:
   {
     "success": true,
     "callId": 100,
     "summary": {
       "call_number": "CALL-100",
       "customer": "ABC Customer",
       "technician_name": "John Doe",
       "status": "closed",
       "created_at": "2026-02-27T10:00:00Z",
       "closed_at": "2026-02-27T12:00:00Z",
       "spare_consumption": {
         "count": 2,
         "total_qty": 3,
         "items": [
           {
             "spare_code": "SP001",
             "used_qty": 2
           }
         ]
       },
       "tat": {
         "start_time": "2026-02-27T10:00:00Z",
         "end_time": "2026-02-27T12:00:00Z",
         "total_minutes": 120,
         "delay_minutes": 0
       },
       "holds": {
         "count": 1,
         "resolved": true
       }
     }
   }
   ```

---

## SECTION 8: SPARE TRACKING HISTORY

### Step 19: Get Call Spare History

1. **Click Collection Request**
   ```
   Collections
   └── Technician App APIs
       └── 8. Spare Tracking History
           └── 8.1 Get Call Spare History ← Click
   ```

2. **View Request**
   ```
   Method: [GET] ▼
   URL: {{SERVER_URL}}/api/spare-tracking/call/{{callId}}/history
   
   Headers:
   ├── Authorization: Bearer {{token}}
   ├── Content-Type: application/json
   
   Body: (None)
   ```

3. **Update Call ID**
   - URL shows: `/call/{{callId}}/history`
   - Uses environment variable `callId = 100`

4. **Click "Send"** button

5. **View Response**
   ```
   ✓ Status: 200 OK
   
   Response Body:
   {
     "success": true,
     "callId": 100,
     "data": {
       "call_number": "CALL-100",
       "technician": "John Doe",
       "spares_used": [
         {
           "spare_id": 1,
           "spare_code": "SP001",
           "spare_name": "Compressor Unit",
           "quantity_used": 2,
           "usage_time": "2026-02-27T10:15:00Z"
         }
       ],
       "spares_returned": [
         {
           "spare_id": 3,
           "spare_code": "SP003",
           "quantity_returned": 1,
           "condition": "good"
         }
       ]
     }
   }
   ```

---

### Step 20: Get All Calls Using Spare

1. **Click Collection Request**
   ```
   Collections
   └── Technician App APIs
       └── 8. Spare Tracking History
           └── 8.2 Get Calls Using Spare ← Click
   ```

2. **View Request**
   ```
   Method: [GET] ▼
   URL: {{SERVER_URL}}/api/spare-tracking/spare/{{spareId}}/calls
   
   Headers:
   ├── Authorization: Bearer {{token}}
   ├── Content-Type: application/json
   
   Body: (None)
   ```

3. **Update Spare ID**
   - URL shows: `/spare/{{spareId}}/calls`
   - Uses environment variable `spareId = 1`
   - Or manually: `/spare/1/calls`

4. **Click "Send"** button

5. **View Response**
   ```
   ✓ Status: 200 OK
   
   Response Body:
   {
     "success": true,
     "spareId": 1,
     "data": [
       {
         "call_id": 100,
         "call_number": "CALL-100",
         "technician": "John Doe",
         "quantity_used": 2,
         "usage_date": "2026-02-27T10:15:00Z",
         "remarks": "Replaced faulty unit"
       },
       {
         "call_id": 105,
         "call_number": "CALL-105",
         "technician": "John Doe",
         "quantity_used": 1,
         "usage_date": "2026-02-27T14:30:00Z"
       }
     ],
     "count": 2
   }
   ```

---

## COMPLETE TEST SEQUENCE (START TO FINISH)

### Recommended Order for Full Testing

```
Step 1:  Login (1 min)
         → Get token → Save to environment

Step 2:  Create Spare Request (2 min)
         → Get requestId → Save to environment

Step 3:  Get Request Details (1 min)
         → Verify request created

Step 4:  Log Spare Usage (1 min)
         → Log consumption

Step 5:  Create TAT Record (1 min)
         → Create time tracking

Step 6:  Create TAT Hold (1 min)
         → Get holdId → Save to environment

Step 7:  Resolve Hold (1 min)
         → Hold resolved

Step 8:  Create Return Request (2 min)
         → Get returnId → Save to environment

Step 9:  Get Return Details (1 min)
         → Verify return created

Step 10: Close Call (1 min)
         → Call completed

Step 11: Get Call Summary (1 min)
         → View complete summary with all data

Step 12: Get Spare History (1 min)
         → View all spares used in call

Total Time: ~15 minutes for complete testing
```

---

## Environment Variables Setup

**Before Testing - Create These Variables:**

```
Variable Name       Value
─────────────────────────────────
SERVER_URL          http://localhost:5000
token               (empty - will be filled after login)
callId              100
requestId           (empty - will be filled after creating request)
returnId            (empty - will be filled after creating return)
holdId              (empty - will be filled after creating hold)
spareId             1
```

---

## Response Status Codes Explained

| Status | Meaning | What to Do |
|--------|---------|-----------|
| **200** | Success (GET, POST without new resource) | ✓ Test passed |
| **201** | Created (Resource created successfully) | ✓ Test passed |
| **400** | Bad Request (Invalid input) | ✗ Check request body |
| **401** | Unauthorized (Missing/invalid token) | ✗ Re-login, get new token |
| **403** | Forbidden (No permission) | ✗ Check user role |
| **404** | Not Found (Resource doesn't exist) | ✗ Check ID is correct |
| **500** | Server Error | ✗ Check server logs |

---

## Common Errors & Solutions

### Error 1: 401 Unauthorized

**Problem:** Token missing or expired

**Solution:**
1. Go to Step 1.1 (Login)
2. Get fresh token
3. Copy token value
4. Update `token` environment variable
5. Retry the request

**Example Error:**
```json
{
  "error": "Unauthorized",
  "message": "No token provided or invalid token"
}
```

---

### Error 2: 404 Not Found

**Problem:** Wrong ID or resource doesn't exist

**Solution:**
1. Verify the ID is correct (from previous response)
2. Check you're using the right environment variable
3. Make sure resource was created (check previous GET request)

**Example Error:**
```json
{
  "error": "Not Found",
  "message": "Resource not found: Call ID 9999"
}
```

---

### Error 3: 400 Bad Request

**Problem:** Invalid request data

**Solution:**
1. Check all required fields are present in Body
2. Verify data types (numbers, strings, arrays)
3. Ensure quantity > 0
4. Check date format (ISO 8601: YYYY-MM-DDTHH:MM:SSZ)

**Example Error:**
```json
{
  "error": "Bad Request",
  "message": "Missing required field: callId"
}
```

---

### Error 4: ECONNREFUSED

**Problem:** Server not running

**Solution:**
1. Open terminal
2. `cd c:\Crm_dashboard\server`
3. `npm start`
4. Wait for: "Server running on port 5000"
5. Retry Postman request

---

## Quick Verification Checklist

After completing all 20 API tests:

```
Authentication
✓ Step 1:  Login successful, token obtained

Spare Request
✓ Step 2:  Request created
✓ Step 3:  Request details retrieved

Spare Return
✓ Step 4:  Return created
✓ Step 5:  Return list retrieved
✓ Step 6:  Return details retrieved

Consumption
✓ Step 7:  Spare usage logged
✓ Step 8:  Consumption history retrieved
✓ Step 9:  Call spares retrieved

TAT Tracking
✓ Step 10: TAT record created
✓ Step 11: TAT records retrieved
✓ Step 12: Call TAT retrieved

TAT Holds
✓ Step 13: Hold created
✓ Step 14: Hold list retrieved
✓ Step 15: Call holds retrieved
✓ Step 16: Hold resolved

Call Management
✓ Step 17: Call closed
✓ Step 18: Call summary retrieved

Spare History
✓ Step 19: Call spare history retrieved
✓ Step 20: Calls using spare retrieved

Status: ✓ ALL 20 APIS TESTED SUCCESSFULLY
```

---

## Database Verification

After completing API tests, verify data in database:

```sql
-- Check spare requests
SELECT * FROM spare_requests WHERE request_id = 5;

-- Check spare request items
SELECT * FROM spare_request_items WHERE request_id = 5;

-- Check return requests
SELECT * FROM spare_requests WHERE request_id = 101 AND requested_source_type = 'technician';

-- Check spare consumption
SELECT * FROM spare_tracking_consumption WHERE spare_id = 1;

-- Check TAT records
SELECT * FROM tat_tracking WHERE call_id = 100;

-- Check TAT holds
SELECT * FROM tat_holds WHERE call_id = 100;
```

---

## Integration Ready Checklist

Before integrating with frontend:

✅ All 20 APIs tested  
✅ All response statuses verified (200/201)  
✅ Error scenarios tested (400/401/404)  
✅ Database records verified  
✅ Environment variables configured  
✅ Token authentication working  
✅ Response data format correct  
✅ No errors in server logs  

**Status: READY FOR FRONTEND INTEGRATION** 🚀

---

**Document Version:** 1.0  
**Created:** February 27, 2026  
**API Coverage:** 20/20 (100%)  
**Testing Time:** ~15-20 minutes
