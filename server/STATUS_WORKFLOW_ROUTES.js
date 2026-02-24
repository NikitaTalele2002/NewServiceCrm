/**
 * STATUS WORKFLOW - API ROUTES CONFIGURATION
 * Routes for retrieving and managing status/sub-status data
 */

// File: server/routes/statusRoutes.js
// This file contains the routes needed for status management

import express from 'express';
import * as callCenterController from '../controllers/callCenterController.js';

const router = express.Router();

/**
 * GET /api/call-center/complaint/:callId/status
 * Get current status and sub-status for a call
 */
router.get('/complaint/:callId/status', callCenterController.getCallCurrentStatus);

/**
 * GET /api/call-center/complaint/:callId/status-history
 * Get the complete status history for a call with all status changes
 */
router.get('/complaint/:callId/status-history', callCenterController.getCallStatusHistory);

/**
 * POST /api/call-center/register-complaint
 * Register a new complaint with initial status
 * When assigned_asc_id is provided, sets status="open" and sub_status="assigned to the service center"
 * 
 * Request body:
 * {
 *   customer_id: number,
 *   remark: string,
 *   assigned_asc_id: number (optional),
 *   visit_date: string (optional),
 *   visit_time: string (optional)
 * }
 */
router.post('/register-complaint', callCenterController.registerComplaint);

/**
 * POST /api/call-center/complaint/assign-asc
 * Assign complaint to a service center
 * Sets status="open" and sub_status="assigned to the service center"
 * 
 * Request body:
 * {
 *   call_id: number,
 *   asc_id: number,
 *   assigned_by: string (optional)
 * }
 */
router.post('/complaint/assign-asc', callCenterController.assignComplaintToASC);

/**
 * POST /api/complaints/assign-technician
 * Assign technician to a complaint
 * Sets status="open" and sub_status="assigned to the technician"
 * Called from complaintController
 * 
 * Request body:
 * {
 *   complaintId: number,
 *   technicianId: number
 * }
 */
// Note: This is in complaintController, not callCenterController

/**
 * POST /api/spare-requests/create
 * Create a spare request for a complaint
 * Sets status="pending" and sub_status="pending for spares"
 * 
 * Request body:
 * {
 *   complaintId: number,
 *   technicianId: number,
 *   items: [
 *     { sku: string, requestedQty: number }
 *   ],
 *   notes: string (optional)
 * }
 */
// Note: This is in spareRequestController, not callCenterController

export default router;

// ============================================================================
// INTEGRATION INSTRUCTIONS
// ============================================================================
/*

1. ADD TO server/routes/callCenterRoutes.js:
   ----------------------------------------
   import { getCallCurrentStatus, getCallStatusHistory } from '../controllers/callCenterController.js';
   
   // Get current status for a call
   router.get('/complaint/:callId/status', getCallCurrentStatus);
   
   // Get status history for a call
   router.get('/complaint/:callId/status-history', getCallStatusHistory);


2. ADD TO server/routes/complaintRoutes.js (if using separate complaint routes):
   --------
   Already integrated in complaintController.assignTechnician


3. ADD TO server/routes/spareRequestRoutes.js:
   --------
   Already integrated in spareRequestController.create


4. ADD TO server/server.js (if using combined routing):
   --------
   import statusRoutes from './routes/statusRoutes.js';
   app.use('/api/call-center', statusRoutes);


5. IMPORT SUBSTATUS IN ALL NECESSARY FILES:
   --------
   ✅ callCenterController.js - Already added SubStatus import
   ✅ spareRequestService.js - Already added Status and SubStatus imports
   ⚠️  Check if needed in other files

*/

// ============================================================================
// EXAMPLE API CALL SEQUENCES
// ============================================================================

