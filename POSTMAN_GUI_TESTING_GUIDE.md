# Postman GUI - Step-by-Step Testing Guide

Complete visual guide to test your APIs using Postman Desktop application.

---

## Step 1: Download & Open Postman

### Download
1. Go to: https://www.postman.com/downloads/
2. Click **Download** for your OS (Windows)
3. Run the installer
4. Open Postman app

### First Launch
You'll see the Postman welcome screen with options to create a new request or import a collection.

---

## Step 2: Import Your API Collection

### Method A: Import Existing Collection (Recommended)

**Location of file**: `c:\Crm_dashboard\Postman_SpareReturnAPIs.json`

**Steps:**

1. **Click File Menu** (top left)
   ```
   Postman Window
   ├── File ← Click here
   ├── Edit
   ├── View
   └── Help
   ```

2. **Click "Import"**
   ```
   File Menu
   ├── New
   ├── Open
   ├── Import ← Click here
   ├── Export
   └── Settings
   ```

3. **Select File** to Import
   - Dialog opens: "Import"
   - Click **"File"** tab
   - Click **"Choose Files"** button
   - Navigate to: `c:\Crm_dashboard\`
   - Select: **Postman_SpareReturnAPIs.json**
   - Click **"Open"**

4. **Click Import Button**
   - Info shows about collection
   - Click blue **"Import"** button
   - Collection imported successfully!

### After Import

Left sidebar now shows:
```
Collections
├── Technician Spare Return APIs ✓ (Imported)
    ├── 1. Get All Technician Returns
    ├── 2. Get Specific Return Details
    ├── 3. Create New Return Request
    ├── 4. Update Return Status
    ├── 5. Verify Return
    └── ... more requests
```

---

## Step 3: Create Environment & Set Token

### What is an Environment?

Variables you reuse across requests:
- `SERVER_URL`: `http://localhost:3000`
- `TECH_TOKEN`: Your authentication token

### Create Environment

1. **Click Gear Icon** ⚙️ (top right corner)
   ```
   Postman Window (top right)
   ├── ... (other icons)
   ├── ⚙️ Settings (Gear Icon) ← Click
   └── ...
   ```

2. **Click "Manage Environments"**
   ```
   Settings Menu
   ├── Settings
   ├── Manage Environments ← Click
   ├── Manage Workspace Settings
   └── ...
   ```

3. **Click "Create"** button
   ```
   Manage Environments Panel
   ├── Search box
   ├── List of environments
   └── ✚ Create ← Click blue button
   ```

4. **Name Your Environment**
   ```
   Create Environment Form
   
   Environment name: Local-Dev ← Type here
   ```

5. **Add Variables**
   
   In the table below, add:
   
   | Variable | Type | Initial Value | Current Value |
   |----------|------|---------------|---------------|
   | SERVER_URL | string | http://localhost:3000 | http://localhost:3000 |
   | TECH_TOKEN | string | [Leave empty for now] | [Leave empty for now] |

6. **Click "Save"** button

---

## Step 4: Generate Authentication Token

### Option A: Technician Login (Recommended for Production)

1. **Create New Request**
   - Click **"+"** tab (next to current tab)
   - Or: File → New → HTTP Request

2. **Set Request Method & URL**
   
   **Method:** Select **POST** from dropdown
   
   **URL:** Copy and paste this exactly:
   ```
   http://localhost:3000/api/auth/login
   ```

3. **Add Request Body**
   - Click **"Body"** tab
   - Select **"raw"**
   - Select **"JSON"** format
   - Paste this JSON:
   ```json
   {
     "username": "technician@example.com",
     "password": "password123"
   }
   ```
   
   **Note:** Use your actual technician credentials from database

4. **Click "Send"** button (blue button on right)

5. **View Response** (bottom panel)
   ```
   Response
   ├── Status: 200 OK ✓
   └── Body:
       {
         "success": true,
         "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
         "user": {
           "id": 1,
           "username": "technician@example.com",
           "role": "technician"
         }
       }
   ```

