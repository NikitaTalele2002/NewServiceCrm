import express from 'express';
import { sequelize } from '../db.js';
import { Op } from 'sequelize';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET /api/service-center/current-inventory
router.get('/current-inventory', authenticateToken, async (req, res) => {
  try {
    const userRole = (req.user && (req.user.role || req.user.Role || '')).toString().toLowerCase();
    if (userRole === 'service_center' || userRole === 'sc' || userRole === 'asc') {
      // Service center: fetch inventory for this service center
      const centerId = req.user?.centerId || req.user?.id;
      if (!centerId) {
        return res.status(400).json({ ok: false, error: 'centerId missing in user token' });
      }
      // Query inventory for this service center
      const inventory = await sequelize.query(
        `SELECT si.spare_inventory_id, si.spare_id, si.location_type, si.location_id, si.qty_good, si.qty_defective, si.created_at, si.updated_at, sp.PART
         FROM spare_inventory si
         LEFT JOIN spare_parts sp ON sp.Id = si.spare_id
         WHERE si.location_type = 'service_center' AND si.location_id = ?
         ORDER BY si.spare_id ASC`,
        { replacements: [centerId], type: sequelize.QueryTypes.SELECT }
      );
      const mapped = Array.isArray(inventory) ? inventory.map(item => ({
        spare_inventory_id: item.spare_inventory_id,
        spare_id: item.spare_id,
        location_type: item.location_type,
        location_id: item.location_id,
        qty_good: item.qty_good,
        qty_defective: item.qty_defective,
        created_at: item.created_at,
        updated_at: item.updated_at,
        PART: item.PART,
        sku: item.spare_id,
        spareName: item.PART,
        goodQty: item.qty_good,
        defectiveQty: item.qty_defective
      })) : [];
      return res.json({ ok: true, inventory: mapped });
    } else {
      // fallback: return empty
      return res.json({ ok: true, inventory: [] });
    }
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
