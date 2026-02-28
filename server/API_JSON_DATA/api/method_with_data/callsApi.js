/**
 * Mobile API Method Definitions - Calls Management
 * Exactly mirrors the return structures from technician-tracking.js and specialized call APIs
 */

export const callsApi = {
    /**
     * getAssignedCalls(technicianId)
     * 
     * Returns same structure as GET /api/technician-tracking/assigned-calls/:technicianId
     */
    async getAssignedCalls(technicianId) {
        return {
            success: true,
            technicianId: 7,
            totalCalls: 1,
            calls: [
                {
                    callId: 101,
                    customerId: 1,
                    customerName: "Raj Kumar",
                    mobileNumber: "9876543210",
                    product: "Samsung TV",
                    model: "UA55AU7700",
                    status: {
                        statusId: 6,
                        statusName: "open"
                    },
                    substatus: {
                        subStatusId: 2,
                        subStatusName: "assigned"
                    },
                    assignedTechnicianId: 7,
                    createdAt: "2026-02-26T10:00:00Z"
                }
            ]
        };
    },

    /**
     * getCallSummary(callId)
     * 
     * Returns same structure as GET /api/technician-tracking/summary/:callId
     */
    async getCallSummary(callId) {
        return {
            ok: true,
            callId: 101,
            summary: {
                spares: {
                    count: 1,
                    consumed: 1,
                    partial: 0,
                    unused: 0,
                    details: [
                        {
                            usage_id: 56,
                            spare_part_id: 2,
                            spare_name: "Samsung Display Panel 55\"",
                            brand: "Samsung",
                            issued_qty: 1,
                            used_qty: 1,
                            returned_qty: 0,
                            usage_status: "USED"
                        }
                    ]
                },
                tat: {
                    id: 89,
                    tat_start_time: "2026-02-26T10:00:00Z",
                    tat_end_time: null,
                    tat_status: "in_progress",
                    total_hold_minutes: 15,
                    elapsed_minutes: 1440,
                    status_label: "In Progress"
                },
                holds: {
                    count: 1,
                    active: 0,
                    resolved: 1,
                    details: [
                        {
                            tat_holds_id: 12,
                            hold_reason: "Customer not available",
                            hold_start_time: "2026-02-26T14:00:00Z",
                            hold_end_time: "2026-02-26T14:15:00Z",
                            hold_duration_minutes: 15,
                            hold_status: "RESOLVED"
                        }
                    ]
                }
            }
        };
    },

    /**
     * closeCall(callId, techId, status)
     * 
     * Returns same structure as POST /api/technician-tracking/call/:callId/close
     */
    async closeCall(callId, techId, status = 'CLOSED') {
        return {
            ok: true,
            message: 'Call closed and spare movements processed successfully',
            callId: 101,
            data: {
                call_id: 101,
                status_id: 8,
                status_name: 'closed',
                technician_id: 7,
                spare_movements: {
                    stock_movements_created: 1,
                    goods_movement_items_created: 1,
                    inventory_updates: 1,
                    total_usages: 1
                }
            }
        };
    }
};

export default callsApi;
