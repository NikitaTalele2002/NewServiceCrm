import servicecenterService from '../services/servicecenterService.js';

async function addCenter(req, res){
  try{
    const result = await servicecenterService.addCenter(req.body);
    return res.json(result);
  }catch(err){
    console.error(err);
    const status = err.status || 500;
    return res.status(status).json({ error: err.message || 'Failed to add center' });
  }
}

async function listAll(req, res){
  try{
    const centers = await servicecenterService.getAllCenters();
    return res.json(centers);
  }catch(err){
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch centers' });
  }
}

async function assignTechnician(req, res){
  try{
    const { productId, technicianId } = req.body;
    const result = await servicecenterService.assignTechnician(productId, technicianId);
    return res.json(result);
  }catch(err){
    console.error(err);
    return res.status(500).json({ message: 'Error assigning technician' });
  }
}

export default {
  addCenter,
  listAll,
  assignTechnician
};
