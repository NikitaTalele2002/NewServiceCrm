import express from 'express';
const router = express.Router();
import { sequelize } from '../../../db.js';
import { QueryTypes } from 'sequelize';

/**
 * GET /api/mobile/inventory/current
 */
router.get('/current/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const inventory = await sequelize.query(`
            SELECT si.spare_inventory_id AS Id,
              si.spare_id AS spare_id,
              ISNULL(sp.PART, '') AS SpareName,
              CONVERT(varchar(50), sp.Id) AS Sku,
              si.qty_good AS GoodQty,
              si.qty_defective AS DefectiveQty,
              sp.BRAND
            FROM spare_inventory si
            LEFT JOIN spare_parts sp ON sp.Id = si.spare_id
            WHERE si.location_type = 'technician' AND si.location_id = ?
            ORDER BY SpareName
        `, { replacements: [id], type: QueryTypes.SELECT });

        res.json({
            success: true,
            count: inventory.length,
            data: inventory
        });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to fetch inventory' });
    }
});

export default router;
