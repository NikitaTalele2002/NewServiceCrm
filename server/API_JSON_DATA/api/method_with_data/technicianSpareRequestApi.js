/**
 * Mobile API Method Definitions - Spare Requests
 * Exactly mirrors the return structures from server/services/technicianSpareRequestService.js
 */

export const technicianSpareRequestApi = {
    /**
     * getTechnicianRequestsForServiceCenter(serviceCenterId)
     */
    async getTechnicianRequestsForServiceCenter(serviceCenterId) {
        return [
            {
                id: 15,
                requestId: "REQ-15",
                spare_request_type: "TECH_ISSUE",
                request_reason: "Broken screen on arrival",
                technician_id: 7,
                technicianName: "Amit Singh",
                call_id: 101,
                status: 6, // maps to status_id in DB
                createdAt: "2026-02-27T10:00:00Z",
                items: [
                    {
                        id: 45,
                        spare_id: 2,
                        spare_code: "SP002",
                        spare_desc: "Samsung Display Panel 55\"",
                        requestedQty: 1,
                        approvedQty: 0,
                        rejectionReason: null,
                        sku: "SP002",
                        partCode: "SP002",
                        description: "Samsung Display Panel 55\""
                    }
                ]
            }
        ];
    },

    /**
     * getTechnicianRequestDetails(requestId, serviceCenterId)
     */
    async getTechnicianRequestDetails(requestId, serviceCenterId) {
        return {
            id: 15,
            requestId: "REQ-15",
            spare_request_type: "TECH_ISSUE",
            request_reason: "Broken screen on arrival",
            technician_id: 7,
            technicianName: "Amit Singh",
            call_id: 101,
            status_id: 6,
            createdAt: "2026-02-27T10:00:00Z",
            items: [
                {
                    id: 45,
                    spare_id: 2,
                    spare_code: "SP002",
                    spare_desc: "Samsung Display Panel 55\"",
                    requestedQty: 1,
                    approvedQty: 0,
                    rejectionReason: null,
                    sku: "SP002",
                    partCode: "SP002",
                    description: "Samsung Display Panel 55\""
                }
            ]
        };
    },

    /**
     * approveTechnicianRequest(requestId, serviceCenterId, approverId, approvalData)
     */
    async approveTechnicianRequest(requestId, serviceCenterId, approverId, approvalData) {
        return {
            success: true,
            requestId: 15,
            stockMovements: [
                {
                    movement_id: 501,
                    reference_no: "REQ-15",
                    qty: 1
                }
            ]
        };
    }
};

export default technicianSpareRequestApi;