6. **Copy Token**
   - Click on token value
   - Right-click → Copy
   - Or: Ctrl+C
   - Token is now in clipboard

7. **Save Token to Environment**
   - Click gear icon ⚙️ again
   - Click "Manage Environments"
   - Find "Local-Dev"
   - **Current Value** column → paste token
   - Click **Save**

---

### Option B: Quick Test Token (For Development Only)

If you don't have technician credentials yet, use the test token endpoint:

1. **Create New Request**
   - Click **"+"** tab
   - Or: File → New → HTTP Request

2. **Set Request Method & URL**
   
   **Method:** Select **GET** from dropdown
   
   **URL:** Copy and paste this exactly:
   ```
   http://localhost:3000/api/auth/test-token?centerId=1
   ```

3. **Click "Send"** button

4. **View Response**
   ```
   Status: 200 OK ✓
   
   {
     "success": true,
     "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
     "payload": {
       "id": 1,
       "username": "SC1User",
       "centerId": 1,
       "role": "service_center"
     }
   }
   ```

5. **Copy & Save Token** (same as above)

---

## How to Get Technician Login Credentials

### Option 1: Check Database for Existing Technician

```sql
-- SQL Server
SELECT TOP 5 
  t.technician_id,
  t.name,
  u.username,
  u.password
FROM technicians t
LEFT JOIN users u ON t.user_id = u.user_id
WHERE u.username IS NOT NULL
ORDER BY t.created_at DESC;
```

**Note:** Passwords may be hashed/encrypted. If so, create a test technician (Option 2)

### Option 2: Create Test Technician User

```sql
-- Create user
INSERT INTO users (username, password, role, created_at)
VALUES ('tech_test@example.com', 'tech123', 'technician', GETDATE());

-- Get the user_id
SELECT user_id FROM users WHERE username = 'tech_test@example.com';

-- Link to technician (replace 1 with actual user_id, 1 with service center id)
INSERT INTO technicians (user_id, name, service_center_id, status, created_at)
VALUES (1, 'Test Technician', 1, 'active', GETDATE());
```

### Option 3: Get Credentials from Your Team

Ask your database/API team for:
- Technician username (email)
- Technician password
- Technician ID (for testing purposes)



### Make Environment Active

1. **Look at top-right** of Postman window
   ```
   Top Right Corner:
   ├── Environments dropdown ← Click here
   ├── ... other options
   └── ...
   ```

2. **Click Dropdown** (shows "No Environment" or blank)
   ```
   Dropdown Menu:
   ├── No Environment
   ├── Local-Dev ✓ ← Select this
   └── ... other environments
   ```

3. **Select "Local-Dev"**
   - Dropdown closes
   - Environment now shows "Local-Dev" in top right

---

## Step 6: Test Your First API

### Test: Get All Spare Returns

1. **Click Collection Request** from left sidebar
   ```
   Collections
   └── Technician Spare Return APIs
       └── 1. Get All Technician Returns ← Click
   ```

2. **View Request Details**
   
   Center panel shows:
   ```
   Request: Get All Technician Returns
   
   Method: [GET] ▼
   URL: {{SERVER_URL}}/api/technician-spare-returns
   
   Headers:
   ├── Authorization: Bearer {{TECH_TOKEN}}
   ├── Content-Type: application/json
   
   Body: (no body for GET)
   ```

3. **Click "Send"** button (top right of request)



