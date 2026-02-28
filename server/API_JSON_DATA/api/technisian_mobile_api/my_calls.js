import express from 'express';
const router = express.Router();
import { Calls, ProductMaster, Customer, CustomersProducts, ProductModel, TATTracking, TATHolds } from '../../../models/index.js';
import { Op, QueryTypes } from 'sequelize';
import { sequelize } from '../../../db.js';

// GET /api/technician/my-calls
router.get('/', async (req, res) => {
    try {
        const technicianId = req.user.id;

        if (!technicianId) {
            return res.status(403).json({ error: 'Technician ID missing in token' });
        }

        console.log(`Fetching calls for technician ID: ${technicianId}`);

        const { Technicians, ServiceCenter } = await import('../../../models/index.js');
        const calls = await Calls.findAll({
            where: {
                assigned_tech_id: technicianId,
            },
            include: [
                { model: ServiceCenter, attributes: ['asc_id', 'asc_name', 'asc_code'] },
                { model: Technicians, attributes: ['technician_id', 'name', 'mobile_no'] }
            ],
            order: [['created_at', 'DESC']]
        });

        // 1. Collect IDs for manual resolution (Safer than complex joins in some envs)
        const customerIds = [...new Set(calls.map(c => c.customer_id).filter(Boolean))];
        const cpIds = [...new Set(calls.map(c => c.customer_product_id).filter(Boolean))];

        const [customers, customersProducts] = await Promise.all([
            Customer.findAll({
                where: { customer_id: { [Op.in]: customerIds } },
                attributes: ['customer_id', 'name', 'mobile_no', 'area']
            }),
            CustomersProducts.findAll({
                where: { customers_products_id: { [Op.in]: cpIds } },
                include: [
                    { model: ProductMaster, as: 'Product', attributes: ['ID', 'VALUE'] },
                    { model: ProductModel, as: 'ProductModel', attributes: ['Id', 'MODEL_CODE', 'MODEL_DESCRIPTION'] }
                ]
            })
        ]);

        const customerMap = customers.reduce((acc, c) => ({ ...acc, [c.customer_id]: c }), {});
        const cpMap = customersProducts.reduce((acc, cp) => ({ ...acc, [cp.customers_products_id]: cp }), {});

        const enrichedCalls = calls.map(c => {
            const data = c.toJSON();
            const cp = cpMap[data.customer_product_id] || null;
            const cust = customerMap[data.customer_id] || null;

            // Map Status IDs to Mobile App CallStatus enum (Matching CRM Table with App Logic)
            let status = 'PENDING';
            if (data.status_id === 6) status = 'OPEN';
            else if (data.status_id === 1) status = 'PENDING';
            else if (data.status_id === 8) status = 'CLOSED';
            else if (data.status_id === 9) status = 'CANCELLED';
            else if (data.status_id === 12) status = 'ON_HOLD';
            else if (data.status_id === 13) status = 'READY_FOR_CLOSURE';
            else if (data.status_id === 14) status = 'ALLOCATED';
            else if (data.status_id === 7) status = 'ASSIGNED';
            else if (data.status_id === 15) status = 'RE_ALLOCATED';

            // Legacy keys for compatibility with mobile Redux slice (callsSlice.ts)
            const legacyData = {
                Id: data.call_id,
                Name: cust ? cust.name : 'Unknown Customer',
                MobileNo: cust ? cust.mobile_no : (data.caller_mobile_no || ''),
                CallStatus: status,
                AppointmentDate: data.visit_date || data.created_at,
                CreatedAt: data.created_at,
                CustomerRemarks: data.customer_remark || data.remark || '',
                ProductSerialNo: cp ? cp.serial_no : '',
                customer: cust ? {
                    Name: cust.name,
                    MobileNo: cust.mobile_no,
                    Area: cust.area || '',
                    City: cust.city || ''
                } : null,
                product: cp ? {
                    Model: cp.ProductModel ? cp.ProductModel.MODEL_CODE : '',
                    ProductName: cp.Product ? cp.Product.VALUE : '',
                    ProductSerialNo: cp.serial_no,
                    WarrantyStatus: cp.warranty_status === 'active' ? 'In Warranty' : 'Out of Warranty'
                } : null
            };

            return {
                call_id: String(data.call_id),
                customer_name: legacyData.Name,
                mobile_no: legacyData.MobileNo,
                status: status,
                sub_status: '',
                visit_date: data.visit_date ? new Date(data.visit_date).toLocaleDateString() : 'N/A',
                model_name: cp && cp.ProductModel ? cp.ProductModel.MODEL_CODE :
                    (cp && cp.Product ? cp.Product.VALUE : 'N/A'),
                ...data,
                ...legacyData
            };
        });

        const finalCalls = enrichedCalls.map(c => {
            return {
                callId: c.call_id,
                customerId: c.customer_id,
                customerName: c.Name,
                mobileNumber: c.MobileNo,
                email: c.customer?.email || '',
                pincode: c.customer?.pincode || '',
                product: c.product?.ProductName || '',
                model: c.product?.Model || '',
                serialNumber: c.product?.ProductSerialNo || '',
                callType: c.call_type || 'repair',
                callSource: c.call_source || 'phone',
                remark: c.remark || c.customer_remark || '',
                visitDate: c.visit_date || '',
                visitTime: c.visit_time || '',
                status: {
                    statusId: c.status_id,
                    statusName: c.CallStatus?.toLowerCase() || ''
                },
                substatus: {
                    subStatusId: c.sub_status_id || 0,
                    subStatusName: c.sub_status || ''
                },
                serviceCenter: {
                    ascId: c.assigned_asc_id,
                    ascName: c.ServiceCenter?.asc_name || '',
                    ascCode: c.ServiceCenter?.asc_code || ''
                },
                assignedTechnicianId: parseInt(technicianId),
                technicianName: c.Technicians?.name || '',
                technicianMobile: c.Technicians?.mobile_no || '',
                createdAt: c.created_at,
                updatedAt: c.updated_at
            };
        });

        res.json({
            success: true,
            technicianId: parseInt(technicianId),
            totalCalls: finalCalls.length,
            calls: finalCalls
        });
    } catch (err) {
        console.error('Fetch my-calls error:', err);
        res.status(500).json({ error: 'Failed to fetch assigned calls', details: err.message });
    }
});

