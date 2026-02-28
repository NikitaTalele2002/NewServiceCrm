# API Testing Guide - Test Without App

Yes! You can test your APIs without the app before integrating them. This is essential to verify your backend code is working correctly.

---

## Method 1: Postman (Easiest & Visual)

### Step 1: Open Postman
1. Download Postman: https://www.postman.com/downloads/
2. Open the app

### Step 2: Import Your Collection
1. **File** → **Import**
2. Select `Postman_SpareReturnAPIs.json`
3. Collection appears in left sidebar

### Step 3: Set Environment Variables
1. Click **gear icon** ⚙️ (top right corner)
2. Click **Manage Environments**
3. Click **Create New**
4. Name: `Local-Dev`

Add these variables:
```
SERVER_URL: http://localhost:3000
TECH_TOKEN: [Get from next step]
```

Click **Save**

### Step 4: Generate Test Token
1. Select newly created environment from top-right dropdown
2. Click **Create New** → **HTTP Request**
3. Set: **GET** `http://localhost:3000/api/auth/test-token?centerId=1`
4. Click **Send**
5. Copy token from response

### Step 5: Update Token Variable
1. Go back to environment settings
2. Paste token in **TECH_TOKEN** value
3. **Save**

### Step 6: Test APIs
1. Click any request from collection (e.g., "Get All Technician Returns")
2. Click **Send**
3. View response in bottom panel

✅ **If green 200 status** = API working correctly
❌ **If red status** = Check error message

---

## Method 2: cURL (Command Line - No Installation)

### Step 1: Start Your Server
```bash
cd c:\Crm_dashboard\server
npm start
```

Wait until you see: `Server running on port 3000`

### Step 2: Generate Token
```bash
curl http://localhost:3000/api/auth/test-token?centerId=1
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "payload": { "id": 1, "username": "SC1User" }
}
```

**Save the token value**

### Step 3: Test Individual APIs

#### **Test 1: Get All Spare Returns**
```bash
curl -X GET http://localhost:3000/api/technician-spare-returns \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

#### **Test 2: Create Spare Return Request**
```bash
curl -X POST http://localhost:3000/api/technician-spare-returns/create \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "callId": 1005,
    "remarks": "Defective spare collected",
    "items": [
      {
        "spareId": 1,
        "itemType": "defective",
        "requestedQty": 1,
        "defectReason": "Motor not running",
        "remarks": "Failure after 3 days"
      }
    ]
  }'
```

#### **Test 3: Get Specific Return**
```bash
curl -X GET http://localhost:3000/api/technician-spare-returns/102 \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

#### **Test 4: Receive Spare Return**
```bash
curl -X POST http://localhost:3000/api/technician-spare-returns/102/receive \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"remarks": "Spares received and verified"}'
```

#### **Test 5: Get Call Status**
```bash
curl -X GET http://localhost:3000/api/call-center/complaint/1005/status \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json"
```

---

## Method 3: VS Code Extensions (Built-in Editor)

### Option A: Thunder Client (Recommended)

**Install:**
1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search "Thunder Client"
4. Click **Install**

**Use:**
1. Click Thunder Client icon (sidebar)
2. Click **New Request**
3. Select **GET** or **POST**
4. Enter URL: `http://localhost:3000/api/technician-spare-returns`
5. Click **Auth** tab → Bearer token → Enter your token
6. Click **Send**
7. View response

### Option B: REST Client

**Install:**
1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search "REST Client"
4. Click **Install**

**Use: Create `test.http` file**

```http
### Generate Token
GET http://localhost:3000/api/auth/test-token?centerId=1

### Get All Spare Returns
GET http://localhost:3000/api/technician-spare-returns
Authorization: Bearer YOUR_TOKEN_HERE

### Create Spare Return
POST http://localhost:3000/api/technician-spare-returns/create
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "callId": 1005,
  "remarks": "Defective spare",
  "items": [
    {
      "spareId": 1,
      "itemType": "defective",
      "requestedQty": 1,
      "defectReason": "Motor not running"
    }
  ]
}

### Get Return Details
GET http://localhost:3000/api/technician-spare-returns/102
Authorization: Bearer YOUR_TOKEN_HERE

### Receive Return
POST http://localhost:3000/api/technician-spare-returns/102/receive
Authorization: Bearer YOUR_TOKEN_HERE
Content-Type: application/json

{
  "remarks": "Received and verified"
}
```

**Click on "Send Request"** above each request to test

---

## Method 4: Node.js Test Script

### Create Testing Script

Create file: `c:\Crm_dashboard\test_apis.js`

