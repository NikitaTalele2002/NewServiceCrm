import { sequelize } from '../db.js';
import { TechnicianInventory, SpareRequest, SpareRequestItem, ComplaintRegistration, Technician } from '../models/index.js';

async function insertSampleRentalReturnData() {
  try {
    // Find an existing technician
    const technician = await Technician.findOne();
    if (!technician) {
      console.log('No technician found. Please ensure technicians exist.');
      return;
    }

    // Find an allocated request
    const allocatedRequest = await SpareRequest.findOne({
      where: { Status: 'Allocated' },
      include: [{ model: SpareRequestItem, as: 'Items' }]
    });

    if (!allocatedRequest) {
      console.log('No allocated request found. Allocating a sample request...');

      // Find a pending request and allocate it
      const pendingRequest = await SpareRequest.findOne({
        where: { Status: 'Pending' },
        include: [{ model: SpareRequestItem, as: 'Items' }]
      });

      if (!pendingRequest) {
        console.log('No pending requests found. Please run insert_sample_spare_requests.js first.');
        return;
      }

      // Allocate the request by creating technician inventory
      for (const item of pendingRequest.Items) {
        await TechnicianInventory.create({
          TechnicianId: technician.Id,
          Sku: item.Sku,
          SpareName: item.SpareName,
          GoodQty: item.RequestedQty,
          DefectiveQty: 0
        });
      }

      // Update request status
      await pendingRequest.update({ Status: 'Allocated' });

      console.log('Sample request allocated.');
    }

    // Insert sample technician inventory for return testing
    const sampleInventory = [
      { TechnicianId: technician.Id, Sku: '00000F4ENS', SpareName: 'SMASHER-EX-COMMON LV-MOTOR-4', GoodQty: 3, DefectiveQty: 1 },
      { TechnicianId: technician.Id, Sku: '00000F8ENS', SpareName: 'SMASHER-EX-COMMON LV-MOTOR-8', GoodQty: 2, DefectiveQty: 0 },
      { TechnicianId: technician.Id, Sku: '000000FCSMNBRNE045', SpareName: '1200 Krayer CF MT BAKER BR Mono carton', GoodQty: 1, DefectiveQty: 2 },
    ];

    for (const item of sampleInventory) {
      const existing = await TechnicianInventory.findOne({
        where: { TechnicianId: item.TechnicianId, Sku: item.Sku }
      });
      if (existing) {
        await existing.update({
          GoodQty: item.GoodQty,
          DefectiveQty: item.DefectiveQty
        });
      } else {
        await TechnicianInventory.create(item);
      }
    }

    console.log('Sample rental return data inserted successfully');
  } catch (error) {
    console.error('Error inserting sample rental return data:', error);
  } finally {
    await sequelize.close();
  }
}

insertSampleRentalReturnData();
