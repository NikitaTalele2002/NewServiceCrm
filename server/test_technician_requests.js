import { sequelize, TechnicianStatusRequest, User, ServiceCentre, Technician } from './models/index.js';
import 'dotenv/config.js';

async function test() {
  try {
    // Get all pending requests
    const requests = await TechnicianStatusRequest.findAll({
      where: { Status: 'pending' },
      raw: true
    });
    
    console.log('\n=== ALL PENDING REQUESTS ===');
    console.log('Total:', requests.length);
    requests.forEach(r => {
      console.log(`ID: ${r.Id}, RequestedBy: ${r.RequestedBy}, TechnicianId: ${r.TechnicianId}, Type: ${r.RequestType}`);
    });

    // Get branch 4's service centers
    console.log('\n=== BRANCH 4 SERVICE CENTERS ===');
    const branchSCs = await ServiceCentre.findAll({
      where: { BranchId: 4 },
      raw: true
    });
    console.log('SCs:', branchSCs.map(sc => ({ id: sc.Id, name: sc.CenterName })));
    const scIds = branchSCs.map(sc => sc.Id);

    // Get users in those SCs
    console.log('\n=== USERS IN BRANCH 4 SCs ===');
    const usersInSCs = await User.findAll({
      where: { CenterId: { [sequelize.Sequelize.Op.in]: scIds } },
      raw: true
    });
    console.log('Users:', usersInSCs.map(u => ({ id: u.UserID, name: u.Username, centerId: u.CenterId })));
    const userIds = usersInSCs.map(u => u.UserID);

    // Get technicians in those SCs
    console.log('\n=== TECHNICIANS IN BRANCH 4 SCs ===');
    const techsInSCs = await Technician.findAll({
      where: { ServiceCentreId: { [sequelize.Sequelize.Op.in]: scIds } },
      raw: true
    });
    console.log('Technicians:', techsInSCs.map(t => ({ id: t.Id, name: t.Name, scId: t.ServiceCentreId })));
    const techIds = techsInSCs.map(t => t.Id);

    // Check what requests should be visible
    console.log('\n=== CHECKING WHICH REQUESTS SHOULD BE VISIBLE ===');
    requests.forEach(r => {
      const isAddFromOurUser = r.TechnicianId === null && userIds.includes(r.RequestedBy);
      const isStatusFromOurTech = r.TechnicianId !== null && techIds.includes(r.TechnicianId);
      
      if (isAddFromOurUser || isStatusFromOurTech) {
        console.log(`✓ Request ${r.Id} SHOULD be visible`);
        console.log(`  - RequestedBy: ${r.RequestedBy} (in userIds: ${userIds.includes(r.RequestedBy)})`);
        console.log(`  - TechnicianId: ${r.TechnicianId} (in techIds: ${techIds.includes(r.TechnicianId)})`);
      }
    });

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

test();