// POST /api/technician-mobile/my-calls/update-status/:callId
router.post('/update-status/:callId', async (req, res) => {
    try {
        const { callId } = req.params;
        const { status, latitude, longitude, holdReason } = req.body;
        const user = req.user;
        const technicianId = user?.id;

        console.log(`[STATUS_UPDATE] Hit: callId=${callId}, techId=${technicianId}, status=${status}`);
        console.log(`[STATUS_UPDATE] Body:`, JSON.stringify(req.body));

        if (!status) {
            return res.status(400).json({ error: 'Status is required' });
        }

        if (!technicianId) {
            console.error('[STATUS_UPDATE] Error: technicianId missing from token');
            return res.status(401).json({ error: 'Technician identity missing' });
        }

        let statusId;
        if (!isNaN(status) && status !== '') {
            statusId = parseInt(status);
        } else {
            const statusMap = {
                'OPEN': 6,
                'PENDING': 1,
                'CLOSED': 8,
                'COMPLETED': 8,
                'RESOLVED': 8,
                'CANCELLED': 9,
                'ON_HOLD': 12,
                'READY_FOR_CLOSURE': 13,
                'ALLOCATED': 14,
                'ASSIGNED': 7,
                'RE_ALLOCATED': 15
            };
            statusId = statusMap[status.toUpperCase()];
        }

        if (!statusId) {
            console.error(`[STATUS_UPDATE] Invalid status string: ${status}`);
            return res.status(400).json({ error: `Invalid status label: ${status}` });
        }

        console.log(`[STATUS_UPDATE] Resolved status "${status}" to ID: ${statusId}`);

        // 1. Update the Call status
        const updateData = { status_id: statusId, updated_at: new Date() };
        console.log(`[STATUS_UPDATE] Updating Calls table...`, updateData);

        try {
            const [updateCount] = await Calls.update(updateData, {
                where: {
                    call_id: parseInt(callId),
                    assigned_tech_id: parseInt(technicianId)
                }
            });
            console.log(`[STATUS_UPDATE] Calls updated: ${updateCount} row(s)`);
        } catch (updateErr) {
            console.error(`[STATUS_UPDATE] FAILED to update Calls table:`, updateErr.message);
            throw new Error(`Database update failed for Calls: ${updateErr.message}`);
        }

        // 2. Handle TAT Tracking Logic
        const isNumericInProgress = (statusId === 1); // 1 is Pending (In Progress equivalent)
        const isStringInProgress = (status === 'PENDING');

        if (isNumericInProgress || isStringInProgress) {
            console.log(`[STATUS_UPDATE] Processing TAT for IN_PROGRESS`);
            try {
                const [tat] = await TATTracking.findOrCreate({
                    where: { call_id: parseInt(callId) },
                    defaults: {
                        tat_start_time: new Date(),
                        tat_status: 'in_progress',
                        total_hold_minutes: 0,
                        created_at: new Date(),
                        updated_at: new Date()
                    }
                });

                const activeHold = await TATHolds.findOne({
                    where: { call_id: parseInt(callId), hold_end_time: null }
                });

                if (activeHold) {
                    console.log(`[STATUS_UPDATE] Closing active hold: ${activeHold.tat_holds_id}`);
                    activeHold.hold_end_time = new Date();
                    activeHold.updated_at = new Date();
                    await activeHold.save();

                    const results = await sequelize.query(`
                        SELECT SUM(DATEDIFF(MINUTE, hold_start_time, hold_end_time)) as total_mins
                        FROM tat_holds (NOLOCK)
                        WHERE call_id = :callId AND hold_end_time IS NOT NULL
                    `, {
                        replacements: { callId: parseInt(callId) },
                        type: QueryTypes.SELECT
                    });

                    tat.total_hold_minutes = results[0]?.total_mins || 0;
                    await tat.save();
                    console.log(`[STATUS_UPDATE] TAT hold minutes updated: ${tat.total_hold_minutes}`);
                }
            } catch (tatErr) {
                console.error(`[STATUS_UPDATE] TAT IN_PROGRESS logic failed:`, tatErr.message);
                // We keep going as status is already updated
            }
        } else if (statusId === 12) {
            console.log(`[STATUS_UPDATE] Processing TAT for ON_HOLD`);
            try {
                await TATHolds.create({
                    call_id: parseInt(callId),
                    hold_reason: holdReason || 'Waiting for Spare Parts',
                    hold_start_time: new Date(),
                    created_by: parseInt(technicianId),
                    created_at: new Date(),
                    updated_at: new Date()
                });
                console.log(`[STATUS_UPDATE] Hold record created`);
            } catch (holdErr) {
                console.error(`[STATUS_UPDATE] Failed to create hold record:`, holdErr.message);
            }
        } else if (status === 'COMPLETED' || statusId === 8) {
            console.log(`[STATUS_UPDATE] Processing TAT for CLOSED`);
            try {
                await TATTracking.update({
                    tat_end_time: new Date(),
                    tat_status: 'resolved',
                    updated_at: new Date()
                }, {
                    where: { call_id: parseInt(callId) }
                });
                console.log(`[STATUS_UPDATE] TAT marked as resolved`);
            } catch (compErr) {
                console.error(`[STATUS_UPDATE] Failed to resolve TAT:`, compErr.message);
            }
        }

        console.log(`[STATUS_UPDATE] Request SUCCESSFUL for call ${callId}`);
        res.json({
            success: true,
            message: `Status updated to ${status}`,
            data: { status, statusId }
        });
    } catch (err) {
        console.error('[STATUS_UPDATE] CRITICAL FAIL:', err);
        res.status(500).json({
            success: false,
            error: 'Server error during status update',
            details: err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
});

export default router;