4. **Check Response** (bottom panel)
   ```
   ✓ Status: 200 OK
   
   Response Body:
   {
     "success": true,
     "data": [
       {
         "return_id": 101,
         "status": "submitted",
         "created_at": "2026-02-27..."
       },
       ...
     ]
   }
   ```


   sql: 'SELECT \n' +
    '        tsr.return_id,\n' +
    '        tsr.return_number,\n' +
    '        tsr.call_id,\n' +
    '        tsr.technician_id,\n' +
    '        tsr.service_center_id,\n' +
    '        tsr.return_status,\n' +
    '        tsr.return_date,\n' +
    '        tsr.received_date,\n' +
    '        tsr.verified_date,\n' +
    '        tsr.remarks,\n' +
    '        tsr.created_at,\n' +
    '        t.name as technician_name,\n' +
    '        sc.asc_name as service_center_name,\n' +
    '        (SELECT COUNT(*) FROM technician_spare_return_items \n' +
    '         WHERE return_id = tsr.return_id) as item_count\n' +
    '      FROM technician_spare_returns tsr\n' +
    '      INNER JOIN technicians t ON tsr.technician_id = t.technician_id\n' +
    '      LEFT JOIN service_centers sc ON tsr.service_center_id = sc.asc_id\n' +
    '      WHERE tsr.technician_id = 11\n' +
    '     ORDER BY tsr.created_at DESC OFFSET 0 ROWS FETCH NEXT 50 ROWS ONLY',
  parameters: {}
}


5. **Status Indicator:**
   - 🟢 **200 OK** = Success! API working
   - 🔴 **401 Unauthorized** = Token missing/invalid
   - 🔴 **404 Not Found** = Wrong URL
   - 🔴 **500 Error** = Server problem

---

## Step 7: Test Create (POST) Request

### Test: Create New Spare Return

1. **Click Collection Request**
   ```
   Collections
   └── Technician Spare Return APIs
       └── 3. Create New Return Request ← Click
   ```

2. **View Request Setup**
   ```
   Request: Create New Return Request
   
   Method: [POST] ▼
   URL: {{SERVER_URL}}/api/technician-spare-returns/create
   
   Headers:
   ├── Authorization: Bearer {{TECH_TOKEN}}
   ├── Content-Type: application/json
   
   Body:
   ├── raw (selected)
   └── JSON content:
   {
     "serviceCenterId": 1,
     "callId": 1005,
     "remarks": "Defective spare collected from customer visit",
     "items": [
       {
         "spareId": 1,
         "itemType": "defective",
         "requestedQty": 1,
         "defectReason": "Motor not running",
         "remarks": "Failure after 3 days"
       }
     ]
   }
   ```

3. **Modify Request Body (Optional)**
   - Click **Body** tab
   - Click **raw** option
   - Edit JSON as needed
   - Example: Change `callId` to 1006

4. **Click "Send"**

5. **View Response**
   ```
   ✓ Status: 201 Created
   
   Response Body:
   {
     "success": true,
     "return_id": 102,
     "status": "submitted",
     "message": "Spare return request created successfully",
     "data": {
       "return_request_id": 102,
       "created_at": "2026-02-27T10:30:00Z"
     }
   }
   ```

6. **Save Return ID for Next Test**
   - Note the `return_id`: 102
   - You'll use this in next requests

---

## Step 8: Test GET with ID Parameter

### Test: Get Specific Return Details

1. **Click Collection Request**
   ```
   Collections
   └── Technician Spare Return APIs
       └── 2. Get Specific Return Details ← Click
   ```

2. **View Request**
   ```
   Method: [GET] ▼
   URL: {{SERVER_URL}}/api/technician-spare-returns/102
   ```

3. **Change ID if Needed**
   - Replace `102` with your return_id from previous test
   - Example: `/102` → `/103`

4. **Click "Send"**

5. **View Response**
   ```
   ✓ Status: 200 OK
   
   Response includes all details:
   {
     "return_id": 102,
     "status": "submitted",
     "items": [...],
     "created_at": "...",
     "remarks": "..."
   }
   ```

---

## Step 9: Test Update/Action Request

### Test: Receive Spare Return

1. **Click Collection Request**
   ```
   Collections
   └── Technician Spare Return APIs
       └── 4. Update Return Status ← Click
   ```

