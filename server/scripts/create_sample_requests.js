import { sequelize, SpareRequest, SpareRequestItem, Technician } from '../models/index.js';

async function createSampleRequests() {
  try {
    // Get service center ID (assuming first one)
    const serviceCenter = await sequelize.query('SELECT TOP 1 Id FROM ServiceCenters', { type: sequelize.QueryTypes.SELECT });
    const serviceCenterId = serviceCenter[0].Id;

    // Get a technician
    const technician = await Technician.findOne();
    if (!technician) {
      console.log('No technicians found');
      return;
    }

    console.log('Service Center ID:', serviceCenterId);
    console.log('Technician ID:', technician.Id);

    // Create request 1 - for available spare (000000FCSMNBRNE045)
    const request1 = await SpareRequest.create({
      RequestNumber: 'REQ-TEST-AVAILABLE-' + Date.now(),
      TechnicianId: technician.Id,
      ServiceCenterId: serviceCenterId,
      Status: 'Pending',
      CreatedAt: new Date()
    });

    await SpareRequestItem.create({
      RequestId: request1.Id,
      Sku: '000000FCCSNSTGS101',
      SpareName: '1200 Krayer CF MT BAKER BR Mono carton',
      RequestedQty: 2,
      ApprovedQty: 0
    });

    console.log('Created request 1 (available spare):', request1.Id);

    // Create request 2 - for unavailable spare
    const request2 = await SpareRequest.create({
      RequestNumber: 'REQ-TEST-UNAVAILABLE-' + Date.now(),
      TechnicianId: technician.Id,
      ServiceCenterId: serviceCenterId,
      Status: 'Pending',
      CreatedAt: new Date()
    });

    await SpareRequestItem.create({
      RequestId: request2.Id,
      Sku: 'NONEXISTENT-SKU-123',
      SpareName: 'Non-existent Spare Part',
      RequestedQty: 1,
      ApprovedQty: 0
    });

    console.log('Created request 2 (unavailable spare):', request2.Id);

    console.log('Sample requests created successfully!');

  } catch (error) {
    console.error('Error creating sample requests:', error);
  } finally {
    await sequelize.close();
  }     
}

createSampleRequests();