```javascript
import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000/api';
let TOKEN = '';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m'
};

// Helper function to test API
async function testAPI(name, method, endpoint, data = null) {
  try {
    console.log(`\n${colors.blue}[TEST] ${name}${colors.reset}`);
    
    const config = {
      method,
      url: `${API_BASE_URL}${endpoint}`,
      headers: {
        'Authorization': TOKEN ? `Bearer ${TOKEN}` : '',
        'Content-Type': 'application/json'
      }
    };

    if (data) config.data = data;

    const response = await axios(config);
    
    console.log(`${colors.green}✓ SUCCESS (${response.status})${colors.reset}`);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.log(`${colors.red}✗ FAILED${colors.reset}`);
    console.log('Error:', error.response?.data || error.message);
    return null;
  }
}

// Run all tests
async function runTests() {
  console.log(`\n${colors.yellow}=== CRM DASHBOARD API TEST SUITE ===${colors.reset}\n`);

  // Test 1: Generate token
  console.log(`${colors.blue}Step 1: Generate Authentication Token${colors.reset}`);
  const tokenResponse = await testAPI(
    'Get Test Token',
    'GET',
    '/auth/test-token?centerId=1'
  );

  if (tokenResponse?.token) {
    TOKEN = tokenResponse.token;
    console.log(`${colors.green}Token saved successfully${colors.reset}`);
  } else {
    console.log(`${colors.red}Failed to get token!${colors.reset}`);
    return;
  }

  // Test 2: Get all spare returns
  console.log(`\n${colors.blue}Step 2: Test GET Requests${colors.reset}`);
  await testAPI(
    'Get All Spare Returns',
    'GET',
    '/technician-spare-returns'
  );

  // Test 3: Get technician inventory
  await testAPI(
    'Get Technician Inventory',
    'GET',
    '/technicians/:technicianId/inventory'
  );

  // Test 4: Get call status
  await testAPI(
    'Get Call Status',
    'GET',
    '/call-center/complaint/1005/status'
  );

  // Test 5: Create spare return request
  console.log(`\n${colors.blue}Step 3: Test POST Requests (Create Data)${colors.reset}`);
  const createResponse = await testAPI(
    'Create Spare Return Request',
    'POST',
    '/technician-spare-returns/create',
    {
      callId: 1005,
      remarks: 'Test spare return',
      items: [
        {
          spareId: 1,
          itemType: 'defective',
          requestedQty: 1,
          defectReason: 'Motor not running',
          remarks: 'Test defect'
        }
      ]
    }
  );

  // Test 6: If creation successful, test other operations
  if (createResponse?.data?.return_id || createResponse?.return_id) {
    const returnId = createResponse.data?.return_id || createResponse.return_id;
    
    console.log(`\n${colors.blue}Step 4: Test Data Verification${colors.reset}`);
    
    await testAPI(
      'Get Created Return Details',
      'GET',
      `/technician-spare-returns/${returnId}`
    );

    // Test 7: Receive return
    await testAPI(
      'Receive Spare Return',
      'POST',
      `/technician-spare-returns/${returnId}/receive`,
      { remarks: 'Received at service center' }
    );

    // Test 8: Verify return
    await testAPI(
      'Verify Spare Return',
      'POST',
      `/technician-spare-returns/${returnId}/verify`,
      {
        verifiedQty: 1,
        remarks: 'Verified and accepted'
      }
    );
  }

  // Test 9: Get all complaints
  console.log(`\n${colors.blue}Step 5: Test Additional APIs${colors.reset}`);
  await testAPI(
    'Lookup Customer',
    'GET',
    '/call-center/customer/9876543210'
  );

  // Test 10: Get service centers by pincode
  await testAPI(
    'Get Service Centers by Pincode',
    'GET',
    '/call-center/service-centers/560001'
  );

  console.log(`\n${colors.yellow}=== TEST SUITE COMPLETED ===${colors.reset}\n`);
}

// Start testing
runTests().catch(error => {
  console.error(`${colors.red}Fatal Error: ${error.message}${colors.reset}`);
  process.exit(1);
});
```

### Run the Test Script

```bash
# Make sure server is running in another terminal
# cd c:\Crm_dashboard\server
# npm start

# In new terminal, run test
cd c:\Crm_dashboard
node test_apis.js
```

**Output Example:**
```
=== CRM DASHBOARD API TEST SUITE ===

[TEST] Get Test Token
✓ SUCCESS (200)
Response: { success: true, token: "...", payload: {...} }

[TEST] Get All Spare Returns
✓ SUCCESS (200)
Response: { data: [...] }

[TEST] Create Spare Return Request
✓ SUCCESS (201)
Response: { return_id: 102, status: "submitted" }

=== TEST SUITE COMPLETED ===
```

---

## Method 5: Database Verification

### Verify Data Was Saved to Database

After testing API, check if data actually went to database:

