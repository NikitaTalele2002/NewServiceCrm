/**
 * TECHNICIAN TO SERVICE CENTER SPARE REQUEST
 * API Usage Examples with cURL, Postman, and Node.js
 */

// ============================================================================
// 1. TECHNICIAN CREATES SPARE REQUEST
// ============================================================================

// cURL Example
/*
curl -X POST http://localhost:5000/api/technician-sc-spare-requests/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TECHNICIAN_TOKEN" \
  -d '{
    "spares": [
      {
        "spareId": 1,
        "quantity": 5
      },
      {
        "spareId": 2,
        "quantity": 3
      }
    ],
    "requestReason": "msl",
    "callId": 123,
    "remarks": "Needed urgently for customer call"
  }'
*/

// JavaScript/Fetch Example
const createSpareRequest = async () => {
  const token = localStorage.getItem('token');
  
  const response = await fetch('/api/technician-sc-spare-requests/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      spares: [
        { spareId: 1, quantity: 5 },
        { spareId: 2, quantity: 3 }
      ],
      requestReason: 'msl',
      callId: 123,
      remarks: 'Needed urgently for customer call'
    })
  });
  
  const data = await response.json();
  if (data.success) {
    console.log('Request created:', data.data.requestNumber);
    console.log('Request ID:', data.data.requestId);
  }
  return data;
};

// Success Response (201 Created)
/*
{
  "success": true,
  "data": {
    "requestId": 5,
    "requestNumber": "REQ-5",
    "technicianName": "John Doe",
    "serviceCenterName": "Mumbai ASC",
    "requestReason": "msl",
    "itemCount": 2,
    "totalQuantity": 8,
    "status": "pending",
    "createdAt": "2024-02-23T10:30:00Z",
    "remarks": "Needed urgently for customer call"
  },
  "message": "Spare request submitted successfully to Service Center"
}
*/

// Error Response (400 Bad Request)
/*
{
  "error": "At least one spare must be requested"
}
*/

// ============================================================================
// 2. SERVICE CENTER VIEWS RENTAL ALLOCATION PAGE
// ============================================================================

// cURL Example
/*
curl -X GET 'http://localhost:5000/api/technician-sc-spare-requests/rental-allocation?status=pending' \
  -H "Authorization: Bearer YOUR_SERVICE_CENTER_TOKEN"
*/

// JavaScript/Fetch Example
const fetchRentalAllocation = async (status = 'pending') => {
  const token = localStorage.getItem('token');
  
  const response = await fetch(
    `/api/technician-sc-spare-requests/rental-allocation?status=${status}`,
    {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  
  const data = await response.json();
  if (data.success) {
    console.log(`Found ${data.data.length} pending requests`);
    data.data.forEach(request => {
      console.log(`
        Request: ${request.requestNumber} from ${request.technicianName}
        Items: ${request.items.length}
        Can Approve: ${request.canApprove}
      `);
    });
  }
  return data;
};

// Success Response (200 OK)
/*
{
  "success": true,
  "data": [
    {
      "requestId": 5,
      "requestNumber": "REQ-5",
      "technicianId": 1,
      "technicianName": "John Doe",
      "technicianPhone": "9876543210",
      "reason": "msl",
      "requestType": "TECH_ISSUE",
      "status": "pending",
      "callId": 123,
      "createdAt": "2024-02-23T10:30:00Z",
      "canApprove": true,
      "items": [
        {
          "itemId": 15,
          "spareId": 1,
          "partCode": "PUMP-MOTOR-24V",
          "partDescription": "Motor Pump 24V",
          "brand": "Bosch",
          "requestedQty": 5,
          "approvedQty": 0,
          "availableQty": 10,
          "defectiveQty": 2,
          "inTransitQty": 0,
          "availability_status": "fully_available",
          "canFullyApprove": true
        },
        {
          "itemId": 16,
          "spareId": 2,
          "partCode": "FILTER-AIR",
          "partDescription": "Air Filter",
          "brand": "Mahle",
          "requestedQty": 3,
          "approvedQty": 0,
          "availableQty": 15,
          "defectiveQty": 0,
          "inTransitQty": 0,
          "availability_status": "fully_available",
          "canFullyApprove": true
        }
      ]
    }
  ],
  "summary": {
    "totalRequests": 1,
    "approvableRequests": 1,
    "partialRequests": 0
  }
}
*/

// ============================================================================
// 3. SERVICE CENTER APPROVES REQUEST
// ============================================================================

// cURL Example
/*
curl -X POST http://localhost:5000/api/technician-sc-spare-requests/5/approve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SERVICE_CENTER_TOKEN" \
  -d '{
    "approvedItems": [
      {
        "itemId": 15,
        "approvedQty": 5
      },
      {
        "itemId": 16,
        "approvedQty": 3
      }
    ],
    "remarks": "All items available in inventory"
  }'
*/

// JavaScript/Fetch Example
const approveSpareRequest = async (requestId, approvedItems, remarks) => {
  const token = localStorage.getItem('token');
  
  const response = await fetch(
    `/api/technician-sc-spare-requests/${requestId}/approve`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        approvedItems,
        remarks
      })
    }
  );
  
  const data = await response.json();
  if (data.success) {
    console.log('Request approved!');
    console.log(`Movement ID: ${data.data.movementId}`);
    console.log(`Items approved: ${data.data.itemsApproved}`);
    console.log(`Total quantity: ${data.data.totalQuantityApproved}`);
  } else {
    console.error('Approval failed:', data.error);
    console.error('Details:', data.details);
  }
  return data;
};

