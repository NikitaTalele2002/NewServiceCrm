import { Technicians, ServiceCenter } from '../models/index.js';

async function getAllTechnicians() {
  const technicians = await Technicians.findAll({
    include: { model: ServiceCenter, attributes: ['CenterName'] }
  });
  return technicians;
}

async function getTechniciansByCenter(centerId) {
  if (!centerId || centerId === 'null' || centerId === 'undefined') throw Object.assign(new Error('centerId query parameter required'), { status: 400 });
  const centreIdNum = Number(centerId);
  if (isNaN(centreIdNum)) throw Object.assign(new Error('centerId must be a valid number'), { status: 400 });

  const technicians = await Technicians.findAll({
    where: { service_center_id: centreIdNum, status: 'active' },
    include: { model: ServiceCenter, attributes: ['CenterName'] }
  });
  return technicians;
}

async function getTechnicianById(id) {
  const technician = await Technicians.findByPk(id, {
    include: { model: ServiceCenter, attributes: ['CenterName'] }
  });
  if (!technician) throw Object.assign(new Error('Technician not found'), { status: 404 });
  return technician;
}

export default {
  getAllTechnicians,
  getTechniciansByCenter,
  getTechnicianById
};
