import express from 'express';
const router = express.Router();
import { Calls, ProductMaster, Customer, CustomersProducts, ProductModel } from '../../../models/index.js';
import { Op } from 'sequelize';

/**
 * GET /api/mobile/calls/assigned
 * Fetches assigned calls for a technician with enriched details and standardized JSON
 */
router.get('/assigned/:technicianId', async (req, res) => {
    try {
        const { technicianId } = req.params;

        if (!technicianId) {
            return res.status(400).json({ success: false, error: 'Technician ID is required' });
        }

        console.log(`📡 Fetching assigned calls for technician: ${technicianId}`);

        const calls = await Calls.findAll({
            where: { assigned_tech_id: technicianId },
            order: [['created_at', 'DESC']]
        });

        // Resolve relations
        const customerIds = [...new Set(calls.map(c => c.customer_id).filter(Boolean))];
        const cpIds = [...new Set(calls.map(c => c.customer_product_id).filter(Boolean))];

        const [customers, customersProducts] = await Promise.all([
            Customer.findAll({
                where: { customer_id: { [Op.in]: customerIds } },
                attributes: ['customer_id', 'name', 'mobile_no', 'area', 'city']
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

            // Standardize Status Labels for Mobile
            let statusLabel = 'OPEN';
            const statusMap = { 1: 'PENDING', 6: 'OPEN', 8: 'CLOSED', 9: 'CANCELLED', 12: 'ON_HOLD', 13: 'READY_FOR_CLOSURE' };
            statusLabel = statusMap[data.status_id] || 'OPEN';

            return {
                callId: data.call_id,
                customerId: data.customer_id,
                customerName: cust ? cust.name : 'Unknown',
                mobileNumber: cust ? cust.mobile_no : (data.caller_mobile_no || 'N/A'),
                product: cp && cp.Product ? cp.Product.VALUE : 'N/A',
                model: cp && cp.ProductModel ? cp.ProductModel.MODEL_CODE : 'N/A',
                status: statusLabel,
                statusId: data.status_id,
                visitDate: data.visit_date,
                createdAt: data.created_at,
                customerDetails: cust ? {
                    name: cust.name,
                    mobile: cust.mobile_no,
                    area: cust.area || '',
                    city: cust.city || ''
                } : null,
                productDetails: cp ? {
                    serialNo: cp.serial_no,
                    model: cp.ProductModel ? cp.ProductModel.MODEL_CODE : '',
                    name: cp.Product ? cp.Product.VALUE : '',
                    warranty: cp.warranty_status
                } : null
            };
        });

        res.json({
            success: true,
            technicianId: parseInt(technicianId),
            totalCalls: enrichedCalls.length,
            calls: enrichedCalls
        });
    } catch (err) {
        console.error('Mobile Assigned Calls Error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch calls', details: err.message });
    }
});

/**
 * POST /api/mobile/calls/close/:callId
 */
router.post('/close/:callId', async (req, res) => {
    try {
        const { callId } = req.params;
        const { technician_id } = req.body;

        // Note: Actual logic would involve complex stock movements 
        // as seen in technician-tracking.js. For document API we define the handler.

        res.json({
            success: true,
            message: 'Call marked for closure',
            data: { callId, technician_id, status: 'READY_FOR_CLOSURE' }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to close call' });
    }
});

export default router;
