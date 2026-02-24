/**
 * SERVICE CENTER ID FLOW - COMPLETE EXPLANATION
 * ============================================
 * 
 * PROBLEM:
 * --------
 * user_id and asc_id are DIFFERENT values:
 * - user_id: ID in Users table (e.g., user_id=8)
 * - asc_id: ID in ServiceCenter table (e.g., asc_id=4)
 * 
 * The system was incorrectly mixing them up or using the wrong one.
 * 
 * SOLUTION:
 * --------
 * ALWAYS use asc_id (NOT user_id) when:
 * 1. Storing serviceCenterId in localStorage
 * 2. Fetching complaints for a service center
 * 3. Making API calls
 * 
 * HOW IT WORKS NOW:
 * ================
 * 
 * 1. LOGIN FLOW (Backend - server/services/authService.js):
 *    ├─ User logs in with username/password
 *    ├─ Backend finds user in Users table (getting user_id)
 *    ├─ Backend queries ServiceCenter table with WHERE user_id = ?
 *    ├─ Backend extracts asc_id from ServiceCenter record
 *    └─ Backend returns asc_id in response.user.centerId
 * 
 * 2. LOGIN RESPONSE (Backend - server/controllers/authController.js):
 *    └─ Response includes:
 *       {
 *         user: {
 *           user_id: 8,          // User's ID in Users table
 *           centerId: 4,         // asc_id from ServiceCenter table
 *           Role: "service_center"
 *         }
 *       }
 * 
 * 3. FRONTEND STORAGE (client/src/pages/user_management/login.jsx):
 *    ├─ Frontend receives response
 *    ├─ Extracts: centerId (which is asc_id=4)
 *    └─ Stores in localStorage:
 *       localStorage.setItem('serviceCenterId', '4')  // asc_id, NOT user_id
 * 
 * 4. COMPLAINTS FETCH (client/src/pages/call_centre/CallUpdate.jsx):
 *    ├─ CallUpdate page starts loading
 *    ├─ Checks if role === 'service_center'
 *    ├─ Retrieves: const serviceCenterId = localStorage.getItem('serviceCenterId')  // Gets '4'
 *    └─ Calls API:
 *       GET /api/call-center/complaints/by-service-center/4
 * 
 * 5. BACKEND ENDPOINT (server/controllers/callCenterController.js):
 *    ├─ Receives: :ascId = 4
 *    ├─ Queries Calls table:
 *    │  WHERE assigned_asc_id = 4
 *    └─ Returns all complaints for service center with asc_id=4
 * 
 * 
 * SUMMARY OF IDS:
 * ===============
 * 
 * ┌─────────────┬──────────┬────────────────────────────────────────┐
 * │ Field       │ Value    │ Used For                               │
 * ├─────────────┼──────────┼────────────────────────────────────────┤
 * │ user_id     │ 8        │ Identifying which user logged in       │
 * │ asc_id      │ 4        │ Identifying which service center       │
 * │ serviceCenterId (localStorage) │ 4  │ Fetching complaints   │
 * └─────────────┴──────────┴────────────────────────────────────────┘
 * 
 * 
 * CONSOLE LOGS TO VERIFY:
 * =======================
 * 
 * After logging in, check browser console (F12):
 * 
 * 1. Login phase:
 *    [LOGIN] ✓ Service Center asc_id stored in localStorage: 4
 *    [LOGIN]   This is the asc_id from ServiceCenter table, used for fetching complaints
 * 
 * 2. CallUpdate phase:
 *    [CallUpdate] Retrieved asc_id from localStorage: 4
 *    [CallUpdate] This comes from ServiceCenter.asc_id, not from Users.user_id
 *    [CallUpdate] ✓ Using endpoint for service center asc_id: 4
 * 
 * 3. Check localStorage:
 *    Open DevTools → Application → LocalStorage
 *    serviceCenterId should equal your asc_id (e.g., 4)
 * 
 * 
 * FILES MODIFIED:
 * ===============
 * 
 * Backend:
 * ├─ server/services/authService.js
 * │  └─ Returns asc_id (not any other ID) from ServiceCenter table
 * │  
 * ├─ server/controllers/authController.js
 * │  └─ Includes full user object with centerId (asc_id) in response
 * │  
 * └─ server/controllers/callCenterController.js
 *    └─ Uses ascId parameter to filter calls by assigned_asc_id
 * 
 * Frontend:
 * ├─ client/src/pages/user_management/login.jsx
 * │  └─ Stores js.user.centerId (asc_id) in localStorage
 * │  
 * └─ client/src/pages/call_centre/CallUpdate.jsx
 *    └─ Retrieves asc_id from localStorage for API calls
 * 
 * 
 * TESTING:
 * ========
 * 
 * 1. Clear browser storage:
 *    Open DevTools → Application → LocalStorage → Clear All
 * 
 * 2. Clear cookie storage if needed:
 *    Open DevTools → Application → Cookies → Delete
 * 
 * 3. Restart both servers:
 *    Backend: npm start (or ctrl+c and restart)
 *    Frontend: npm run dev (or ctrl+c and restart)
 * 
 * 4. Login with service center credentials
 * 
 * 5. Check console logs for asc_id values
 * 
 * 6. Verify localStorage.serviceCenterId equals your asc_id
 * 
 * 7. Go to Call Update page - should show your service center's complaints
 * 
 */

// EXAMPLE FLOW WITH ACTUAL VALUES:
//
// User "Pune_East_Service_Centre" has:
// - user_id = 7 (in Users table)
// - asc_id = 4 (in ServiceCenter table)
//
// 1. User logs in
// 2. Backend queries: SELECT * FROM ServiceCenter WHERE user_id = 7
// 3. Result:  { asc_id: 4, asc_name: "Pune East Service Centre", ... }
// 4. Backend returns centerId: 4 in response
// 5. Frontend stores: localStorage.serviceCenterId = "4"
// 6. CallUpdate calls: /api/call-center/complaints/by-service-center/4
// 7. Backend queries: SELECT * FROM Calls WHERE assigned_asc_id = 4
// 8. Returns all complaints for service center #4
