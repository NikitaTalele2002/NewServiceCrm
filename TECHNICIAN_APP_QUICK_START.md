# Technician App APIs - Quick Start Guide

**Created:** February 27, 2026  
**Status:** Ready for Testing & Integration

---

## 📁 Files Created

### 1. **TECHNICIAN_APP_POSTMAN_COLLECTION.json** (18 KB)
- **Purpose:** Complete Postman collection with all 20 technician APIs
- **Location:** `c:\Crm_dashboard\TECHNICIAN_APP_POSTMAN_COLLECTION.json`
- **Contents:**
  - 20 API endpoints organized in 8 sections
  - Pre-configured request/response examples
  - Postman environment variables
  - Sample request bodies

**How to Use:**
```
1. Open Postman
2. Click Import → Select TECHNICIAN_APP_POSTMAN_COLLECTION.json
3. Create new environment with variables:
   - token = (empty, will be filled after login)
   - callId = 100
   - requestId = 1
   - returnId = 1
   - holdId = 1
   - spareId = 1
4. Run API tests one by one
```

---

### 2. **TECHNICIAN_APP_API_TESTING_GUIDE.md** (24 KB)
- **Purpose:** Comprehensive testing guide with step-by-step instructions
- **Location:** `c:\Crm_dashboard\TECHNICIAN_APP_API_TESTING_GUIDE.md`
- **Contents:**
  - Setup & prerequisites
  - Authentication flow
  - Complete test cases for all 20 APIs
  - Expected request/response formats
  - Error scenarios & troubleshooting
  - Integration checklist
  - Performance guidelines

**How to Use:**
```
1. Read the setup & prerequisites section
2. Start with Authentication tests
3. Follow testing workflow in order
4. Use provided curl commands or Postman
5. Check integration checklist before frontend integration
6. Refer to troubleshooting section for issues
```

---

## 📊 Summary of APIs Tested

### Total: 20 Technician APIs organized in 8 categories

| # | Category | APIs | File |
|---|----------|------|------|
| 1 | Authentication | 1 | auth.js |
| 2 | Spare Request (Rental) | 2 | technician-sc-spare-requests.js |
| 3 | Spare Return | 3 | technician-spare-returns.js |
| 4 | Spare Consumption | 3 | technician-tracking.js |
| 5 | TAT Tracking | 3 | technician-tracking.js |
| 6 | TAT Holds | 4 | technician-tracking.js |
| 7 | Call Management | 2 | technician-tracking.js |
| 8 | Spare History | 2 | spareTrackingCalls.js |

---

## 🚀 Quick Start Steps

### Step 1: Start Server
```bash
cd c:\Crm_dashboard\server
npm start
# Server should run on port 5000
```

### Step 2: Import Postman Collection
- Open Postman
- Click **Import** button
- Select `TECHNICIAN_APP_POSTMAN_COLLECTION.json`
- Click **Import**

### Step 3: Login to Get Token
1. In Postman, select environment (create one if needed)
2. Go to **1. Authentication → Login** request
3. Update username/password if needed
4. Click **Send**
5. Copy token from response
6. Set `token` variable in Postman environment

### Step 4: Test All APIs
- Follow the order in Postman collection
- Use provided test data
- Verify responses match expected format
- Check for success messages

---

## ✅ Testing Checklist

### Before Testing
- [ ] Server running on port 5000
- [ ] Database connection working
- [ ] Postman installed
- [ ] Collection imported

### Authentication (Start Here)
- [ ] **Login** - Get token
- [ ] Store token in environment variable

### Spare Request Tests
- [ ] Create Spare Request
- [ ] Get Request Details

### Spare Return Tests
- [ ] Create Return Request
- [ ] Get All Returns
- [ ] Get Return Details

### Tracking Tests
- [ ] Log Spare Consumption
- [ ] Create TAT Record
- [ ] Create TAT Hold
- [ ] Resolve Hold
- [ ] Close Call
- [ ] Get Call Summary

### Verification Tests
- [ ] Get Spare History
- [ ] Get Calls Using Spare
- [ ] Error scenarios

---

## 📋 Testing Order (Recommended Path)

```
1. Authentication
   ├── Login (get token)
   
2. Create Records
   ├── Create Spare Request
   ├── Create Spare Return
   ├── Log Spare Consumption
   ├── Create TAT Record
   ├── Create TAT Hold
   
3. View/Get Records
   ├── Get Request Details
   ├── Get All Returns
   ├── Get Consumption History
   ├── Get TAT Records
   ├── Get Hold Details
   
4. Update Records
   ├── Resolve TAT Hold
   ├── Close Call
   
5. Summary & Verification
   ├── Get Call Summary
   ├── Get Spare History
   ├── Get Calls Using Spare
```

