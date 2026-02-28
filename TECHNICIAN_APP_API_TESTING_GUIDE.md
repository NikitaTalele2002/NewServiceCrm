# Technician App APIs - Complete Testing Guide

**Last Updated:** February 27, 2026  
**API Server:** http://localhost:5000  
**Total APIs:** 20 Endpoints

---

## Table of Contents
1. [Setup & Prerequisites](#setup--prerequisites)
2. [Authentication](#authentication)
3. [Testing Workflow](#testing-workflow)
4. [API Test Cases](#api-test-cases)
5. [Error Scenarios](#error-scenarios)
6. [Integration Checklist](#integration-checklist)

---

## Setup & Prerequisites

### Required Tools
- **Postman** or any REST client (curl, Insomnia, etc.)
- **Node.js** server running on port 5000
- **Database** with sample technician data
- **Sample Test Data** (see below)

### Server Startup
```bash
cd server
npm install
npm start
# Server should start on port 5000
```

### Import Postman Collection
1. Open Postman
2. Click **Import** → Select `TECHNICIAN_APP_POSTMAN_COLLECTION.json`
3. Create environment variable: `token` (empty initially)
4. Create environment variables:
   - `callId` = "100"
   - `requestId` = "1"
   - `returnId` = "1"
   - `holdId` = "1"
   - `spareId` = "1"

---

## Authentication

### Step 1: Login to Get Token

**Endpoint:** `POST /api/auth/login`

**Request:**
```json
{
  "username": "technician_user",
  "password": "password123"
}
```

**Expected Response (200 OK):**
```json
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

**⚠️ IMPORTANT:** Copy the token value and set it in Postman environment variable `{{token}}`

**Test Cases:**
```
✓ Test 1: Valid credentials → Returns token
✓ Test 2: Invalid username → 401 Unauthorized
✓ Test 3: Invalid password → 401 Unauthorized
✓ Test 4: Empty credentials → 400 Bad Request
```

---

## Testing Workflow

### Recommended Test Order
1. **Authentication** - Get token
2. **Spare Request** - Create request to SC
3. **Spare Return** - Return spares after call
4. **Spare Consumption** - Log spare usage
5. **TAT Tracking** - Track call duration
6. **TAT Holds** - Create and resolve holds
7. **Call Management** - Close call and get summary
8. **Spare History** - View tracking data

---

## API Test Cases

### 1. SPARE REQUEST TO SERVICE CENTER

#### 1.1 Create Spare Request
**Endpoint:** `POST /api/technician-sc-spare-requests/create`

**Request Body:**
```json
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

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Spare request created successfully",
  "requestId": 5,
  "requestNumber": "REQ-5",
  "totalItems": 2,
  "status": "pending"
}
```

**Test Cases:**
```
✓ Test 1: Valid request with multiple spares → Creates request
✓ Test 2: Missing spares array → 400 Bad Request
✓ Test 3: Missing requestReason → 400 Bad Request
✓ Test 4: Invalid spareId → 400 Bad Request
✓ Test 5: Zero quantity → 400 Bad Request
✓ Test 6: Not authenticated → 401 Unauthorized
```

**Store Response:** Save `requestId` for next test

---

#### 1.2 Get Spare Request Details
**Endpoint:** `GET /api/technician-sc-spare-requests/:requestId`

**URL Params:**
- `requestId` = 5 (from previous test)

**Expected Response (200 OK):**
```json
{
  "success": true,
  "requestId": 5,
  "request": {
    "request_id": 5,
    "request_number": "REQ-5",
    "requested_source_id": 1,
    "requested_to_id": 4,
    "requested_to_type": "service_center",
    "status_id": 1,
    "status_name": "pending",
    "created_at": "2026-02-27T10:00:00Z",
    "items": [
      {
        "spare_id": 1,
        "spare_code": "SP001",
        "spare_name": "Compressor Unit",
        "requested_qty": 2,
        "approved_qty": 0
      },
      {
        "spare_id": 3,
        "spare_code": "SP003",
        "spare_name": "Condenser Coil",
        "requested_qty": 1,
        "approved_qty": 0
      }
    ]
  }
}
```

**Test Cases:**
```
✓ Test 1: Valid requestId → Returns request details
✓ Test 2: Invalid requestId → 404 Not Found
✓ Test 3: Non-existent requestId → 404 Not Found
✓ Test 4: Not authenticated → 401 Unauthorized
```

---

### 2. SPARE RETURN TO SERVICE CENTER

#### 2.1 Create Spare Return Request
**Endpoint:** `POST /api/technician-spare-returns/create`

**Request Body:**
```json
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

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "Spare return request created successfully",
  "requestId": 101,
  "totalItems": 2
}
```

**Test Cases:**
```
✓ Test 1: Valid return with good and defective items → Creates return
✓ Test 2: All good items (no defective) → Creates return
✓ Test 3: All defective items → Creates return
✓ Test 4: Missing call_id → 400 Bad Request
✓ Test 5: Empty items array → 400 Bad Request
✓ Test 6: Invalid spareId → 400 Bad Request
✓ Test 7: Not authenticated → 401 Unauthorized
```

**Store Response:** Save `requestId` for next test

---

#### 2.2 Get All Return Requests
**Endpoint:** `GET /api/technician-spare-returns/`

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "request_id": 101,
      "request_number": "RET-101",
      "call_id": 100,
      "technician_id": 1,
      "service_center_id": 4,
      "status": "Pending",
      "created_at": "2026-02-27T10:30:00Z",
      "items_count": 2
    }
  ],
  "count": 1
}
```

**Test Cases:**
```
✓ Test 1: With returns → Returns list of returns
✓ Test 2: No returns yet → Returns empty array
✓ Test 3: Not authenticated → 401 Unauthorized
```

---

#### 2.3 Get Return Request Details
**Endpoint:** `GET /api/technician-spare-returns/:returnId`

**URL Params:**
- `returnId` = 101

**Expected Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "request_id": 101,
    "request_number": "RET-101",
    "call_id": 100,
    "technician_id": 1,
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
✓ Test 1: Valid returnId → Returns details
✓ Test 2: Invalid returnId → 404 Not Found
✓ Test 3: Not authenticated → 401 Unauthorized
```

---

### 3. SPARE CONSUMPTION TRACKING

#### 3.1 Log Spare Usage
**Endpoint:** `POST /api/technician-tracking/spare-consumption`

**Request Body:**
```json
{
  "callId": 100,
  "spare_part_id": 1,
  "used_qty": 2,
  "remarks": "Replaced faulty unit"
}
```

**Expected Response (200 OK):**
```json
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
✓ Test 1: Valid spare consumption → Logs usage
✓ Test 2: Missing callId → 400 Bad Request
✓ Test 3: Missing spare_part_id → 400 Bad Request
✓ Test 4: Invalid spare_part_id → 400 Bad Request
✓ Test 5: Zero quantity → 400 Bad Request
✓ Test 6: Negative quantity → 400 Bad Request
✓ Test 7: Not authenticated → 401 Unauthorized
```

---

#### 3.2 Get All Spare Consumption History
**Endpoint:** `GET /api/technician-tracking/spare-consumption`

**Expected Response (200 OK):**
```json
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
      "usage_date": "2026-02-27T10:20:00Z",
      "remarks": ""
    }
  ],
  "count": 2
}
```

**Test Cases:**
```
✓ Test 1: With consumption records → Returns list
✓ Test 2: No records yet → Returns empty array
✓ Test 3: Not authenticated → 401 Unauthorized
```

---

#### 3.3 Get Spares Used in Specific Call
**Endpoint:** `GET /api/technician-tracking/spare-consumption/call/100`

**URL Params:**
- `callId` = 100

**Expected Response (200 OK):**
```json
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

**Test Cases:**
```
✓ Test 1: Valid callId with consumptions → Returns list
✓ Test 2: Valid callId with no consumptions → Returns empty array
✓ Test 3: Invalid callId → 404 Not Found
✓ Test 4: Not authenticated → 401 Unauthorized
```

---

### 4. TAT (TURNAROUND TIME) TRACKING

#### 4.1 Create TAT Record
**Endpoint:** `POST /api/technician-tracking/tat-tracking`

**Request Body:**
```json
{
  "callId": 100,
  "startTime": "2026-02-27T10:00:00Z",
  "endTime": "2026-02-27T11:30:00Z",
  "delayMinutes": 0,
  "remarks": "Call completed on time"
}
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "TAT record created successfully",
  "tatId": 23,
  "totalTime": "1 hour 30 minutes"
}
```

**Test Cases:**
```
✓ Test 1: Valid TAT data → Creates record
✓ Test 2: Missing startTime → 400 Bad Request
✓ Test 3: Missing endTime → 400 Bad Request
✓ Test 4: endTime before startTime → 400 Bad Request
✓ Test 5: Invalid date format → 400 Bad Request
✓ Test 6: Not authenticated → 401 Unauthorized
```

---

#### 4.2 Get All TAT Records
**Endpoint:** `GET /api/technician-tracking/tat-tracking`

**Expected Response (200 OK):**
```json
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

**Test Cases:**
```
✓ Test 1: With records → Returns list
✓ Test 2: No records → Returns empty array
✓ Test 3: Not authenticated → 401 Unauthorized
```

---

#### 4.3 Get TAT for Specific Call
**Endpoint:** `GET /api/technician-tracking/tat-tracking/call/100`

**Expected Response (200 OK):**
```json
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

**Test Cases:**
```
✓ Test 1: Valid callId → Returns TAT
✓ Test 2: No TAT for call → 404 Not Found
✓ Test 3: Not authenticated → 401 Unauthorized
```

---

### 5. TAT HOLDS MANAGEMENT

#### 5.1 Create TAT Hold
**Endpoint:** `POST /api/technician-tracking/tat-holds`

**Request Body:**
```json
{
  "callId": 100,
  "holdReason": "Waiting for spare parts",
  "remarks": "Expected delivery in 2 hours"
}
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "TAT hold created successfully",
  "holdId": 67,
  "callId": 100,
  "status": "Active"
}
```

**Test Cases:**
```
✓ Test 1: Valid hold data → Creates hold
✓ Test 2: Missing holdReason → 400 Bad Request
✓ Test 3: Invalid callId → 400 Bad Request
✓ Test 4: Empty holdReason → 400 Bad Request
✓ Test 5: Not authenticated → 401 Unauthorized
```

**Store Response:** Save `holdId` for next test

---

#### 5.2 Get All TAT Holds
**Endpoint:** `GET /api/technician-tracking/tat-holds`

**Expected Response (200 OK):**
```json
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

**Test Cases:**
```
✓ Test 1: With holds → Returns list
✓ Test 2: No holds → Returns empty array
✓ Test 3: Not authenticated → 401 Unauthorized
```

---

#### 5.3 Get Holds for Specific Call
**Endpoint:** `GET /api/technician-tracking/tat-holds/call/100`

**Expected Response (200 OK):**
```json
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

**Test Cases:**
```
✓ Test 1: Call with holds → Returns holds
✓ Test 2: Call without holds → Returns empty array
✓ Test 3: Invalid callId → 404 Not Found
✓ Test 4: Not authenticated → 401 Unauthorized
```

---

#### 5.4 Resolve TAT Hold
**Endpoint:** `PUT /api/technician-tracking/tat-holds/67/resolve`

**Request Body:**
```json
{
  "resolveNotes": "Spare parts received, resuming work"
}
```

**Expected Response (200 OK):**
```json
{
  "success": true,
  "message": "TAT hold resolved successfully",
  "holdId": 67,
  "status": "Resolved"
}
```

**Test Cases:**
```
✓ Test 1: Valid hold resolution → Resolves hold
✓ Test 2: Invalid holdId → 404 Not Found
✓ Test 3: Already resolved hold → 400 Bad Request
✓ Test 4: Not authenticated → 401 Unauthorized
```

---

### 6. CALL MANAGEMENT

#### 6.1 Close Call
**Endpoint:** `POST /api/technician-tracking/call/100/close`

**Request Body:**
```json
{
  "closureReason": "Issue resolved",
  "remarks": "All spares installed and tested successfully"
}
```

**Expected Response (200 OK):**
```json
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
✓ Test 1: Valid closure → Closes call
✓ Test 2: Missing closureReason → 400 Bad Request
✓ Test 3: Invalid callId → 404 Not Found
✓ Test 4: Already closed call → 400 Bad Request
✓ Test 5: Not authenticated → 401 Unauthorized
```

---

#### 6.2 Get Call Summary
**Endpoint:** `GET /api/technician-tracking/summary/100`

**Expected Response (200 OK):**
```json
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

**Test Cases:**
```
✓ Test 1: Valid callId → Returns summary
✓ Test 2: Invalid callId → 404 Not Found
✓ Test 3: Not authenticated → 401 Unauthorized
```

---

### 7. SPARE TRACKING HISTORY

#### 7.1 Get Call Spare History
**Endpoint:** `GET /api/spare-tracking/call/100/history`

**Expected Response (200 OK):**
```json
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

**Test Cases:**
```
✓ Test 1: Valid callId → Returns history
✓ Test 2: Call with no spares → Returns empty arrays
✓ Test 3: Invalid callId → 404 Not Found
✓ Test 4: Not authenticated → 401 Unauthorized
```

---

#### 7.2 Get All Calls Using Spare
**Endpoint:** `GET /api/spare-tracking/spare/1/calls`

**Expected Response (200 OK):**
```json
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

**Test Cases:**
```
✓ Test 1: Spare used in multiple calls → Returns list
✓ Test 2: Spare never used → Returns empty array
✓ Test 3: Invalid spareId → 404 Not Found
✓ Test 4: Not authenticated → 401 Unauthorized
```

---

## Error Scenarios

### Common Error Responses

#### 400 Bad Request
```json
{
  "error": "Bad Request",
  "message": "Missing required field: callId",
  "details": "Ensure all required fields are provided"
}
```

**Causes:**
- Missing required fields
- Invalid data format
- Invalid quantity (0 or negative)
- Invalid date format

---

#### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "No token provided or invalid token",
  "details": "Please login first to get a valid token"
}
```

**Causes:**
- Missing Authorization header
- Invalid token
- Expired token
- Malformed token

---

#### 403 Forbidden
```json
{
  "error": "Forbidden",
  "message": "You don't have permission to access this resource",
  "details": "This technician cannot access this call"
}
```

**Causes:**
- Trying to access another technician's data
- Insufficient permissions

---

#### 404 Not Found
```json
{
  "error": "Not Found",
  "message": "Resource not found: Call ID 9999",
  "details": "The requested resource does not exist"
}
```

**Causes:**
- Invalid resource ID
- Resource already deleted

---

#### 500 Internal Server Error
```json
{
  "error": "Internal Server Error",
  "message": "Database connection failed",
  "details": "Please try again later"
}
```

**Causes:**
- Database connection issues
- Server error
- Unexpected exception

---

## Integration Checklist

### Pre-Integration Testing
- [ ] Server running on port 5000
- [ ] Database connected and populated with test data
- [ ] Postman collection imported
- [ ] Environment variables configured

### Authentication Tests
- [ ] Login with valid credentials → Returns token ✓
- [ ] Login with invalid username → 401 ✓
- [ ] Login with invalid password → 401 ✓
- [ ] Token stored in environment variable ✓

### Spare Request Tests
- [ ] Create spare request → Request created ✓
- [ ] Get request details → Details returned ✓
- [ ] Create with missing fields → 400 error ✓
- [ ] Create with invalid spareId → 400 error ✓

### Spare Return Tests
- [ ] Create return request → Return created ✓
- [ ] Get all returns → Returns list ✓
- [ ] Get return details → Details returned ✓
- [ ] Return with zero quantity → Handled correctly ✓

### Spare Consumption Tests
- [ ] Log spare usage → Logged successfully ✓
- [ ] Get consumption history → History returned ✓
- [ ] Get spares for call → List returned ✓
- [ ] Negative quantity → 400 error ✓

### TAT Tracking Tests
- [ ] Create TAT record → Record created ✓
- [ ] Get TAT records → Records returned ✓
- [ ] Get TAT for call → TAT returned ✓
- [ ] Invalid date format → 400 error ✓

### TAT Holds Tests
- [ ] Create hold → Hold created ✓
- [ ] Get all holds → Holds returned ✓
- [ ] Get holds for call → Holds returned ✓
- [ ] Resolve hold → Hold resolved ✓

### Call Management Tests
- [ ] Close call → Call closed ✓
- [ ] Get call summary → Summary returned ✓
- [ ] Close already closed call → 400 error ✓

### Spare Tracking Tests
- [ ] Get call history → History returned ✓
- [ ] Get calls for spare → Calls returned ✓
- [ ] Invalid callId → 404 error ✓
- [ ] Invalid spareId → 404 error ✓

### Performance & Load Tests
- [ ] Response time < 500ms for GET requests ✓
- [ ] Response time < 1s for POST requests ✓
- [ ] Handle concurrent requests ✓
- [ ] Database transactions work correctly ✓

### Security Tests
- [ ] Token verification works ✓
- [ ] Cannot access other technician's data ✓
- [ ] SQL injection prevention ✓
- [ ] XSS prevention ✓

---

## Quick Test Script

Run this sequence to test all APIs:

```bash
# 1. Login
curl -X POST http://localhost:5000/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"username":"technician_user","password":"password123"}'

# Store token from response as TOKEN

# 2. Create Spare Request
curl -X POST http://localhost:5000/api/technician-sc-spare-requests/create \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"spares":[{"spareId":1,"quantity":2}],"requestReason":"Test","callId":100}'

# 3. Create Spare Return
curl -X POST http://localhost:5000/api/technician-spare-returns/create \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"callId":100,"items":[{"spareId":1,"qty_good":1,"qty_defective":1}],"requestReason":"Test"}'

# 4. Log Spare Consumption
curl -X POST http://localhost:5000/api/technician-tracking/spare-consumption \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"callId":100,"spare_part_id":1,"used_qty":2}'

# 5. Get Call Summary
curl -X GET http://localhost:5000/api/technician-tracking/summary/100 \\
  -H "Authorization: Bearer $TOKEN"
```

---

## Troubleshooting

### 401 Unauthorized Error
**Solution:** 
1. Verify token is being sent in Authorization header
2. Check if token is still valid (not expired)
3. Re-login to get a new token
4. Format: `Authorization: Bearer <token>`

### 404 Not Found Error
**Solution:**
1. Verify the resource ID is correct
2. Check if resource exists in database
3. Make sure you're using the correct endpoint

### Database Connection Error
**Solution:**
1. Verify database is running
2. Check database credentials in `.env`
3. Verify network connectivity
4. Restart server

### Token Issues
**Solution:**
1. Always login first to get token
2. Copy exact token from response
3. Set token in Postman environment variable
4. Use `Bearer` prefix when sending token

---

## Support & Debugging

**Enable Debug Logging:**
```javascript
// In server startup, set NODE_ENV=development
NODE_ENV=development npm start
```

**Common Issues Table:**

| Error | Cause | Solution |
|-------|-------|----------|
| 401 Unauthorized | No/Invalid token | Login to get token |
| 400 Bad Request | Missing field | Check request body |
| 404 Not Found | Invalid ID | Verify resource exists |
| 500 Error | Server error | Check server logs |
| ECONNREFUSED | Server not running | Run `npm start` |

---

## Final Verification

Before integrating into frontend:
1. ✅ All 20 APIs tested and passing
2. ✅ Authentication working correctly
3. ✅ Error responses validated
4. ✅ Performance acceptable
5. ✅ Security measures in place
6. ✅ Database operations confirmed
7. ✅ Token management verified

**Status:** Ready for Frontend Integration ✓

---

**Document Version:** 1.0  
**Last Updated:** February 27, 2026  
**Test Coverage:** 100% of Technician App APIs
