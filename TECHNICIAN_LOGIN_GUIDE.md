# Technician Login with Postman - Quick Guide

Visual step-by-step guide for technician authentication.

---

## Before You Start

### Get Technician Credentials

**Option A: From Database**
```sql
SELECT 
  u.username,
  u.password,
  t.name,
  t.technician_id
FROM technicians t
JOIN users u ON t.user_id = u.user_id
LIMIT 5;
```

**Option B: Default Test Credentials**
```
Username: tech_test@example.com
Password: tech123
```

**Option C: Ask Your Team Lead**
```
Get current technician login credentials
```

---

## Visual Step-by-Step: Technician Login in Postman

### Step 1: Create New Request

**Open Postman** → Click **"+"** tab

```
Postman Window
├── Technician Spare Return APIs (tab)
├── + ← Click here (New tab)
└── [New request tab opens]
```

---

### Step 2: Set Request Type

**Method Dropdown** → Select **POST**

```
Request Editor
├── [POST] ▼ ← Click dropdown, select POST
├── URL field
└── ...
```

---

### Step 3: Enter Login Endpoint

**URL Field** → Paste this:
```
http://localhost:3000/api/auth/login
```

```
Request Editor
├── [POST] ▼
├── http://localhost:3000/api/auth/login ← Paste here
└── [Send button]
```

---

### Step 4: Click Body Tab

**Center panel** → Click **"Body"** tab

```
Tabs in center panel:
├── Params
├── Headers
├── Body ← Click here
├── Pre-request Script
└── Tests
```

---

### Step 5: Select Raw JSON Format

1. **Click "raw"** radio button (below Body tab)
   ```
   Body options:
   ○ form-data
   ○ x-www-form-urlencoded
   ○ raw ← Click this
   ○ binary
   ○ GraphQL
   ```

2. **Change format to JSON** (top right of body editor)
   ```
   Body Editor (top right):
   ├── Text ▼
   ├── JSON ← Select this
   ├── XML
   ├── HTML
   └── ...
   ```

---

### Step 6: Enter Login Credentials

**Paste this JSON in Body Editor:**

```json
{
  "username": "tech_test@example.com",
  "password": "tech123"
}
```

**Your Body editor now shows:**
```
Body (raw JSON):
{
  "username": "tech_test@example.com",
  "password": "tech123"
}
```

**Replace with your actual technician:**
- `tech_test@example.com` → Your technician username
- `tech123` → Your technician password

---

### Step 7: Send Login Request

**Click Send button** (blue button, top right)

```
Request Editor (top right)
├── [Send] ← Click here
├── [Save]
└── ...
```

---

### Step 8: View Login Response

**Bottom panel** shows response:

```
Status: 200 OK ✓

Response Body:
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJ0ZWNoX3Rlc3RAZXhhbXBsZS5jb20iLCJyb2xlIjoidGVjaG5pY2lhbiJ9.xxx...",
  "user": {
    "id": 1,
    "username": "tech_test@example.com",
    "role": "technician"
  }
}
```

**Success indicators:**
- 🟢 Status shows **200 OK**
- 🟢 **"success": true**
- 🟢 **token** field has long string
- 🟢 **role** shows "technician"

---

### Step 9: Copy Token

**In Response Body:**

1. **Find token value:**
   ```
   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            ↑ Long string starting here
   ```

2. **Click on token text** to select it

3. **Right-click** → **Copy** (or Ctrl+C)

4. **Token is now in clipboard** (ready to paste)

---

### Step 10: Save Token to Environment

Now save this token so you can use it in all other requests.

#### A. Open Environment Settings

1. **Click Gear icon** ⚙️ (top right corner)
   ```
   Postman Top Right:
   ├── ... icons
   ├── ⚙️ ← Click gear icon
   └── ...
   ```

2. **Click "Manage Environments"**
   ```
   Settings Menu:
   ├── Settings
   ├── Manage Environments ← Click
   ├── Manage Workspace Settings
   └── ...
   ```

#### B. Edit Local-Dev Environment

1. **Find "Local-Dev"** in list
   ```
   Manage Environments Panel:
   ├── Search box
   ├── Local-Dev ← Click here
   └── ... other environments
   ```

2. **Click "Local-Dev"** to open editor

#### C. Paste Token into TECH_TOKEN

1. **Find TECH_TOKEN row** in variables table
   ```
   Variables Table:
   ├── SERVER_URL | string | http://localhost:3000
   ├── TECH_TOKEN | string | [Current Value field]
   └── ...
   ```

2. **Click "Current Value"** field for TECH_TOKEN