---

## 🔍 Sample Testing Flow

### Complete End-to-End Test (10-15 minutes)

```
1. Login [1 min]
   POST /api/auth/login
   → Get token

2. Create Spare Request [2 min]
   POST /api/technician-sc-spare-requests/create
   → Get requestId

3. Verify Request [1 min]
   GET /api/technician-sc-spare-requests/{requestId}
   → Verify details

4. Log Spare Usage [1 min]
   POST /api/technician-tracking/spare-consumption
   → Log usage

5. Create TAT Hold [1 min]
   POST /api/technician-tracking/tat-holds
   → Get holdId

6. Resolve Hold [1 min]
   PUT /api/technician-tracking/tat-holds/{holdId}/resolve
   → Verify resolved

7. Close Call [1 min]
   POST /api/technician-tracking/call/{callId}/close
   → Verify closed

8. Create Return Request [2 min]
   POST /api/technician-spare-returns/create
   → Get returnId

9. Verify Return [1 min]
   GET /api/technician-spare-returns/{returnId}
   → Verify details

10. Get Summary [1 min]
    GET /api/technician-tracking/summary/{callId}
    → View complete summary
```

---

## 🐛 Troubleshooting

### Issue: "401 Unauthorized"
**Solution:**
- Verify token is set in environment variable
- Re-run login request
- Check Authorization header format: `Bearer <token>`

### Issue: "404 Not Found"
**Solution:**
- Verify the ID exists (use correct callId, requestId, etc.)
- Check you're using latest created resource IDs
- Verify endpoint URL is correct

### Issue: "400 Bad Request"
**Solution:**
- Check request body format (valid JSON)
- Verify required fields are present
- Check data types (numbers, strings, arrays)

### Issue: "500 Internal Server Error"
**Solution:**
- Check server logs for errors
- Restart server: `npm start`
- Verify database is connected
- Check if port 5000 is available

### Issue: "ECONNREFUSED"
**Solution:**
- Start server: `cd server && npm start`
- Verify port 5000 is not in use
- Check firewall settings

---

## 📖 Documentation Files

| File | Purpose | Size | Usage |
|------|---------|------|-------|
| TECHNICIAN_APP_POSTMAN_COLLECTION.json | API collection for Postman | 18 KB | Import to Postman |
| TECHNICIAN_APP_API_TESTING_GUIDE.md | Detailed testing instructions | 24 KB | Reference guide |
| TECHNICIAN_APP_QUICK_START.md | This file | 5 KB | Quick overview |

---

## 🎯 Integration Ready?

Before integrating with frontend, verify:

✅ **Functionality**
- [ ] All 20 APIs tested
- [ ] Responses match expected format
- [ ] Error handling working correctly

✅ **Performance**
- [ ] GET requests < 500ms
- [ ] POST requests < 1000ms
- [ ] Database queries optimized

✅ **Security**
- [ ] Token authentication working
- [ ] Data isolation per technician verified
- [ ] No SQL injection vulnerabilities

✅ **Data Quality**
- [ ] Sample data created
- [ ] Database records properly linked
- [ ] Calculations verified

---

## 📞 Quick Reference

### API Base URL
```
http://localhost:5000
```

### Authentication Header
```
Authorization: Bearer <your_token_here>
```

### Common Query Parameters
- `callId` - ID of the call
- `requestId` - ID of spare request
- `returnId` - ID of return request
- `holdId` - ID of TAT hold
- `spareId` - ID of spare part

### Status Codes
- `200` - Success
- `400` - Bad Request (check input)
- `401` - Unauthorized (login again)
- `403` - Forbidden (no permission)
- `404` - Not Found (check ID)
- `500` - Server Error (check logs)

---

## 📝 Notes

- **All timestamps** are in UTC format (ISO 8601)
- **Token expires** after 24 hours (depends on config)
- **Database transactions** ensure data consistency
- **Response time** depends on database and server load

---

## ✨ Status

| Component | Status | Notes |
|-----------|--------|-------|
| API Endpoints | ✅ Complete | 20 APIs ready |
| Testing Guide | ✅ Complete | Comprehensive coverage |
| Postman Collection | ✅ Complete | Ready to import |
| Error Handling | ✅ Complete | All scenarios covered |
| Documentation | ✅ Complete | Examples & troubleshooting |

---

**Ready for Frontend Integration! 🚀**

---

**Created:** February 27, 2026  
**Version:** 1.0  
**Author:** Development Team
