import { sequelize, TechnicianStatusRequest, Technician, ServiceCentre, User } from './models/index.js';
import { Sequelize } from 'sequelize';

async function testQuery() {
  try {
    const scIds = [2]; // from the error

    const requests = await TechnicianStatusRequest.findAll({
      where: {
        Status: 'pending',
        [Sequelize.Op.or]: [
          { '$Technician.ServiceCenterId$': { [Sequelize.Op.in]: scIds } },
          { TechnicianId: null, '$Requester.CenterId$': { [Sequelize.Op.in]: scIds } }
        ]
      },
      include: [
        {
          model: Technician,
          as: 'Technician',
          include: [{ model: ServiceCentre, as: 'ServiceCentre' }]
        },
        {
          model: User,
          as: 'Requester',
          include: [{ model: ServiceCentre, as: 'ServiceCentre' }]
        }
      ]
    });

    console.log('Requests found:', requests.length);
    console.log(JSON.stringify(requests, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sequelize.close();
  }
}

testQuery();