2. **View Request**
   ```
   Method: [POST] ▼
   URL: {{SERVER_URL}}/api/technician-spare-returns/102/receive
   
   Body (raw JSON):
   {
     "remarks": "Spares received and verified at service center"
   }
   ```

3. **Update Return ID**
   - URL has `/102/receive`
   - Replace `102` with your return_id
   - Example: `/103/receive`

4. **Click "Send"**

5. **View Response**
   ```
   ✓ Status: 200 OK
   
   {
     "success": true,
     "message": "Return received successfully",
     "status": "received"
   }
   ```

---

## Step 10: View All Tests in Sequence

### Complete Testing Workflow

**Flow:** Create → Get → Receive → Verify

```
1. Create Spare Return (POST)
   ↓ Returns: return_id = 102
   
2. Get Return Details (GET /102)
   ↓ Confirms data created
   
3. Receive Return (POST /102/receive)
   ↓ Status changes to "received"
   
4. Verify Return (POST /102/verify)
   ↓ Status changes to "verified"
   
5. Query Database
   ↓ Confirms all changes saved
```

---

## Postman Interface Guide

### Main Window Layout

```
Postman Window
│
├── [Top Menu Bar]
│   ├── File | Edit | View | Help
│   └── [Gear Icon] [Dropdown: Local-Dev]
│
├── [Left Sidebar]
│   ├── Collections ▼
│   │   └── Technician Spare Return APIs ✓
│   │       ├── 1. Get All Returns
│   │       ├── 2. Get Return Details
│   │       ├── 3. Create Return
│   │       └── ...
│   │
│   └── Environments
│       └── Local-Dev
│
├── [Center - Request Editor]
│   ├── [Tab Name: "Get All Returns"]
│   ├── [GET dropdown] [URL field]
│   │
│   ├── [Tabs: Params | Headers | Body | Pre-request Script | Tests]
│   │   ├── Params: URL parameters
│   │   ├── Headers: HTTP headers
│   │   │   Authorization: Bearer {{TECH_TOKEN}}
│   │   │   Content-Type: application/json
│   │   └── Body: JSON data
│   │
│   └── [Send] [Save] buttons
│
└── [Bottom - Response Panel]
    ├── [Tabs: Body | Cookies | Headers | Tests]
    ├── Status: 200 OK ✓
    └── Response Body (JSON formatted)
```

---

## Common Testing Patterns

### Pattern 1: Testing GET Endpoint

```
1. Click request from collection
2. Check URL is correct
3. Check Authorization header has token
4. Click "Send"
5. Look for 200 status
6. View response data
```

### Pattern 2: Testing POST Endpoint

```
1. Click request from collection
2. Click "Body" tab
3. View/edit JSON data
4. Click "Send"
5. Look for 201 status
6. Note returned IDs for next tests
```

### Pattern 3: Testing with Parameters

```
1. Click request
2. Replace {id} in URL with actual ID
   Example: /102/receive → /103/receive
3. Update Body if needed
4. Click "Send"
5. Verify status and response
```

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| **Cmd/Ctrl + Enter** | Send Request |
| **Cmd/Ctrl + K** | Open Collections |
| **Cmd/Ctrl + Shift + M** | Switch to Mobile View |
| **Cmd/Ctrl + Shift + C** | Open Console |
| **Cmd/Ctrl + .** | Next Tab |
| **Cmd/Ctrl + ,** | Previous Tab |

---

## Debugging Tips

### If Request Fails

**Status 401 Unauthorized:**
```
Problem: Token missing or invalid
Solution:
1. Gear icon ⚙️ → Manage Environments
2. Find "Local-Dev"
3. Copy fresh token from: 
   GET http://localhost:3000/api/auth/test-token?centerId=1
4. Paste in TECH_TOKEN "Current Value"
5. Save environment
6. Try request again
```

**Status 404 Not Found:**
```
Problem: Wrong URL or endpoint doesn't exist
Solution:
1. Check URL spelling
2. Verify {{SERVER_URL}} resolves to http://localhost:3000
3. Check API documentation
4. Verify query parameters (like ?centerId=1)
```

