import express from 'express';
const router = express.Router();
import { Technicians, ServiceCenter } from '../models/index.js';
import { sequelize } from '../db.js';

// Get all technicians
router.get('/', async (req, res) => {
  try {
    const technicians = await Technicians.findAll({
      include: { model: ServiceCenter, as: 'serviceCenter', attributes: ['asc_name'] },
    });
    res.json(technicians);
  } catch (err) {
    console.error('Get technicians error:', err);
    res.status(500).json({ error: 'Failed to fetch technicians', message: err.message });
  }
});

// Get technicians by service centre (handles query param ?centerId=X)
router.get('/by-centre', async (req, res) => {
  try {
    const centreId = req.query.centerId || req.query.centreId;
    if (!centreId || centreId === 'null' || centreId === 'undefined') {
      return res.status(400).json({ error: 'centerId query parameter required' });
    }
    // Convert to integer to ensure proper SQL type
    const centreIdNum = Number(centreId);
    if (isNaN(centreIdNum)) {
      return res.status(400).json({ error: 'centerId must be a valid number' });
    }
    console.log('🔍 Fetching technicians for centreId:', centreIdNum);
    
    // First, check how many technicians exist for this service center (regardless of status)
    console.log('📊 Debug: Checking total technicians for service center...');
    const allTechs = await sequelize.query(`
      SELECT COUNT(*) as total FROM technicians WHERE service_center_id = ?
    `, { replacements: [centreIdNum], type: sequelize.QueryTypes.SELECT });
    console.log('📊 Total technicians for center:', allTechs[0]?.total || 0);
    
    // Check active technicians count
    const activeTechs = await sequelize.query(`
      SELECT COUNT(*) as total FROM technicians WHERE service_center_id = ? AND status = 'active'
    `, { replacements: [centreIdNum], type: sequelize.QueryTypes.SELECT });
    console.log('📊 Active technicians for center:', activeTechs[0]?.total || 0);
    
    // Query using correct column names from actual database
    const technicians = await sequelize.query(`
      SELECT 
        technician_id,
        name,
        email,
        mobile_no,
        service_center_id,
        status,
        created_at
      FROM technicians
      WHERE service_center_id = ? AND status = 'active'
      ORDER BY name
    `, { replacements: [centreIdNum], type: sequelize.QueryTypes.SELECT });
    
    console.log('✅ Technicians found:', technicians.length);
    if (technicians.length > 0) {
      console.log('📋 Sample technician data:', technicians[0]);
    } else {
      console.log('⚠️ No active technicians found for service center', centreIdNum);
      // Log first few technicians (any status) for debugging
      const allTechSample = await sequelize.query(`
        SELECT TOP 5 technician_id, name, service_center_id, status FROM technicians WHERE service_center_id = ?
      `, { replacements: [centreIdNum], type: sequelize.QueryTypes.SELECT });
      console.log('📋 Sample technicians (any status):', allTechSample);
    }
    
    const response = { 
      success: true,
      technicians: technicians.map(t => ({
        technician_id: t.technician_id,
        id: t.technician_id, // Also include 'id' as alias for compatibility
        name: t.name,
        email: t.email,
        mobile_no: t.mobile_no,
        service_center_id: t.service_center_id,
        status: t.status,
        created_at: t.created_at
      }))
    };
    
    console.log('📤 Sending response:', JSON.stringify(response, null, 2));
    res.json(response);
  } catch (err) {
    console.error('❌ Get technicians by centre error:', err);
    console.error('Error details:', err.message);
    res.status(500).json({ error: 'Failed to fetch technicians', message: err.message });
  }
});