// Success Response (200 OK)
/*
{
  "success": true,
  "data": {
    "requestId": 5,
    "requestNumber": "REQ-5",
    "movementId": 42,
    "status": "approved",
    "itemsApproved": 2,
    "totalQuantityApproved": 8,
    "approvedItems": [
      {
        "itemId": 15,
        "spareId": 1,
        "partCode": "PUMP-MOTOR-24V",
        "approvedQty": 5
      },
      {
        "itemId": 16,
        "spareId": 2,
        "partCode": "FILTER-AIR",
        "approvedQty": 3
      }
    ]
  },
  "message": "Spare request approved! 2 items allocated and 8 units transferred."
}
*/

// Error Response - Insufficient Inventory (400 Bad Request)
/*
{
  "error": "Insufficient inventory for some items",
  "details": [
    {
      "itemId": 15,
      "partCode": "PUMP-MOTOR-24V",
      "requested": 5,
      "available": 2,
      "approved": 5,
      "message": "Only 2 qty available"
    }
  ]
}
*/

// ============================================================================
// 4. SERVICE CENTER REJECTS REQUEST
// ============================================================================

// cURL Example
/*
curl -X POST http://localhost:5000/api/technician-sc-spare-requests/5/reject \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SERVICE_CENTER_TOKEN" \
  -d '{
    "reason": "Insufficient inventory - part PUMP-MOTOR-24V not in stock"
  }'
*/

// JavaScript/Fetch Example
const rejectSpareRequest = async (requestId, reason) => {
  const token = localStorage.getItem('token');
  
  const response = await fetch(
    `/api/technician-sc-spare-requests/${requestId}/reject`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ reason })
    }
  );
  
  const data = await response.json();
  if (data.success) {
    console.log('Request rejected');
    console.log('Reason:', data.data.reason);
  }
  return data;
};

// Success Response (200 OK)
/*
{
  "success": true,
  "data": {
    "requestId": 5,
    "status": "rejected",
    "reason": "Insufficient inventory - part PUMP-MOTOR-24V not in stock"
  },
  "message": "Spare request rejected successfully"
}
*/

// ============================================================================
// POSTMAN COLLECTION - Import into Postman
// ============================================================================