**Status 500 Server Error:**
```
Problem: Backend/server issue
Solution:
1. Check if server is running: npm start
2. Check server console for error messages
3. Restart server (Ctrl+C then npm start)
4. Check database connection
```

**Status Timeout:**
```
Problem: Server not responding
Solution:
1. Verify server is running
2. Check if port 3000 is in use
3. Increase timeout: 
   Settings → General → Request timeout (default 0)
4. Restart Postman
```

---

## Pre-filled Collection Usage

Your `Postman_SpareReturnAPIs.json` includes pre-filled data:

```
Request: "3. Create New Return Request"
Body includes example:
{
  "serviceCenterId": 1,
  "callId": 1005,
  "remarks": "Defective spare collected",
  "items": [
    {
      "spareId": 1,
      "itemType": "defective",
      "requestedQty": 1,
      "defectReason": "Motor not running"
    }
  ]
}
```

You can:
- **Keep as-is** for quick testing
- **Modify values** to test different scenarios
- **Add more items** to test multiple spares

---

## Step-by-Step: Complete Testing Session

### Start to Finish Example

**Time: ~10 minutes**

#### 1. Start Server (5 sec)
```
Terminal:
cd c:\Crm_dashboard\server
npm start
→ Wait: "Server running on port 3000"
```

#### 2. Open Postman (30 sec)
```
1. Open Postman app
2. File → Import → Postman_SpareReturnAPIs.json
3. Click Import button
→ Collection appears in left sidebar
```

#### 3. Generate Token (1 min - Technician Login)
```
1. Gear icon ⚙️ → Manage Environments
2. Create "Local-Dev"
3. Add SERVER_URL and TECH_TOKEN variables
4. New request: POST http://localhost:3000/api/auth/login
5. Body (raw JSON):
   {
     "username": "technician@example.com",
     "password": "password123"
   }
6. Copy token from response
7. Paste in TECH_TOKEN current value
8. Save environment

OR Option B (Quick test):

4. New request: GET http://localhost:3000/api/auth/test-token?centerId=1
5. Send
6. Copy token from response
7. Paste in TECH_TOKEN variable
8. Save
```

#### 4. Select Environment (30 sec)
```
1. Top-right dropdown → Select "Local-Dev"
```

#### 5. Test Requests (5 min)
```
Test 1: Click "1. Get All Returns" → Send → ✓ 200
Test 2: Click "3. Create Return" → Send → ✓ 201 (note return_id)
Test 3: Click "2. Get Return Details" → Update ID → Send → ✓ 200
Test 4: Click "4. Receive Return" → Update ID → Send → ✓ 200
Test 5: Click "5. Verify Return" → Update ID → Send → ✓ 200
```

#### 6. Verify in Database (2 min)
```
SQL Server:
SELECT * FROM technician_spare_returns 
WHERE return_id = 102;
→ Confirm all data matches what you created
```

**Result: ✓ Your API is working correctly!**

---

## Troubleshooting Postman

| Issue | Solution |
|-------|----------|
| Collection won't import | Verify JSON file is valid |
| Variables show {{}} instead of values | Select environment in top-right |
| 401 error on all requests | Regenerate token, ensure Bearer format |
| Server not found | Check http://localhost:3000 loads |
| Response not visible | Make sure bottom panel is expanded |
| Can't see full response | Click "Body" tab, scroll down |

---

## Next Steps After Testing

1. ✓ APIs work in Postman
2. ✓ Data saves to database correctly
3. ✓ Use API_INTEGRATION_GUIDE.md to integrate into your app
4. ✓ Share Postman collection with developers

---

**Now Ready to Test!**

1. Follow steps above
2. Test each API endpoint
3. Verify responses
4. Check database for data
5. Confirm all working before app integration

**Any issues? Check the Troubleshooting section above!**

---

**Generated**: February 27, 2026
**Version**: 1.0
