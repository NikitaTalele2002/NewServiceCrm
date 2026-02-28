/**
 * Mobile API Method Definitions - Spare Returns
 * Exactly mirrors the return structures from server/services/spareReturnRequestService.js
 */

export const spareReturnRequestApi = {
    /**
     * createReturnRequest(data)
     */
    async createReturnRequest(data) {
        return {
            return_request_id: 22,
            request_number: "RET-1740645600000-456",
            status: 'pending',
            technician_id: 7,
            service_center_id: 4
        };
    },

    /**
     * getReturnRequestsForServiceCenter(serviceCenterId, filters)
     */
    async getReturnRequestsForServiceCenter(serviceCenterId, filters = {}) {
        return [
            {
                request_id: 22,
                request_number: "RET-22",
                request_reason: "defective_collected",
                call_id: 101,
                technician_name: "Amit Singh",
                technician_phone: "9988776655",
                status: "pending",
                created_at: "2026-02-27T11:30:00Z",
                updated_at: "2026-02-27T11:30:00Z",
                items: [
                    {
                        return_item_id: 88,
                        sku: "SP002",
                        spare_name: "Samsung Display Panel 55\"",
                        good_qty: 0,
                        defective_qty: 1,
                        approval_status: "pending"
                    }
                ]
            }
        ];
    },

    /**
     * getReturnRequestDetails(returnRequestId, serviceCenterId)
     */
    async getReturnRequestDetails(returnRequestId, serviceCenterId) {
        return {
            request_id: 22,
            request_number: "RET-22",
            spare_request_type: "TECH_RETURN_DEFECTIVE",
            request_reason: "defective_collected",
            call_id: 101,
            technician_id: 7,
            technician_name: "Amit Singh",
            technician_phone: "9988776655",
            service_center_id: 4,
            notes: "Request #: RET-22...",
            status: "pending",
            created_at: "2026-02-27T11:30:00Z",
            updated_at: "2026-02-27T11:30:00Z",
            items: [
                {
                    return_item_id: 88,
                    sku: "SP002",
                    spare_name: "Samsung Display Panel 55\"",
                    good_qty: 0,
                    defective_qty: 1,
                    received_qty: 0,
                    verified_qty: 0
                }
            ]
        };
    },

    /**
     * verifyReturnRequest(returnRequestId, serviceCenterId, verifyData)
     */
    async verifyReturnRequest(returnRequestId, serviceCenterId, verifyData) {
        return {
            return_request_id: 22,
            status: 'verified',
            stock_movement_id: 601,
            total_qty_returned: 1,
            goods_movement_items_count: 1
        };
    }
};

export default spareReturnRequestApi;
