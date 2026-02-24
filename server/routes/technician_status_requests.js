import express from "express";
const router = express.Router();
import { sequelize, Technicians, ServiceCenter, Users } from '../models/index.js';
import { authenticateToken } from '../middleware/auth.js';

// POST /api/technician-status-requests - Service center creates a request to activate/deactivate/add technician
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { technicianId, requestType, notes, technicianName, technicianMobile, technicianEmail } = req.body; // requestType: 'activate', 'deactivate', 'add'
    
    console.log('=== POST /technician-status-requests ===');
    console.log('User:', req.user);
    console.log('Request body:', { requestType, technicianId });

    if (requestType === 'add') {
      // For add, no technicianId needed
      const request = await TechnicianStatusRequest.create({
        RequestedBy: req.user.id,
        RequestType: requestType,
        TechnicianName: technicianName,
        TechnicianMobile: technicianMobile,
        TechnicianEmail: technicianEmail,
        Notes: notes
      });
      console.log('Add request created:', {
        id: request.Id,
        requestedBy: request.RequestedBy,
        status: request.Status,
        requestType: request.RequestType
      });
      res.status(201).json({ success: true, message: 'Add technician request submitted successfully', request });
    } else {
      // For activate/deactivate, need technicianId
      if (!technicianId) {
        return res.status(400).json({ error: 'Technician ID required' });
      }

      // Check if technician belongs to user's service center
      const technician = await Technicians.findByPk(technicianId);
      if (!technician || technician.ServiceCenterId !== req.user.centerId) {
        return res.status(403).json({ error: 'Technician not found or not authorized' });
      }

      // Create request
      const request = await TechnicianStatusRequest.create({
        TechnicianId: technicianId,
        RequestedBy: req.user.id,
        RequestType: requestType,
        Notes: notes
      });
      res.status(201).json({ success: true, message: 'Request submitted successfully', request });
    }
  } catch (error) {
    console.error('Error creating technician status request:', error);
    res.status(500).json({ error: 'Failed to create request' });
  }
});