const postmanCollection = {
  info: {
    name: "Technician to SC Spare Requests API",
    description: "Collection for testing spare request workflow",
    schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  item: [
    {
      name: "1. Create Spare Request",
      request: {
        method: "POST",
        header: [
          {
            key: "Content-Type",
            value: "application/json"
          },
          {
            key: "Authorization",
            value: "Bearer {{technician_token}}"
          }
        ],
        body: {
          mode: "raw",
          raw: JSON.stringify({
            spares: [
              { spareId: 1, quantity: 5 },
              { spareId: 2, quantity: 3 }
            ],
            requestReason: "msl",
            callId: 123,
            remarks: "Needed urgently"
          }, null, 2)
        },
        url: {
          raw: "http://localhost:5000/api/technician-sc-spare-requests/create",
          protocol: "http",
          host: ["localhost"],
          port: "5000",
          path: ["api", "technician-sc-spare-requests", "create"]
        }
      }
    },
    {
      name: "2. View Rental Allocation Page",
      request: {
        method: "GET",
        header: [
          {
            key: "Authorization",
            value: "Bearer {{service_center_token}}"
          }
        ],
        url: {
          raw: "http://localhost:5000/api/technician-sc-spare-requests/rental-allocation?status=pending",
          protocol: "http",
          host: ["localhost"],
          port: "5000",
          path: ["api", "technician-sc-spare-requests", "rental-allocation"],
          query: [
            {
              key: "status",
              value: "pending"
            }
          ]
        }
      }
    },
    {
      name: "3. Approve Request",
      request: {
        method: "POST",
        header: [
          {
            key: "Content-Type",
            value: "application/json"
          },
          {
            key: "Authorization",
            value: "Bearer {{service_center_token}}"
          }
        ],
        body: {
          mode: "raw",
          raw: JSON.stringify({
            approvedItems: [
              { itemId: 15, approvedQty: 5 },
              { itemId: 16, approvedQty: 3 }
            ],
            remarks: "All items in stock"
          }, null, 2)
        },
        url: {
          raw: "http://localhost:5000/api/technician-sc-spare-requests/{{request_id}}/approve",
          protocol: "http",
          host: ["localhost"],
          port: "5000",
          path: ["api", "technician-sc-spare-requests", "{{request_id}}", "approve"]
        }
      }
    },
    {
      name: "4. Reject Request",
      request: {
        method: "POST",
        header: [
          {
            key: "Content-Type",
            value: "application/json"
          },
          {
            key: "Authorization",
            value: "Bearer {{service_center_token}}"
          }
        ],
        body: {
          mode: "raw",
          raw: JSON.stringify({
            reason: "Insufficient inventory"
          }, null, 2)
        },
        url: {
          raw: "http://localhost:5000/api/technician-sc-spare-requests/{{request_id}}/reject",
          protocol: "http",
          host: ["localhost"],
          port: "5000",
          path: ["api", "technician-sc-spare-requests", "{{request_id}}", "reject"]
        }
      }
    }
  ]
};

// ============================================================================
// COMMON PATTERNS
// ============================================================================

// Pattern 1: Technician Workflow
/*
1. Technician creates request
   POST /create
   
2. Technician waits for approval
   
3. Technician receives notification (email/SMS)
   
4. Technician picks up spares from SC
*/

// Pattern 2: Service Center Workflow
/*
1. SC sees pending requests
   GET /rental-allocation?status=pending
   
2. SC checks inventory
   [Automatic in response, shows availableQty]
   
3a. If sufficient inventory:
   POST /:requestId/approve
   
3b. If insufficient inventory:
   POST /:requestId/reject
   
4. SC marks as picked up (external system)
*/

// Pattern 3: Error Handling
/*
try {
  const response = await approveSpareRequest(requestId, items, remarks);
  
  if (!response.success) {
    if (response.error === "Insufficient inventory for some items") {
      // Handle inventory shortage
      console.log('Items with insufficient inventory:');
      response.details.forEach(item => {
        console.log(`${item.partCode}: need ${item.requested}, have ${item.available}`);
      });
    } else if (response.error === "Not authorized") {
      // Handle authorization error
      console.log('You do not have permission to approve this request');
    } else {
      // Generic error
      console.log('Failed:', response.error);
    }
  } else {
    // Success
    console.log('Approved! Movement ID:', response.data.movementId);
  }
} catch (err) {
  console.error('Network error:', err);
}
*/

// ============================================================================
// TESTING CHECKLIST
// ============================================================================

/*
BEFORE YOU TEST:
□ Server is running on port 5000
□ Database is connected
□ You have valid technician and service center tokens
□ Technician is assigned to Service Center in database
□ Service Center has spare inventory (qty_good > 0)

TESTING STEPS:
1. Create spare request as technician
   - Capture request_id from response
   - Verify status is 'pending'

2. View rental allocation as service center
   - Verify request appears in the list
   - Verify inventory_status shows availability

3. Approve the request
   - Use request_id from step 1
   - Use item IDs from response or DB
   - Check response for movement_id

4. Verify in database
   - spare_requests: status should be 'approved'
   - stock_movement: should exist with type 'TECH_ISSUE_OUT'
   - spare_inventory: SC qty_good should decrease, Tech qty_good should increase
   - approvals: should have 'approved' record

5. Test edge cases
   - Request with no spares → Error
   - Insufficient inventory → Error
   - Request from wrong technician → Error
   - Reject request → Status becomes 'rejected'
*/

export {
  createSpareRequest,
  fetchRentalAllocation,
  approveSpareRequest,
  rejectSpareRequest,
  postmanCollection
};
