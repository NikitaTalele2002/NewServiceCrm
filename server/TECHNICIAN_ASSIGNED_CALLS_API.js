/**
 * TECHNICIAN ASSIGNED CALLS API ENDPOINT
 * 
 * NEW ENDPOINT: GET /api/technician-tracking/assigned-calls/:technicianId
 * 
 * Returns all calls assigned to a technician with full customer & product details
 * Perfect for the technician mobile app to show pending calls
 */

// Example Usage:
// GET http://localhost:3005/api/technician-tracking/assigned-calls/7

// Response Format:
// {
//   "success": true,
//   "technicianId": 7,
//   "totalCalls": 3,
//   "calls": [
//     {
//       "callId": 101,
//       "customerId": 1,
//       "customerName": "Raj Kumar",
//       "mobileNumber": "9876543210",
//       "email": "raj@example.com",
//       "pincode": "400001",
//       "product": "Samsung TV",
//       "model": "UA55AU7700",
//       "serialNumber": "SN123456789",
//       "callType": "repair",
//       "callSource": "phone",
//       "remark": "Screen display issue",
//       "visitDate": "2026-02-27",
//       "visitTime": "10:00 AM",
//       "status": {
//         "statusId": 6,
//         "statusName": "open"
//       },
//       "substatus": {
//         "subStatusId": 2,
//         "subStatusName": "assigned to the technician"
//       },
//       "serviceCenter": {
//         "ascId": 4,
//         "ascName": "Delhi Service Center",
//         "ascCode": "SC001"
//       },
//       "assignedTechnicianId": 7,
//       "technicianName": "Amit Singh",
//       "technicianMobile": "9988776655",
//       "createdAt": "2026-02-26T10:00:00Z",
//       "updatedAt": "2026-02-26T12:00:00Z"
//     }
//   ]
// }

/**
 * NODEJS/JAVASCRIPT EXAMPLE
 */

// Using Fetch API:
async function getTechnicianCalls(technicianId) {
  try {
    const response = await fetch(`http://localhost:3005/api/technician-tracking/assigned-calls/${technicianId}`);
    const data = await response.json();
    
    if (data.success) {
      console.log(`✅ Technician has ${data.totalCalls} assigned calls`);
      data.calls.forEach(call => {
        console.log(`
          Call ID: ${call.callId}
          Customer: ${call.customerName}
          Mobile: ${call.mobileNumber}
          Product: ${call.product}
          Model: ${call.model}
          Serial: ${call.serialNumber}
          Status: ${call.status.statusName}
          Sub-Status: ${call.substatus.subStatusName}
        `);
      });
    } else {
      console.error('Error:', data.error);
    }
  } catch (err) {
    console.error('Failed to fetch calls:', err);
  }
}

// Usage:
// getTechnicianCalls(7);

/**
 * CURL EXAMPLE
 */
/*
curl -X GET http://localhost:3005/api/technician-tracking/assigned-calls/7 \
  -H "Content-Type: application/json"
*/

/**
 * API ROUTE LOCATION
 */
/*
File: server/routes/technician-tracking.js
Endpoint: GET /api/technician-tracking/assigned-calls/:technicianId
*/

/**
 * RESPONSE FIELDS EXPLAINED
 */
/*
- callId: Unique identifier for this complaint/call
- customerId: Customer who reported the issue
- customerName: Full name of customer
- mobileNumber: Customer's primary contact number
- email: Customer's email address
- pincode: Customer's postal code (for logistics)

- product: Product name (e.g., "Samsung TV")
- model: Model number (e.g., "UA55AU7700")
- serialNumber: Serial number for warranty tracking

- callType: Type of call (repair, replacement, etc.)
- callSource: How the call came in (phone, app, walk-in, etc.)
- remark: Additional notes about the complaint

- visitDate: Scheduled visit date
- visitTime: Scheduled visit time

- status: Current status (open, pending, closed, cancelled)
- substatus: Current sub-status (assigned to technician, pending for spares, etc.)
- serviceCenter: The service center assigned to this call

- assignedTechnicianId: ID of technician assigned to this call
- technicianName: Name of assigned technician
- technicianMobile: Mobile number of technician

- createdAt: When the call was created
- updatedAt: Last update time
*/

/**
 * USE CASES FOR TECHNICIAN APP
 */
/*
1. Load Pending Calls
   - Display all outstanding calls on technician's dashboard
   - Show customer contact info for scheduling visits
   - Show product details for identification

2. Call Prioritization
   - Sort by status, date, pincode (for route planning)
   - Filter by call type or status

3. Call Details Widget
   - Tap on a call to see full details
   - Click to call customer
   - View product for diagnosis help

4. Route Planning
   - Use customer pincode to plan visits
   - Optimize route based on call locations

5. Call Status Tracking
   - See current status and sub-status
   - Understand what action is needed
   - Know if waiting for spares or replacement

6. Service Center Info
   - Know which SC the call belongs to
   - Get SC contact info if needed
*/

/**
 * RELATED ENDPOINTS
 */
/*
1. Get Spare Consumption for a Call
   GET /api/technician-tracking/spare-consumption/call/:callId
   
2. Record Spare Usage
   POST /api/technician-tracking/spare-consumption
   
3. Close a Call
   POST /api/technician-tracking/call/:callId/close
   
4. Create Spare Return Request
   POST /api/technician-spare-returns/create
   
5. Create Spare Request
   POST /api/technician-spare-requests/create
*/

/**
 * INTEGRATION WITH TECHNICIAN APP
 */
/*
1. On app startup: Call getTechnicianCalls(currentTechnicianId)
2. Refresh: Call every 5-10 minutes or on pull-to-refresh
3. On call selection: Show call.customermobileNumber with "Call Customer" button
4. On visit completion: Call POST /api/technician-tracking/call/{callId}/close
*/

console.log('✅ Technician Assigned Calls API is ready!');
console.log('📱 Endpoint: GET /api/technician-tracking/assigned-calls/:technicianId');
console.log('📍 All data needed for technician app is included!');