// GET /api/technician-status-requests - Branch gets pending requests
router.get('/', authenticateToken, async (req, res) => {
  try {
    console.log('=== GET /technician-status-requests ===');
    console.log('User:', { id: req.user.id, branchId: req.user.branchId });
    
    if (!req.user.branchId) {
      console.log('No branchId');
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Step 1: Get service centers for this branch
    const serviceCenters = await ServiceCenter.findAll({
      where: { BranchId: req.user.branchId },
      raw: true
    });
    console.log('Service centers found:', serviceCenters.length);
    
    const scIds = serviceCenters.map(sc => sc.Id);
    console.log('SC IDs:', scIds);

    if (scIds.length === 0) {
      return res.json([]);
    }

    // Step 2: Get users in these service centers
    const users = await Users.findAll({
      where: { CenterId: { [sequelize.Sequelize.Op.in]: scIds } },
      raw: true
    });
    console.log('Users found:', users.length, 'IDs:', users.map(u => u.UserID));
    
    const userIds = users.map(u => u.UserID);

    // Step 3: Build the OR conditions for requests
    const orConditions = [];
    
    // Condition 1: Add requests (TechnicianId IS NULL) from users in our service centers
    if (userIds.length > 0) {
      orConditions.push({
        [sequelize.Sequelize.Op.and]: [
          { TechnicianId: null },
          { RequestedBy: { [sequelize.Sequelize.Op.in]: userIds } }
        ]
      });
      console.log('Added condition 1: Add requests from user IDs:', userIds);
    }

    if (orConditions.length === 0) {
      console.log('No conditions');
      return res.json([]);
    }

    // Step 4: Fetch matching requests (raw data)
    console.log('Fetching requests with conditions...');
    const requests = await TechnicianStatusRequest.findAll({
      where: {
        Status: 'pending',
        [sequelize.Sequelize.Op.or]: orConditions
      },
      raw: true,
      order: [['RequestedAt', 'DESC']]
    });

    console.log('Requests found:', requests.length);

    // Step 5: Enrich each request with User and ServiceCentre data
    const enrichedRequests = await Promise.all(requests.map(async (request) => {
      const enriched = { ...request };
      
      try {
        // Fetch the requesting user
        const requester = await Users.findByPk(request.RequestedBy, { raw: true });
        enriched.Requester = requester;
        
        // Fetch the service centre for this user
        if (requester && requester.CenterId) {
          const serviceCentre = await ServiceCenter.findByPk(requester.CenterId, { raw: true });
          enriched.ServiceCenter = serviceCentre;
        }
        
        // Fetch technician if exists (for status change requests)
        if (request.TechnicianId) {
          const technician = await Technicians.findByPk(request.TechnicianId, { raw: true });
          enriched.Technician = technician;
        }
      } catch (err) {
        console.error('Error enriching request:', err.message);
      }
      
      return enriched;
    }));

    console.log('Enriched requests:', enrichedRequests.length);
    requests.forEach(r => {
      console.log(`  - Request ${r.Id}: requestedBy=${r.RequestedBy}, type=${r.RequestType}`);
    });
    
    res.json(enrichedRequests);
    
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/technician-status-requests/:id/approve - Branch approves request
router.post('/:id/approve', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;


    const request = await TechnicianStatusRequest.findByPk(id, {
      include: [
        { model: User, as: 'Requester', include: [{ model: ServiceCentre, as: 'ServiceCentre' }] }
      ]
    });
    if (!request || request.Status !== 'pending') {
      return res.status(404).json({ error: 'Request not found or not pending' });
    }

    // Check authorization
    if (request.RequestType === 'add') {
      console.log('Approving add request:', request.Id, request.RequestType);
      // Fetch the requester user with service centre
      const requester = await Users.findByPk(request.RequestedBy, {
        include: [{ model: ServiceCenter, as: 'ServiceCenter' }]
      });
      console.log('Requester:', requester?.Id, requester?.ServiceCenter?.Id);
      if (!requester?.ServiceCenter || requester.ServiceCenter.BranchId !== req.user.branchId) {
        console.log('Not authorized:', requester?.ServiceCenter?.BranchId, req.user.branchId);
        return res.status(403).json({ error: 'Not authorized' });
      }
      // Create new technician
      const newTechnician = await Technicians.create({
        ServiceCenterId: requester.ServiceCenter.Id,
        Name: request.TechnicianName,
        Mobile: request.TechnicianMobile,
        Email: request.TechnicianEmail,
        Status: 1
      });
      console.log('New technician created:', newTechnician.Id);
      request.TechnicianId = newTechnician.Id;
    } else {
      // Check authorization for status change
      const technician = await Technicians.findByPk(request.TechnicianId, {
        include: [{ model: ServiceCenter, as: 'ServiceCenter' }]
      });
      if (!technician || technician.ServiceCenter.BranchId !== req.user.branchId) {
        return res.status(403).json({ error: 'Not authorized' });
      }
      // Update technician status
      technician.Status = request.RequestType === 'activate' ? 1 : 0;
      await technician.save();
    }

    // Update request status
    request.Status = 'approved';
    request.ApprovedAt = new Date();
    request.ApprovedBy = req.user.id;
    request.Notes = (request.Notes || '') + '\nApproved: ' + (notes || '');
    await request.save();

    res.json({ success: true, message: 'Request approved' });
  } catch (error) {
    console.error('Error approving request:', error);
    res.status(500).json({ error: 'Failed to approve request' });
  }
});

// POST /api/technician-status-requests/:id/reject - Branch rejects request
router.post('/:id/reject', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const request = await TechnicianStatusRequest.findByPk(id, {
      include: [
        { model: Users, as: 'Requester', include: [{ model: ServiceCenter, as: 'ServiceCenter' }] }
      ]
    });
    if (!request || request.Status !== 'pending') {
      return res.status(404).json({ error: 'Request not found or not pending' });
    }

    // Check authorization
    if (request.RequestType === 'add') {
      // For add, check if requester's service center is under this branch
      if (!request.Requester?.ServiceCenter || request.Requester.ServiceCenter.BranchId !== req.user.branchId) {
        return res.status(403).json({ error: 'Not authorized' });
      }
    } else {
      // For status change, check technician's service center
      const technician = await Technicians.findByPk(request.TechnicianId, {
        include: [{ model: ServiceCenter, as: 'ServiceCenter' }]
      });
      if (!technician || technician.ServiceCentre.BranchId !== req.user.branchId) {
        return res.status(403).json({ error: 'Not authorized' });
      }
    }

    // Update request
    request.Status = 'rejected';
    request.ApprovedAt = new Date();
    request.ApprovedBy = req.user.id;
    request.Notes = (request.Notes || '') + '\nRejected: ' + (notes || '');
    await request.save();

    res.json({ success: true, message: 'Request rejected' });
  } catch (error) {
    console.error('Error rejecting request:', error);
    res.status(500).json({ error: 'Failed to reject request' });
  }
});


// GET /api/technician-status-requests/technicians - Service center gets their technicians
router.get('/technicians', authenticateToken, async (req, res) => {
  try {
    if (!req.user.centerId) {
      return res.status(403).json({ error: 'Not a service center user' });
    }

    // Fetch approved technicians for this service center
    const technicians = await Technicians.findAll({
      where: {
        service_center_id: req.user.centerId,
        status: 'active'
      },
      include: [{ model: ServiceCenter, as: 'serviceCenter', attributes: ['asc_name'] }]
    });

    res.json(technicians);
  } catch (error) {
    console.error('Error fetching technicians:', error);
    res.status(500).json({ error: 'Failed to fetch technicians', message: error.message });
  }
});

export default router;

