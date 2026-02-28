import express from 'express';
const router = express.Router();
import { sequelize } from '../../../db.js';

// GET /api/technician-mobile/spare-parts
router.get('/', async (req, res) => {
    const start = Date.now();
    try {
        const { search } = req.query;
        const trimmedSearch = search ? String(search).trim() : '';

        console.log(`>>> [SPARE_PARTS] Fetching...`);

        // Use raw SQL with NOLOCK to bypass any locks and ensure maximum speed
        let sql = `
            SELECT Id, PART, DESCRIPTION
            FROM spare_parts (NOLOCK)
            WHERE STATUS = 'Active'
        `;
        const replacements = [];

        if (trimmedSearch) {
            sql += ` AND (DESCRIPTION LIKE ? OR PART LIKE ?)`;
            replacements.push(`%${trimmedSearch}%`, `%${trimmedSearch}%`);
        }

        const spareParts = await sequelize.query(sql, {
            replacements,
            type: sequelize.QueryTypes.SELECT
        });

        const formattedParts = (spareParts || []).map(part => ({
            Id: part.Id || part.id,
            PART: part.PART,
            DESCRIPTION: part.DESCRIPTION || part.PART
        }));

        res.json({
            success: true,
            data: formattedParts
        });
    } catch (err) {
        console.error('>>> [SPARE_PARTS] Error:', err.message);
        res.status(500).json({ success: false, error: 'Failed to fetch spare parts', details: err.message });
    }
});

// GET /api/technician-mobile/spare-parts/:id
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`>>> [SPARE_PARTS] Fetching detail for ID: ${id}`);

        const sparePart = await sequelize.query(`
            SELECT *
            FROM spare_parts (NOLOCK)
            WHERE Id = ?
        `, {
            replacements: [id],
            type: sequelize.QueryTypes.SELECT
        });

        if (!sparePart || sparePart.length === 0) {
            return res.status(404).json({ success: false, error: 'Spare part not found' });
        }

        res.json({
            success: true,
            data: sparePart[0]
        });
    } catch (err) {
        console.error('>>> [SPARE_PARTS] Detail Error:', err.message);
        res.status(500).json({ success: false, error: 'Failed to fetch spare part details', details: err.message });
    }
});

export default router;
