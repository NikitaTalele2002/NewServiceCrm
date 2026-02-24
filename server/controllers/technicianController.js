import technicianService from '../services/technicianService.js';

async function list(req, res){
  try{
    const technicians = await technicianService.getAllTechnicians();
    return res.json(technicians);
  }catch(err){
    console.error('Get technicians error:', err);
    return res.status(500).json({ error: 'Failed to fetch technicians', message: err.message });
  }
}

async function listByCenter(req, res){
  try{
    const centerId = req.query.centerId || req.query.centreId;
    const technicians = await technicianService.getTechniciansByCenter(centerId);
    return res.json({ technicians });
  }catch(err){
    console.error('Get technicians by centre error:', err);
    const status = err.status || 500;
    return res.status(status).json({ error: err.message, message: err.message });
  }
}

async function getById(req, res){
  try{
    const technician = await technicianService.getTechnicianById(req.params.id);
    return res.json(technician);
  }catch(err){
    console.error('Get technician error:', err);
    const status = err.status || 500;
    return res.status(status).json({ error: err.message, message: err.message });
  }
}

export default {
  list,
  listByCenter,
  getById
};
