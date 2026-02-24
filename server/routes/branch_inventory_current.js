
import express from 'express';
import { sequelize } from '../db.js';
import { Op } from 'sequelize';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// GET /api/branch/assigned-plants - For RSM: get list of assigned plants/branches
router.get('/assigned-plants', authenticateToken, async (req, res) => {
  try {
    const userRole = (req.user && (req.user.role || req.user.Role || '')).toString().toLowerCase();
    if (userRole !== 'rsm') {
      return res.status(403).json({ ok: false, error: 'Only RSMs can access assigned plants' });
    }
    const rsmUserId = req.user.id;
    
    // DEBUG: Log what's in req.user
    console.log('[DEBUG] req.user:', JSON.stringify(req.user, null, 2));
    console.log('[DEBUG] rsmUserId from req.user.id:', rsmUserId);

    // Try to get RSM ID from token first, otherwise query database
    let rsmId = req.user.rsmId;
    if (!rsmId) {
      const rsmRecord = await sequelize.query(
        `SELECT rsm_id FROM rsms WHERE user_id = ? LIMIT 1`,
        { replacements: [rsmUserId], type: sequelize.QueryTypes.SELECT }
      );
      rsmId = rsmRecord[0]?.rsm_id;
      console.log('[DEBUG] Looked up RSM ID from database:', rsmId);
    } else {
      console.log('[DEBUG] RSM ID from token:', rsmId);
    }

    if (!rsmId) {
      console.log('[DEBUG] RSM ID not found for user:', rsmUserId);
      return res.json({ ok: true, plants: [] });
    }
    
    // 1. Get all state_ids assigned to this RSM
    const stateRows = await sequelize.query(
      `SELECT DISTINCT state_id FROM rsm_state_mapping WHERE rsm_user_id = ? AND is_active = 1`,
      { replacements: [rsmId], type: sequelize.QueryTypes.SELECT }
    );
    const stateIds = stateRows.map(r => Number(r.state_id));
    console.log('[DEBUG] RSM assigned stateIds:', stateIds);
    if (!stateIds.length) return res.json({ ok: true, plants: [] });

    // 2. Get all plants (branches) in those states
    // Use correct column name for plant name (likely 'name' or 'plant', not 'plant_name')
    // Try 'name' as the column for plant name
    // MSSQL does not support IN (:array) with named replacements; use ? and join
    const placeholders = stateIds.map(() => '?').join(',');
    const plantQuery = `SELECT DISTINCT p.plant_id, p.plant_code AS plant_name, p.state_id
         FROM plants p
         WHERE p.state_id IN (${placeholders})`;
    console.log('[DEBUG] plantQuery:', plantQuery);
    console.log('[DEBUG] plantQuery replacements:', stateIds);
    const plantRows = await sequelize.query(
      plantQuery,
      { replacements: stateIds, type: sequelize.QueryTypes.SELECT }
    );
    console.log('[DEBUG] plantRows result:', plantRows);
    if (!plantRows.length) return res.json({ ok: true, plants: [] });

    // 3. For each plant, get all service centers with that plant_id
    const plants = await Promise.all(plantRows.map(async (plant) => {
      const serviceCenters = await sequelize.query(
        `SELECT asc_id AS service_center_id, asc_name AS service_center_name
           FROM service_centers
           WHERE plant_id = ?`,
        { replacements: [plant.plant_id], type: sequelize.QueryTypes.SELECT }
      );
      return {
        plant_id: plant.plant_id,
        plant_name: plant.plant_name,
        state_id: plant.state_id,
        service_centers: serviceCenters
      };
    }));
    res.json({ ok: true, plants });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/branch/current-inventory
router.get('/current-inventory', authenticateToken, async (req, res) => {
  try {
    const userRole = (req.user && (req.user.role || req.user.Role || '')).toString().toLowerCase();
    const SpareInventory = sequelize.models.SpareInventory;
    const SparePart = sequelize.models.SparePart;

    console.log('[DEBUG] /current-inventory - User Role:', userRole, 'User:', JSON.stringify(req.user));

    // ========== RSM USER ==========
    if (userRole === 'rsm') {
      let rsmUserId = req.user.id;
      
      console.log('[DEBUG] RSM User ID (user_id):', rsmUserId);
      console.log('[DEBUG] RSM ID from token:', req.user.rsmId);

      // Try to get RSM ID from token first, otherwise query database
      let rsmId = req.user.rsmId;
      if (!rsmId) {
        // Query rsms table to get rsm_id for this user_id
        const rsmRecord = await sequelize.query(
          `SELECT TOP 1 rsm_id FROM rsms WHERE user_id = ?`,
          { replacements: [rsmUserId], type: sequelize.QueryTypes.SELECT }
        );
        rsmId = rsmRecord[0]?.rsm_id;
        console.log('[DEBUG] Looked up RSM ID from database:', rsmId);
      }

      if (!rsmId) {
        console.log('[DEBUG] RSM ID not found for user:', rsmUserId);
        return res.json({ ok: true, inventory: [] });
      }

      // Get all state_ids assigned to this RSM via rsm_state_mapping
      const stateRows = await sequelize.query(
        `SELECT DISTINCT state_id FROM rsm_state_mapping WHERE rsm_user_id = ? AND is_active = 1`,
        { replacements: [rsmId], type: sequelize.QueryTypes.SELECT }
      );
      const assignedStateIds = stateRows.map(r => Number(r.state_id)).filter(Boolean);
      console.log('[DEBUG] RSM assigned states:', assignedStateIds);

      if (!assignedStateIds.length) {
        return res.json({ ok: true, inventory: [] });
      }

      // Get actual plant_ids that belong to these states
      const placeholders = assignedStateIds.map(() => '?').join(',');
      const plantRows = await sequelize.query(
        `SELECT DISTINCT plant_id FROM plants WHERE state_id IN (${placeholders})`,
        { replacements: assignedStateIds, type: sequelize.QueryTypes.SELECT }
      );
      const assignedPlantIds = plantRows.map(r => Number(r.plant_id)).filter(Boolean);
      console.log('[DEBUG] RSM assigned plant_ids:', assignedPlantIds);

      if (!assignedPlantIds.length) {
        return res.json({ ok: true, inventory: [] });
      }

      // Check if specific plant_id requested
      let selectedPlantId = req.query.plant_id || (req.body && req.body.plant_id);
      if (selectedPlantId) {
        selectedPlantId = parseInt(selectedPlantId);
        if (!assignedPlantIds.includes(selectedPlantId)) {
          return res.status(403).json({ ok: false, error: 'Not authorized for this plant' });
        }
      }

      // Get user selection: location_type and location_id
      let selectedLocationType = req.query.location_type || req.body?.location_type || 'branch';
      let selectedLocationId = req.query.location_id || req.body?.location_id;
      
      console.log('[DEBUG] User selected - location_type:', selectedLocationType, 'location_id:', selectedLocationId);

      // If location_id not provided, use the selected plant_id
      if (!selectedLocationId) {
        selectedLocationId = selectedPlantId || assignedPlantIds[0];
        // If location_type is 'warehouse', apply 1000+ offset
        if (selectedLocationType === 'warehouse') {
          selectedLocationId = 1000 + selectedLocationId;
        }
      }

      console.log('[DEBUG] Final filter - location_type:', selectedLocationType, 'location_id:', selectedLocationId);

      const inventory = await sequelize.query(
        `SELECT si.spare_inventory_id, si.spare_id, si.location_type, si.location_id, 
                si.qty_good, si.qty_defective, si.created_at, si.updated_at, sp.PART
         FROM spare_inventory si
         LEFT JOIN spare_parts sp ON sp.Id = si.spare_id
         WHERE si.location_type = ? AND si.location_id = ?
         ORDER BY si.spare_id ASC`,
        { replacements: [selectedLocationType, selectedLocationId], type: sequelize.QueryTypes.SELECT }
      );

      const mapped = (Array.isArray(inventory) ? inventory : []).map(item => ({
        spare_inventory_id: item.spare_inventory_id,
        spare_id: item.spare_id,
        location_type: item.location_type,
        location_id: item.location_id,
        qty_good: item.qty_good,
        qty_defective: item.qty_defective,
        created_at: item.created_at,
        updated_at: item.updated_at,
        sku: item.spare_id,
        spareName: item.PART,
        goodQty: item.qty_good,
        defectiveQty: item.qty_defective
      }));

      console.log('[DEBUG] RSM inventory count:', mapped.length);
      return res.json({ ok: true, inventory: mapped });
    }

    // ========== SERVICE CENTER / BRANCH USER ==========
    else if (userRole === 'service_center' || userRole === 'sc' || userRole === 'asc') {
      const branchId = req.user?.branchId || req.user?.centerId;
      console.log('[DEBUG] Service Center User - BranchId:', branchId);

      if (!branchId) {
        console.log('[DEBUG] Error: branchId missing in user token');
        return res.status(400).json({ ok: false, error: 'branchId missing in user token' });
      }

      // Query inventory for this service center
      const inventory = await sequelize.query(
        `SELECT si.spare_inventory_id, si.spare_id, si.location_type, si.location_id, 
                si.qty_good, si.qty_defective, si.created_at, si.updated_at, sp.PART
         FROM spare_inventory si
         LEFT JOIN spare_parts sp ON sp.Id = si.spare_id
         WHERE si.location_type = 'service_center' AND si.location_id = ?
         ORDER BY si.spare_id ASC`,
        { replacements: [branchId], type: sequelize.QueryTypes.SELECT }
      );

      const mapped = (Array.isArray(inventory) ? inventory : []).map(item => ({
        spare_inventory_id: item.spare_inventory_id,
        spare_id: item.spare_id,
        location_type: item.location_type,
        location_id: item.location_id,
        qty_good: item.qty_good,
        qty_defective: item.qty_defective,
        created_at: item.created_at,
        updated_at: item.updated_at,
        sku: item.spare_id,
        spareName: item.PART,
        goodQty: item.qty_good,
        defectiveQty: item.qty_defective
      }));

      console.log('[DEBUG] Service Center inventory count:', mapped.length);
      return res.json({ ok: true, inventory: mapped });
    }

    // ========== BRANCH USER ==========
    else if (userRole === 'branch') {
      const branchId = req.user?.branchId || req.user?.centerId;
      console.log('[DEBUG] Branch User - BranchId:', branchId);

      if (!branchId) {
        console.log('[DEBUG] Error: branchId missing in user token');
        return res.status(400).json({ ok: false, error: 'branchId missing in user token' });
      }

      // Query inventory for this branch
      const inventory = await sequelize.query(
        `SELECT si.spare_inventory_id, si.spare_id, si.location_type, si.location_id, 
                si.qty_good, si.qty_defective, si.created_at, si.updated_at, sp.PART
         FROM spare_inventory si
         LEFT JOIN spare_parts sp ON sp.Id = si.spare_id
         WHERE si.location_type = 'branch' AND si.location_id = ?
         ORDER BY si.spare_id ASC`,
        { replacements: [branchId], type: sequelize.QueryTypes.SELECT }
      );

      const mapped = (Array.isArray(inventory) ? inventory : []).map(item => ({
        spare_inventory_id: item.spare_inventory_id,
        spare_id: item.spare_id,
        location_type: item.location_type,
        location_id: item.location_id,
        qty_good: item.qty_good,
        qty_defective: item.qty_defective,
        created_at: item.created_at,
        updated_at: item.updated_at,
        sku: item.spare_id,
        spareName: item.PART,
        goodQty: item.qty_good,
        defectiveQty: item.qty_defective
      }));

      console.log('[DEBUG] Branch inventory count:', mapped.length);
      return res.json({ ok: true, inventory: mapped });
    }

    // ========== UNKNOWN ROLE ==========
    else {
      console.log('[DEBUG] Unknown role:', userRole);
      return res.status(403).json({ ok: false, error: 'Unknown user role' });
    }

  } catch (err) {
    console.error('[ERROR] /current-inventory:', err.message);
    console.error('[ERROR] Stack:', err.stack);
    res.status(500).json({ error: err.message });
  }
});

export default router;