3. **Paste token** (Ctrl+V)
   ```
   Current Value: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

#### D. Save Environment

**Click "Save"** button (bottom right of dialog)

---

### Step 11: Verify Environment is Active

**Top right of Postman window:**

```
Top Right Dropdown:
├── Select environment dropdown
├── Current shows: "Local-Dev" ✓
└── ...
```

If it shows something else:
1. **Click dropdown**
2. **Select "Local-Dev"**

---

### Step 12: Test API with Technician Token

Now test any API endpoint to verify technician token works.

**Example:** Get All Spare Returns

1. **Click Collection** from left sidebar
   ```
   Collections
   └── Technician Spare Return APIs
       └── 1. Get All Technician Returns ← Click
   ```

2. **Click "Send"**

3. **Check Response:**
   ```
   ✓ Status: 200 OK
   
   Response shows data for technician
   ```

**If you get 401 Unauthorized:**
- Token may have expired
- Go back to Step 9-10 to refresh token

---

## Common Issues & Solutions

### Issue: Wrong Credentials

```
Error Response:
{
  "error": "Invalid credentials"
}
```

**Solution:**
1. Verify username/email is correct
2. Verify password is correct
3. Check user exists in database:
   SELECT * FROM users WHERE username = 'your_username';
4. Try default test credentials if available
```

### Issue: User Not Found

```
Error Response:
{
  "error": "User not found",
  "status": 404
}
```

**Solution:**
1. Check username spelling
2. Verify user exists in database
3. Create test technician (see previous section)
```

### Issue: 401 After Testing

```
Error Response:
{
  "error": "Unauthorized"
}
```

**Solution:**
1. Token may have expired
2. Generate new token (repeat Steps 1-10)
3. Update TECH_TOKEN in environment
4. Try request again
```

### Issue: 500 Server Error

```
Error Response:
{
  "error": "Internal Server Error"
}
```

**Solution:**
1. Check if server is running (npm start)
2. Check server console for error messages
3. Restart server
4. Try login again
```

---

## Full Request/Response Example

### Request Shown in Postman:

```
POST http://localhost:3000/api/auth/login
Content-Type: application/json

{
  "username": "tech_test@example.com",
  "password": "tech123"
}
```

### Response Shown in Postman:

```
HTTP/1.1 200 OK
Content-Type: application/json
Date: Fri, 27 Feb 2026 10:30:00 GMT

{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJ0ZWNoX3Rlc3RAZXhhbXBsZS5jb20iLCJyb2xlIjoidGVjaG5pY2lhbiIsImNlbnRlcklkIjoxfQ.X2Kxz9_vP_xyz",
  "user": {
    "id": 1,
    "username": "tech_test@example.com",
    "role": "technician"
  }
}
```

---

## Using Token in Other Requests

Once token is saved in environment, all requests automatically use it.

**Do NOT manually add token to each request.**

### In Request Headers:

Postman automatically adds:
```
Authorization: Bearer {{TECH_TOKEN}}
```

The `{{TECH_TOKEN}}` is replaced with your actual token.

---

## Complete Technician Testing Flow

```
1. Create Login Request (Step 1-6)
   ↓
2. Send Login Request (Step 7)
   ↓
3. Copy Token from Response (Step 9)
   ↓
4. Save Token to Environment (Step 10)
   ↓
5. Select Environment (Step 11)
   ↓
6. Test API Endpoints (Step 12)
   ↓
7. Get Responses with Technician Data ✓
```

---

## Differences: Technician vs Service Center vs Admin

### Technician Login
```
POST /api/auth/login
Body:
{
  "username": "technician@example.com",
  "password": "tech123"
}

Response role: "technician"
```

### Service Center Login
```
POST /api/auth/login
Body:
{
  "username": "sc@example.com",
  "password": "sc123"
}

Response role: "service_center"
```

### Quick Test Token (Any role)
```
GET /api/auth/test-token?centerId=1

Response role: "service_center"
```

---

## Verification Checklist

- [ ] Server is running (npm start)
- [ ] Technician username is correct
- [ ] Technician password is correct
- [ ] Login request shows 200 status
- [ ] Token is copied from response
- [ ] Token pasted in TECH_TOKEN environment variable
- [ ] Environment "Local-Dev" is selected (top right)
- [ ] Test API returns 200 (not 401)
- [ ] Response shows technician's data

---

## Next Steps

Once technician login works:

1. ✓ Test all technician APIs
2. ✓ Test spare return workflow
3. ✓ Test call tracking
4. ✓ Integrate into app code
5. ✓ Deploy to production

---

**Generated**: February 27, 2026
**Version**: 1.0
