import { Technician, ServiceCentre } from '../models/index.js';

async function getAllTechnicians(){
  const technicians = await Technician.findAll({
    include: { model: ServiceCentre, attributes: ['CenterName'] }
  });
  return technicians;
}

async function getTechniciansByCenter(centerId){
  if(!centerId || centerId === 'null' || centerId === 'undefined') throw Object.assign(new Error('centerId query parameter required'), { status: 400 });
  const centreIdNum = Number(centerId);
  if(isNaN(centreIdNum)) throw Object.assign(new Error('centerId must be a valid number'), { status: 400 });
  
  const technicians = await Technician.findAll({
    where: { ServiceCenterId: centreIdNum, status: 'active' },
    include: { model: ServiceCentre, attributes: ['CenterName'] }
  });
  return technicians;
}

async function getTechnicianById(id){
  const technician = await Technician.findByPk(id, {
    include: { model: ServiceCentre, attributes: ['CenterName'] }
  });
  if(!technician) throw Object.assign(new Error('Technician not found'), { status: 404 });
  return technician;
}

export default {
  getAllTechnicians,
  getTechniciansByCenter,
  getTechnicianById
};
