import express from 'express';
import { sequelize } from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET current user's inventory
router.get('/current', authenticateToken, async (req, res) => {
  try {
    const userRole = (req.user && (req.user.role || req.user.Role || '')).toString().toLowerCase();

    // Determine target location(s)
    let locationType = null;
    let locationIds = [];

    if (userRole === 'rsm') {
      const rsmUserId = req.user.id;
      const plantRows = await sequelize.query(
        `SELECT DISTINCT p.plant_id AS plant_id FROM plants p
         JOIN rsm_state_mapping sm ON sm.state_id = p.state_id AND sm.is_active = 1
         WHERE sm.rsm_user_id = ?`,
        { replacements: [rsmUserId], type: sequelize.QueryTypes.SELECT }
      );
      locationType = 'plant';
      locationIds = plantRows.map(r => r.plant_id).filter(Boolean);
      if (locationIds.length === 0) return res.json([]);
    } else if (userRole === 'service_center' || userRole === 'sc' || userRole === 'asc') {
      locationType = 'service_center';
      const scId = req.user?.centerId || req.user?.id;
      if (!scId) return res.status(400).json({ error: 'centerId missing in token' });
      locationIds = [scId];
    } else if (userRole === 'plant') {
      locationType = 'plant';
      const plantId = req.user?.plantId || req.user?.centerId || req.user?.id;
      if (!plantId) return res.status(400).json({ error: 'plantId missing in token' });
      locationIds = [plantId];
    } else if (userRole === 'technician' || userRole === 'tech') {
      locationType = 'technician';
      const techId = req.user?.id || req.user?.technicianId;
      if (!techId) return res.status(400).json({ error: 'technician id missing in token' });
      locationIds = [techId];
    } else {
      // Fallback: try centerId or plantId
      const scId = req.user?.centerId || req.user?.id;
      const plantId = req.user?.plantId || req.user?.centerId || req.user?.id;
      if (scId) {
        locationType = 'service_center';
        locationIds = [scId];
      } else if (plantId) {
        locationType = 'plant';
        locationIds = [plantId];
      } else {
        return res.status(400).json({ error: 'No location identifiers found in token' });
      }
    }

    // Build query depending on number of location ids to avoid invalid IN ()
    let sql = `
            SELECT si.spare_inventory_id AS Id,
              si.spare_id AS spare_id,
              ISNULL(sp.PART, '') AS SpareName,
              CONVERT(varchar(50), sp.Id) AS Sku,
              si.qty_good AS GoodQty,
              si.qty_defective AS DefectiveQty,
              ISNULL(sp.ModelID, 0) AS ModelID,
              sp.MODEL_DESCRIPTION,
              sp.BRAND
            FROM spare_inventory si
            LEFT JOIN spare_parts sp ON sp.Id = si.spare_id
            WHERE si.location_type = ? AND si.location_id = ?
          `;
            // For service center, always use single locationId
            replacements.push(locationIds[0]);

    const replacements = [locationType];
    if (locationIds.length === 1) {
      sql += ' AND si.location_id = ? ';
      replacements.push(locationIds[0]);
    } else {
      const placeholders = locationIds.map(() => '?').join(',');
      sql += ` AND si.location_id IN (${placeholders}) `;
      replacements.push(...locationIds);
    }

    // Optional filter by ModelID when user selects a model
    const { modelId } = req.query || {};
    if (modelId) {
      sql += ' AND sp.ModelID = ? ';
      replacements.push(parseInt(modelId, 10));
    }

    sql += ' ORDER BY SpareName ';

    const rows = await sequelize.query(sql, { replacements, type: sequelize.QueryTypes.SELECT });

    return res.json(Array.isArray(rows) ? rows : []);
  } catch (err) {
    console.error('GET /api/inventory/current error', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
