/**
 * Mobile API Method Definitions - Call Spare Usage & Tracking
 * Exactly mirrors the return structures from server/services/callSpareUsageService.js
 */

export const callSpareUsageApi = {
    /**
     * recordCallSpareUsage(callId, technicianId, spareUsage)
     */
    async recordCallSpareUsage(callId, technicianId, spareUsage) {
        return {
            success: true,
            callId: 101,
            technicianId: 7,
            usageRecords: [
                {
                    usageId: 56,
                    spareId: 2,
                    spareName: "Samsung Display Panel 55\"",
                    usedQty: 1,
                    defectiveQty: 0
                }
            ],
            inventoryUpdates: [
                {
                    spareId: 2,
                    spareName: "Samsung Display Panel 55\"",
                    goodDecreased: 1,
                    defectiveIncreased: 1
                }
            ]
        };
    },

    /**
     * getCallSpareUsage(callId)
     */
    async getCallSpareUsage(callId) {
        return [
            {
                usage_id: 56,
                call_id: 101,
                spare_part_id: 2,
                issued_qty: 1,
                used_qty: 1,
                returned_qty: 0,
                usage_status: "USED",
                used_by_tech_id: 7,
                used_at: "2026-02-27T12:00:00Z",
                remarks: "Replaced successfully",
                spare_code: "SP002",
                spare_name: "Samsung Display Panel 55\"",
                spare_brand: "Samsung",
                technician_name: "Amit Singh"
            }
        ];
    }
};

export default callSpareUsageApi;
