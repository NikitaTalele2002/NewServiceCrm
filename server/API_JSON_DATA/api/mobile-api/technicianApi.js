import express from 'express';
const router = express.Router();
import { Technicians } from '../../../models/index.js';

/**
 * Technician Profile Router
 */
router.get('/:id', async (req, res) => {
    try {
        const technician = await Technicians.findByPk(req.params.id);
        if (!technician) return res.status(404).json({ error: 'Not found' });
        res.json({ success: true, data: technician });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

export default router;