```sql
-- In SQL Server Management Studio or your SQL tool

-- Check if spare returns were created
SELECT TOP 10 * FROM technician_spare_returns ORDER BY created_at DESC;

-- Check specific return
SELECT * FROM technician_spare_returns WHERE return_id = 102;

-- Check return items
SELECT * FROM technician_spare_return_items WHERE return_id = 102;

-- Check inventory was updated
SELECT * FROM technician_inventory WHERE technician_id = 1;

-- Check action logs
SELECT TOP 10 * FROM action_logs WHERE entity_type = 'spare_return' ORDER BY created_at DESC;
```

---

## Complete Testing Checklist

### Before Testing:
- [ ] Server is running (`npm start` in server folder)
- [ ] Database is connected
- [ ] Postman is installed (or VS Code extension)
- [ ] Token generated successfully

### Test Flow:

**1. Authentication**
- [ ] Generate token from `/api/auth/test-token`
- [ ] Token copied and pasted in environment

**2. Read Operations (GET)**
- [ ] Get all spare returns - should return 200
- [ ] Get specific return - should return data
- [ ] Get call status - should return status
- [ ] Get technician inventory - should return inventory

**3. Create Operations (POST)**
- [ ] Create spare return - should return 201 + return_id
- [ ] Create call - should return call_id
- [ ] Create spare request - should return request_id

**4. Update Operations (POST/PUT)**
- [ ] Receive return - status should change to "received"
- [ ] Verify return - status should change to "verified"
- [ ] Update call status - status should update

**5. Database Verification**
- [ ] Query database to confirm data exists
- [ ] Check action logs show correct operations
- [ ] Verify relationships (returns linked to calls)

---

## Troubleshooting Test Failures

### Error: "Connection refused"
```
Solution: Ensure server is running
$ cd c:\Crm_dashboard\server
$ npm start
```

### Error: "401 Unauthorized"
```
Solution: Token is missing or invalid
- Generate new token from /api/auth/test-token
- Copy complete token (including all characters)
- Paste in Authorization header correctly
```

### Error: "404 Not Found"
```
Solution: Wrong endpoint
- Verify endpoint URL is correct
- Check spelling and case sensitivity
- Verify parameter values (IDs) exist in database
```

### Error: "400 Bad Request"
```
Solution: Invalid request body
- Check JSON syntax is valid
- Verify all required fields are included
- Check field names match exactly
- No extra spaces in JSON
```

### Error: "500 Server Error"
```
Solution: Backend issue
- Check server console for error messages
- Verify database query syntax
- Check for null/undefined values in code
- Restart server: Press Ctrl+C then npm start
```

### Error: "CORS Error"
```
Solution: Add CORS headers in server/server.js

import cors from 'cors';
app.use(cors({
  origin: '*',
  credentials: true
}));
```

---

## Example: Full Testing Workflow

### Step 1: Generate Token
```bash
curl http://localhost:3000/api/auth/test-token?centerId=1
```
**Copy token from response**

### Step 2: Test Create API
```bash
curl -X POST http://localhost:3000/api/technician-spare-returns/create \
  -H "Authorization: Bearer PASTE_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "callId": 1005,
    "remarks": "Test",
    "items": [{
      "spareId": 1,
      "itemType": "defective",
      "requestedQty": 1,
      "defectReason": "test"
    }]
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "return_id": 102,
  "status": "submitted",
  "message": "Spare return request created successfully"
}
```

### Step 3: Verify in Database
```sql
SELECT * FROM technician_spare_returns WHERE return_id = 102;
```

**Should show:**
- return_id: 102
- status: "submitted"
- created_at: current timestamp
- All data you sent

### Step 4: Test Get API
```bash
curl http://localhost:3000/api/technician-spare-returns/102 \
  -H "Authorization: Bearer PASTE_TOKEN_HERE"
```

**Should return the data you just created**

---

## Recommended Testing Approach

**For Quickest Results:**
1. Use **Postman** (visual, easy to see responses)
2. Import your collection
3. Test each endpoint one by one
4. Check database after each test

**For Continuous Testing:**
1. Create `test_apis.js` script
2. Run `node test_apis.js` before deployment
3. Automatically tests all endpoints
4. Shows pass/fail status clearly

**For Production:**
1. Use **Jest** or **Mocha** for automated testing
2. Create unit tests for each API
3. CI/CD pipeline runs tests automatically
4. Prevents bugs from going to production

---

## Summary

| Method | Best For | Ease | Time |
|--------|----------|------|------|
| **Postman** | Visual testing | Easy | 2 min |
| **cURL** | Quick testing | Medium | 3 min |
| **VS Code Extension** | Integrated testing | Easy | 2 min |
| **Node.js Script** | Automated testing | Advanced | 5 min |
| **Database Query** | Verification | Medium | 2 min |

**Start with Postman → then use Node.js script for automation**

---

**Generated**: February 27, 2026
**Version**: 1.0
