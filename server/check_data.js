import { sequelize, User, TechnicianStatusRequest } from './models/index.js';

async function checkData() {
  try {
    const users = await User.findAll();
    console.log('Users:', users.map(u => ({ id: u.UserID, username: u.Username, centerId: u.CenterId })));

    const requests = await TechnicianStatusRequest.findAll();
    console.log('Requests:', requests.map(r => ({ id: r.Id, technicianId: r.TechnicianId, requestedBy: r.RequestedBy, status: r.Status })));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

checkData();