/*

SEQUENCE 1: Complete Complaint Workflow
========================================

Step 1: Register Complaint
POST /api/call-center/register-complaint
{
  customer_id: 1,
  remark: "Device is not turning on",
  assigned_asc_id: 5
}

Response:
{
  success: true,
  call: {
    call_id: 101,
    status_id: 6,           // "open"
    sub_status_id: 2,       // "assigned to the service center"
  }
}

Step 2: Check Current Status
GET /api/call-center/complaint/101/status

Response:
{
  success: true,
  callId: 101,
  status: { statusId: 6, statusName: "open" },
  subStatus: { subStatusId: 2, subStatusName: "assigned to the service center" }
}

Step 3: Assign Technician
POST /api/complaints/assign-technician
{
  complaintId: 101,
  technicianId: 7
}

Response:
{
  assignedTechnicianId: 7,
  assignedTechnicianName: "John Doe"
}

Step 4: Check Updated Status
GET /api/call-center/complaint/101/status

Response:
{
  success: true,
  callId: 101,
  status: { statusId: 6, statusName: "open" },           // Still "open"
  subStatus: { subStatusId: 3, subStatusName: "assigned to the technician" }  // Updated
}

Step 5: Request Spares
POST /api/spare-requests/create
{
  complaintId: 101,
  technicianId: 7,
  items: [
    { sku: "PART001", requestedQty: 2 }
  ]
}

Response:
{
  success: true,
  requestId: 1,
  requestNumber: "REQ-1708747..."
}

Step 6: Check Final Status
GET /api/call-center/complaint/101/status

Response:
{
  success: true,
  callId: 101,
  status: { statusId: 1, statusName: "pending" },         // Changed to "pending"
  subStatus: { subStatusId: 5, subStatusName: "pending for spares" }  // Changed to "pending for spares"
}

Step 7: View Status History
GET /api/call-center/complaint/101/status-history

Response:
{
  success: true,
  callId: 101,
  currentStatus: { statusId: 1, statusName: "pending" },
  currentSubStatus: { subStatusId: 5, subStatusName: "pending for spares" },
  statusHistory: [
    {
      logId: 1,
      timestamp: "2026-02-24T08:00:00Z",
      status: { statusId: 6, statusName: "open" },
      subStatus: { subStatusId: 2, subStatusName: "assigned to the service center" },
      user: { userId: 1, username: "call_center_op" },
      remarks: "Status changed to open..."
    },
    {
      logId: 2,
      timestamp: "2026-02-24T08:15:00Z",
      status: { statusId: 6, statusName: "open" },
      subStatus: { subStatusId: 3, subStatusName: "assigned to the technician" },
      user: { userId: 2, username: "sc_manager" },
      remarks: "Technician assigned"
    },
    {
      logId: 3,
      timestamp: "2026-02-24T08:30:00Z",
      status: { statusId: 1, statusName: "pending" },
      subStatus: { subStatusId: 5, subStatusName: "pending for spares" },
      user: { userId: 7, username: "technician_1" },
      remarks: "Spare request created"
    }
  ]
}

*/

// ============================================================================
// STATUS BADGE CONFIGURATION FOR FRONTEND
// ============================================================================

/*

STATUS COLOR MAPPING:
=====================

open -> Primary Blue (#007BFF)
pending -> Orange/Warning (#FFC107)
closed -> Green/Success (#28A745)
cancelled -> Gray (#6C757D)
rejected -> Red/Danger (#DC3545)
approved -> Light Green (#D4EDDA)
approved_by_rsm -> Cyan (#17A2B8)
rejected_by_rsm -> Light Red (#F8D7DA)

SUB-STATUS ICONS:
=================

assigned to the service center -> 🏢 or ✓
assigned to the technician -> 👨‍🔧 or ✓✓
pending for spares -> ⏳ or 📦
pending for replacement -> ⏳ or 🔄
pending for rsm approval -> ⏳ or 👤
pending for hod approval -> ⏳ or 👥
repair closed -> ✅
replacement closed -> ✅
rejected by rsm -> ❌
rejected by hod -> ❌
rejected by asc -> ❌

*/
