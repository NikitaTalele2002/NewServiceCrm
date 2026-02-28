import express from 'express';
const router = express.Router();
import { sequelize } from '../../../db.js';
import { QueryTypes } from 'sequelize';

/**
 * Inventory Router
 */
router.get('/current/:id', async (req, res) => {
    try {
        const inventory = await sequelize.query(`
            SELECT si.*, sp.PART as SpareName
            FROM spare_inventory si
            LEFT JOIN spare_parts sp ON sp.Id = si.spare_id
            WHERE si.location_type = 'technician' AND si.location_id = ?
        `, { replacements: [req.params.id], type: QueryTypes.SELECT });
        res.json({ success: true, data: inventory });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