// Debug endpoint: Get ALL technicians for a service center (including inactive)
router.get('/debug/by-centre', async (req, res) => {
  try {
    const centreId = req.query.centerId || req.query.centreId;
    if (!centreId || centreId === 'null' || centreId === 'undefined') {
      return res.status(400).json({ error: 'centerId query parameter required' });
    }
    const centreIdNum = Number(centreId);
    if (isNaN(centreIdNum)) {
      return res.status(400).json({ error: 'centerId must be a valid number' });
    }
    
    console.log('🔍 [DEBUG] Fetching ALL technicians for centreId:', centreIdNum);
    
    // Get ALL technicians regardless of status
    const allTechnicians = await sequelize.query(`
      SELECT 
        technician_id,
        name,
        email,
        mobile_no,
        service_center_id,
        status,
        created_at
      FROM technicians
      WHERE service_center_id = ?
      ORDER BY name
    `, { replacements: [centreIdNum], type: sequelize.QueryTypes.SELECT });
    
    console.log('✅ [DEBUG] All technicians found:', allTechnicians.length);
    
    const response = {
      success: true,
      debug: true,
      serviceCenterId: centreIdNum,
      totalCount: allTechnicians.length,
      byStatus: {
        active: allTechnicians.filter(t => t.status === 'active').length,
        inactive: allTechnicians.filter(t => t.status === 'inactive').length,
        on_leave: allTechnicians.filter(t => t.status === 'on_leave').length,
        suspended: allTechnicians.filter(t => t.status === 'suspended').length
      },
      technicians: allTechnicians.map(t => ({
        technician_id: t.technician_id,
        id: t.technician_id,
        name: t.name,
        email: t.email,
        mobile_no: t.mobile_no,
        service_center_id: t.service_center_id,
        status: t.status,
        created_at: t.created_at
      }))
    };
    
    console.log('📤 [DEBUG] Sending response:', JSON.stringify(response, null, 2));
    res.json(response);
  } catch (err) {
    console.error('❌ debug endpoint error:', err);
    res.status(500).json({ error: 'Failed to fetch technicians', message: err.message });
  }
});
      
// Get technician by ID
router.get('/:id', async (req, res) => {
  try {
    const technician = await Technicians.findByPk(req.params.id, {
      include: { model: ServiceCenter, as: 'serviceCenter', attributes: ['asc_name'] },
    });
    if (!technician) {
      return res.status(404).json({ error: 'Technician not found' });
    }
    res.json(technician);
  } catch (err) {
    console.error('Get technician error:', err);
    res.status(500).json({ error: 'Failed to fetch technician', message: err.message });
  }
});

// Get technician inventory
router.get('/:technicianId/inventory', async (req, res) => {
  try {
    const { technicianId } = req.params;

    if (!technicianId || technicianId === 'undefined') {
      return res.status(400).json({ error: 'Technician ID is required' });
    }

    console.log('📦 Fetching inventory for technician:', technicianId);

    // Query technician inventory from database
    const inventory = await sequelize.query(`
      SELECT 
        ti.id,
        ti.technician_id,
        ti.spare_id,
        ti.good_qty as goodQty,
        ti.defective_qty as defectiveQty,
        ti.updated_at as lastUpdated,
        COALESCE(sp.PART, 'Unknown') as sku,
        COALESCE(sp.DESCRIPTION, 'Unknown') as spareName
      FROM technician_inventory ti
      LEFT JOIN spare_parts sp ON ti.spare_id = sp.Id
      WHERE ti.technician_id = ?
      ORDER BY ti.updated_at DESC
    `, { replacements: [technicianId], type: sequelize.QueryTypes.SELECT });

    console.log('✅ Found', inventory.length, 'inventory items');

    res.json({
      success: true,
      data: inventory.map(item => ({
        id: item.id,
        technicanId: item.technician_id,
        spareId: item.spare_id,
        sku: item.sku,
        spareName: item.spareName,
        goodQty: item.goodQty || 0,
        defectiveQty: item.defectiveQty || 0,
        totalQty: (item.goodQty || 0) + (item.defectiveQty || 0),
        lastUpdated: item.lastUpdated
      }))
    });
  } catch (err) {
    console.error('❌ Error fetching technician inventory:', err);
    res.status(500).json({ error: 'Failed to fetch technician inventory', details: err.message });
  }
});

export default router;


